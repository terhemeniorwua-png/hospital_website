const { Op, fn, col, literal } = require('sequelize');
const AppError = require('../utils/AppError');
const { sequelize } = require('../config/database');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { queueTicket } = require('../utils/codeGenerator');
const { toDateOnly } = require('../utils/dates');
const { roleNameOf } = require('../utils/accessControl');
const { QUEUE_STATUS, APPOINTMENT_STATUS } = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const notificationService = require('./notification.service');
const { QueueEntry, Patient, Department, Doctor, Appointment, User } = require('../models');
const { sameId } = require('../utils/ids');

/**
 * Waiting room queue.
 *
 * A checked-in patient receives a ticket (`A-024`) per department per day.
 * Every mutation recomputes live positions and broadcasts the new board so the
 * receptionist screens and patient apps stay in sync.
 */

const QUEUE_INCLUDES = [
  { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'phone', 'bloodGroup'] },
  { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
  { model: Doctor, as: 'doctor', attributes: ['id', 'specialization'], include: [{ model: require('../models').User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }] },
];

const PRIORITY_WEIGHT = { EMERGENCY: 0, URGENT: 1, ROUTINE: 2 };

/** Constant SQL fragment: emergencies first, then urgent, then routine. */
const PRIORITY_ORDER_SQL = "CASE priority WHEN 'EMERGENCY' THEN 0 WHEN 'URGENT' THEN 1 ELSE 2 END";

function present(entry) {
  if (!entry) return null;
  const plain = entry.get({ plain: true });
  return {
    ...plain,
    patientName: plain.patient ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim() : null,
    doctorName:
      plain.doctor && plain.doctor.user
        ? `Dr ${plain.doctor.user.firstName} ${plain.doctor.user.lastName || ''}`.trim()
        : null,
  };
}

/** Alphabetical series for a department queue ("A", "B", ...). */
async function seriesFor(department, date) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const last = await QueueEntry.findOne({
    where: { departmentId: department.id, queueDate: date || toDateOnly() },
    order: [['ticketNumber', 'DESC']],
    attributes: ['ticketNumber'],
  });

  const lastLetter = last ? String(last.ticketNumber).charAt(0).toUpperCase() : null;
  const index = letters.indexOf(lastLetter);
  return letters[index === -1 ? 0 : Math.min(index + 1, letters.length - 1)];
}

/** Next ticket number for a department on a date, unique per queue. */
async function nextTicket({ departmentId, date, transaction }) {
  const day = date || toDateOnly();
  const department = await Department.findByPk(departmentId, { transaction });
  if (!department) throw AppError.notFound('Department not found');

  const series = await seriesFor(department, day);
  const count = await QueueEntry.count({ where: { departmentId, queueDate: day }, transaction });

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const candidate = queueTicket(series, count + 1 + attempt);
    // eslint-disable-next-line no-await-in-loop
    const taken = await QueueEntry.findOne({ where: { departmentId, queueDate: day, ticketNumber: candidate }, transaction });
    if (!taken) return candidate;
  }
  throw AppError.internal('Unable to allocate a queue ticket');
}

/**
 * Recomputes `position` and `estimatedWaitMinutes` for everyone still waiting.
 * Average service time is derived from the completions of the same day.
 */
async function refreshPositions({ departmentId, date, transaction }) {
  const day = date || toDateOnly();

  const waiting = await QueueEntry.findAll({
    where: { departmentId, queueDate: day, status: QUEUE_STATUS.WAITING },
    order: [['joinedAt', 'ASC']],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  const served = await QueueEntry.findAll({
    where: { departmentId, queueDate: day, status: { [Op.in]: [QUEUE_STATUS.COMPLETED, QUEUE_STATUS.IN_SERVICE] } },
    attributes: ['servedAt', 'completedAt', 'calledAt'],
    transaction,
  });

  const durations = served
    .filter((entry) => entry.servedAt && entry.completedAt)
    .map((entry) => (new Date(entry.completedAt) - new Date(entry.servedAt)) / 60000)
    .filter((minutes) => minutes > 0 && minutes < 240);

  const averageServiceMinutes = durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : 15;

  for (let index = 0; index < waiting.length; index += 1) {
    const entry = waiting[index];
    const position = index + 1;
    const estimate = Math.max(0, position * averageServiceMinutes - averageServiceMinutes);
    // eslint-disable-next-line no-await-in-loop
    if (entry.position !== position || entry.estimatedWaitMinutes !== estimate) {
      // eslint-disable-next-line no-await-in-loop
      await entry.update({ position, estimatedWaitMinutes: estimate }, { transaction });
    }
  }

  return { averageServiceMinutes, waitingCount: waiting.length };
}

/** Board snapshot used by REST responses and the Socket.IO `queue.updated` payload. */
async function board({ departmentId, date }) {
  const day = date || toDateOnly();

  const [department, entries] = await Promise.all([
    Department.findByPk(departmentId),
    QueueEntry.findAll({
      where: { departmentId, queueDate: day },
      include: QUEUE_INCLUDES,
      order: [
        ['priority', 'ASC'],
        ['joinedAt', 'ASC'],
      ],
    }),
  ]);
  if (!department) throw AppError.notFound('Department not found');

  const sorted = entries.slice().sort((a, b) => {
    const weight = PRIORITY_WEIGHT[a.priority] ?? 2;
    const weightB = PRIORITY_WEIGHT[b.priority] ?? 2;
    if (weight !== weightB) return weight - weightB;
    return new Date(a.joinedAt) - new Date(b.joinedAt);
  });

  return {
    department: { id: department.id, name: department.name, code: department.code },
    date: day,
    entries: sorted.map(present),
    summary: {
      waiting: sorted.filter((e) => e.status === QUEUE_STATUS.WAITING).length,
      called: sorted.filter((e) => e.status === QUEUE_STATUS.CALLED).length,
      inService: sorted.filter((e) => e.status === QUEUE_STATUS.IN_SERVICE).length,
      completed: sorted.filter((e) => e.status === QUEUE_STATUS.COMPLETED).length,
      skipped: sorted.filter((e) => e.status === QUEUE_STATUS.SKIPPED).length,
    },
  };
}

/** Emits the refreshed board to the department and hospital rooms. */
async function broadcast(departmentId, date, event) {
  const snapshot = await board({ departmentId, date });
  realtime.emitToQueue(departmentId, event || EVENTS.QUEUE_UPDATED, snapshot);
  realtime.emitToDepartment(departmentId, event || EVENTS.QUEUE_UPDATED, snapshot);
  realtime.emitToHospital(EVENTS.QUEUE_UPDATED, {
    departmentId,
    date: snapshot.date,
    summary: snapshot.summary,
  });
  return snapshot;
}

async function list({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const day = query.date || toDateOnly();

  const where = combineWhere(
    roleNameOf(user) === 'PATIENT' ? { patientId: user.patientId ?? -1 } : undefined,
    { queueDate: day },
    query.departmentId ? { departmentId: query.departmentId } : undefined,
    query.doctorId ? { doctorId: query.doctorId } : undefined,
    query.status ? { status: query.status } : undefined,
    query.priority ? { priority: query.priority } : undefined,
    searchWhere(query.search, [['ticketNumber', 'string']]),
  );

  const { rows, count } = await QueueEntry.findAndCountAll({
    where,
    include: QUEUE_INCLUDES,
    order: [
      ['status', 'ASC'],
      ['joinedAt', 'ASC'],
    ],
    limit,
    offset,
    distinct: true,
  });

  return { entries: rows.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/**
 * Joins a patient to the queue. An appointment (if supplied) is checked in at
 * the same time; both steps share one transaction.
 */
async function join({ user, data }) {
  const patientId = roleNameOf(user) === 'PATIENT' ? user.patientId : data.patientId;
  if (!patientId) throw AppError.badRequest('patientId is required');

  const patient = await Patient.findByPk(patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  const departmentId = data.departmentId;
  const department = await Department.findByPk(departmentId);
  if (!department) throw AppError.notFound('Department not found');

  let appointment = null;
  if (data.appointmentId) {
    appointment = await Appointment.findByPk(data.appointmentId);
    if (!appointment) throw AppError.notFound('Appointment not found');
    if (!sameId(appointment.patientId, patientId)) {
      throw AppError.forbidden('That appointment belongs to a different patient');
    }
  }

  const date = (appointment ? appointment.appointmentDate : data.date) || toDateOnly();

  const entry = await sequelize.transaction(async (transaction) => {
    if (appointment) {
      const existing = await QueueEntry.findOne({ where: { appointmentId: appointment.id }, transaction });
      if (existing) return existing;

      // eslint-disable-next-line no-await-in-loop
      await appointment.update(
        {
          status: APPOINTMENT_STATUS.IN_QUEUE,
          checkedInAt: appointment.checkedInAt || new Date(),
          updatedBy: user?.id ?? null,
        },
        { transaction },
      );
    } else {
      // eslint-disable-next-line no-await-in-loop
      const duplicate = await QueueEntry.findOne({
        where: {
          patientId,
          departmentId,
          queueDate: date,
          status: { [Op.in]: [QUEUE_STATUS.WAITING, QUEUE_STATUS.CALLED, QUEUE_STATUS.IN_SERVICE] },
        },
        transaction,
      });
      if (duplicate) throw AppError.conflict(`Patient is already in this queue as ${duplicate.ticketNumber}`);
    }

    // eslint-disable-next-line no-await-in-loop
    const ticketNumber = await nextTicket({ departmentId, date, transaction });

    // eslint-disable-next-line no-await-in-loop
    const created = await QueueEntry.create(
      {
        ticketNumber,
        queueDate: date,
        departmentId,
        doctorId: data.doctorId ? data.doctorId : appointment?.doctorId ?? null,
        appointmentId: appointment?.id ?? null,
        patientId,
        isWalkIn: data.isWalkIn ?? !appointment,
        priority: data.priority || 'ROUTINE',
        status: QUEUE_STATUS.WAITING,
        position: 0,
        notes: data.notes ?? null,
        createdBy: user?.id ?? null,
      },
      { transaction },
    );

    // eslint-disable-next-line no-await-in-loop
    await refreshPositions({ departmentId, date, transaction });

    return created;
  });

  const full = await QueueEntry.findByPk(entry.id, { include: QUEUE_INCLUDES });
  const snapshot = await broadcast(entry.departmentId, entry.queueDate, EVENTS.QUEUE_JOINED);

  await notificationService.notify({
    userIds: [patientId ? await notificationService.userIdForPatient(patientId) : null].filter(Boolean),
    patientId,
    type: 'APPOINTMENT',
    title: `Queue ticket ${entry.ticketNumber}`,
    message: `You have joined the ${department.name} queue. Current waiting: ${snapshot.summary.waiting}.`,
    data: { ticketNumber: entry.ticketNumber, departmentId, queueDate: entry.queueDate },
  });

  return { entry: present(full), queue: snapshot };
}

/** Calls the next waiting patient (or a specific ticket) into the room. */
async function callNext({ user, departmentId, date, ticketNumber }) {
  const day = date || toDateOnly();
  const department = departmentId;

  const entry = await sequelize.transaction(async (transaction) => {
    const candidates = await QueueEntry.findAll({
      where: combineWhere(
        { departmentId: department, queueDate: day, status: QUEUE_STATUS.WAITING },
        ticketNumber ? { ticketNumber } : undefined,
      ),
      include: [{ model: Patient, as: 'patient', attributes: ['id', 'firstName', 'lastName'] }],
      order: [[literal(PRIORITY_ORDER_SQL), 'ASC'], ['joinedAt', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!candidates.length) throw AppError.conflict('There is nobody waiting in this queue');

    const next = candidates[0];
    await next.update(
      { status: QUEUE_STATUS.CALLED, calledAt: new Date(), calledBy: user?.id ?? null },
      { transaction },
    );

    await refreshPositions({ departmentId: department, date: day, transaction });

    if (next.appointmentId) {
      const appointment = await Appointment.findByPk(next.appointmentId, { transaction });
      if (appointment && appointment.status === APPOINTMENT_STATUS.CHECKED_IN) {
        await appointment.update(
          { status: APPOINTMENT_STATUS.IN_CONSULTATION, startedAt: new Date() },
          { transaction },
        );
      }
    }

    return next;
  });

  const snapshot = await broadcast(entry.departmentId, entry.queueDate, EVENTS.QUEUE_CALLED);

  await notificationService.notify({
    patientId: entry.patientId,
    type: 'APPOINTMENT',
    title: 'You are being called',
    message: `Queue ticket ${entry.ticketNumber} - please proceed to the consultation room.`,
    data: { ticketNumber: entry.ticketNumber, departmentId: entry.departmentId },
    priority: 'HIGH',
  });

  const full = await QueueEntry.findByPk(entry.id, { include: QUEUE_INCLUDES });
  return { entry: present(full), queue: snapshot };
}

async function updateEntry({ user, id, data }) {
  const entry = await QueueEntry.findByPk(id);
  if (!entry) throw AppError.notFound('Queue entry not found');

  const patch = { updatedBy: user?.id ?? null };
  if (data.doctorId !== undefined) patch.doctorId = data.doctorId;
  if (data.priority !== undefined) patch.priority = data.priority;
  if (data.notes !== undefined) patch.notes = data.notes;

  await entry.update(patch);
  const snapshot = await broadcast(entry.departmentId, entry.queueDate, EVENTS.QUEUE_UPDATED);
  const full = await QueueEntry.findByPk(entry.id, { include: QUEUE_INCLUDES });
  return { entry: present(full), queue: snapshot };
}

/** Starts serving the called patient (nurse/doctor confirms arrival). */
async function startService({ user, id }) {
  const entry = await QueueEntry.findByPk(id);
  if (!entry) throw AppError.notFound('Queue entry not found');
  if (entry.status !== QUEUE_STATUS.CALLED) throw AppError.conflict('Only a called patient can be moved into service');

  await entry.update({ status: QUEUE_STATUS.IN_SERVICE, servedAt: new Date(), updatedBy: user?.id ?? null });

  if (entry.appointmentId) {
    await Appointment.update(
      { status: APPOINTMENT_STATUS.IN_CONSULTATION, startedAt: new Date() },
      { where: { id: entry.appointmentId, status: { [Op.in]: [APPOINTMENT_STATUS.CHECKED_IN, APPOINTMENT_STATUS.IN_QUEUE] } } },
    );
  }

  await refreshPositions({ departmentId: entry.departmentId, date: entry.queueDate });
  const snapshot = await broadcast(entry.departmentId, entry.queueDate, EVENTS.QUEUE_UPDATED);
  return { entry: present(entry), queue: snapshot };
}

async function complete({ user, id, notes }) {
  const entry = await QueueEntry.findByPk(id);
  if (!entry) throw AppError.notFound('Queue entry not found');
  if (![QUEUE_STATUS.CALLED, QUEUE_STATUS.IN_SERVICE].includes(entry.status)) {
    throw AppError.conflict(`A ${entry.status.toLowerCase()} entry cannot be completed`);
  }

  await entry.update({
    status: QUEUE_STATUS.COMPLETED,
    completedAt: new Date(),
    notes: notes ?? entry.notes,
    updatedBy: user?.id ?? null,
  });

  if (entry.appointmentId) {
    await Appointment.update(
      { status: APPOINTMENT_STATUS.COMPLETED, completedAt: new Date() },
      { where: { id: entry.appointmentId, status: APPOINTMENT_STATUS.IN_CONSULTATION } },
    );
  }

  await refreshPositions({ departmentId: entry.departmentId, date: entry.queueDate });
  const snapshot = await broadcast(entry.departmentId, entry.queueDate, EVENTS.QUEUE_COMPLETED);
  return { entry: present(entry), queue: snapshot };
}

async function skip({ user, id, reason }) {
  const entry = await QueueEntry.findByPk(id);
  if (!entry) throw AppError.notFound('Queue entry not found');
  if (![QUEUE_STATUS.WAITING, QUEUE_STATUS.CALLED].includes(entry.status)) {
    throw AppError.conflict(`A ${entry.status.toLowerCase()} entry cannot be skipped`);
  }

  await entry.update({
    status: QUEUE_STATUS.SKIPPED,
    skippedAt: new Date(),
    skipReason: reason || 'Skipped by staff',
    updatedBy: user?.id ?? null,
  });

  await refreshPositions({ departmentId: entry.departmentId, date: entry.queueDate });
  const snapshot = await broadcast(entry.departmentId, entry.queueDate, EVENTS.QUEUE_SKIPPED);

  await notificationService.notify({
    patientId: entry.patientId,
    type: 'APPOINTMENT',
    title: 'Queue update',
    message: `Ticket ${entry.ticketNumber} was skipped: ${reason || 'please see the front desk'}.`,
    data: { ticketNumber: entry.ticketNumber },
    priority: 'HIGH',
  });

  return { entry: present(entry), queue: snapshot };
}

/** Wait estimate for a single ticket. */
async function estimate({ departmentId, date, ticketNumber }) {
  const day = date || toDateOnly();
  const entry = await QueueEntry.findOne({
    where: { departmentId: departmentId, queueDate: day, ticketNumber },
  });
  if (!entry) throw AppError.notFound('Queue entry not found');

  const ahead = await QueueEntry.count({
    where: {
      departmentId: departmentId,
      queueDate: day,
      status: QUEUE_STATUS.WAITING,
      joinedAt: { [Op.lt]: entry.joinedAt },
    },
  });

  const { averageServiceMinutes } = await refreshPositions({ departmentId: departmentId, date: day });

  return {
    ticketNumber: entry.ticketNumber,
    status: entry.status,
    position: entry.position,
    ahead,
    averageServiceMinutes,
    estimatedWaitMinutes: entry.estimatedWaitMinutes ?? ahead * averageServiceMinutes,
  };
}

async function getById({ user, id }) {
  const entry = await QueueEntry.findByPk(id, { include: QUEUE_INCLUDES });
  if (!entry) throw AppError.notFound('Queue entry not found');
  if (roleNameOf(user) === 'PATIENT' && !sameId(entry.patientId, user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this queue entry');
  }
  return present(entry);
}

async function remove({ id }) {
  const entry = await QueueEntry.findByPk(id);
  if (!entry) throw AppError.notFound('Queue entry not found');
  if ([QUEUE_STATUS.CALLED, QUEUE_STATUS.IN_SERVICE].includes(entry.status)) {
    throw AppError.conflict('Complete or skip the patient before removing their ticket');
  }
  await entry.destroy();
  await refreshPositions({ departmentId: entry.departmentId, date: entry.queueDate });
  return { removed: true };
}

async function statistics({ departmentId, date }) {
  const day = date || toDateOnly();
  const where = combineWhere({ queueDate: day }, departmentId ? { departmentId: departmentId } : undefined);

  const rows = await QueueEntry.findAll({
    where,
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'count'],
      [
        fn(
          'AVG',
          literal("EXTRACT(EPOCH FROM (\"completed_at\" - \"called_at\"))"),
        ),
        'avgSeconds',
      ],
    ],
    group: ['status'],
    raw: true,
  });

  const byStatus = rows.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.count) }), {});

  const waitRow = await QueueEntry.findOne({
    where: { ...where, status: { [Op.in]: [QUEUE_STATUS.WAITING, QUEUE_STATUS.CALLED] } },
    attributes: [[fn('AVG', literal('estimated_wait_minutes')), 'avgWait']],
    raw: true,
  });

  return {
    date: day,
    departmentId: departmentId ? departmentId : null,
    byStatus,
    averageWaitMinutes: Math.round(Number(waitRow?.avgWait || 0)),
  };
}

module.exports = {
  nextTicket,
  refreshPositions,
  board,
  broadcast,
  list,
  getById,
  join,
  callNext,
  updateEntry,
  startService,
  complete,
  skip,
  estimate,
  remove,
  statistics,
  present,
  QUEUE_INCLUDES,
};