const { Op, fn, col } = require('sequelize');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { sequelize } = require('../config/database');
const { getPagination, getSort, buildPaginationMeta, withSortable } = require('../utils/pagination');
const { searchWhere, combineWhere } = require('../utils/queryHelpers');
const { numbered } = require('../utils/codeGenerator');
const { toDateOnly, combineDateTime, timeToMinutes, isPast } = require('../utils/dates');
const { roleNameOf } = require('../utils/accessControl');
const {
  APPOINTMENT_STATUS,
  SLOT_STATUS,
  QUEUE_STATUS,
  ACTIVE_APPOINTMENT_STATUSES,
} = require('../config/constants');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const notificationService = require('./notification.service');
const { Appointment, AppointmentSlot, Patient, Doctor, Department, User, QueueEntry } = require('../models');

/**
 * Appointment booking workflow:
 *
 *   Department -> Doctor -> Date -> Slot -> Appointment
 *
 * Double-booking is prevented at three levels:
 *   1. a row lock is taken on the slot before it is marked BOOKED
 *   2. `appointment_slots` has a unique (doctor, date, time) index
 *   3. partial unique indexes on `appointments` reject a second live booking
 *      for the same (doctor, date, time) or (patient, doctor, date, time)
 */

const SORTABLE = withSortable(
  ['createdAt', 'updatedAt', 'appointmentDate', 'startTime', 'status', 'appointmentNumber'],
  ['appointmentDate'],
);

const LIVE_STATUSES = ACTIVE_APPOINTMENT_STATUSES;

const APPT_INCLUDE = [
  { model: Patient, as: 'patient', attributes: ['id', 'hospitalNumber', 'firstName', 'lastName', 'phone', 'bloodGroup'] },
  { model: Doctor, as: 'doctor', attributes: ['id', 'specialization', 'licenseNumber'], include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }] },
  { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
  { model: AppointmentSlot, as: 'slot', attributes: ['id', 'startTime', 'endTime', 'status'] },
];

function present(appointment) {
  if (!appointment) return null;
  const plain = appointment.get({ plain: true });
  return {
    ...plain,
    patientName: plain.patient ? `${plain.patient.firstName} ${plain.patient.lastName || ''}`.trim() : null,
    doctorName: plain.doctor && plain.doctor.user ? `${plain.doctor.user.firstName} ${plain.doctor.user.lastName || ''}`.trim() : null,
  };
}

/** A patient may only see their own appointments; staff see the clinic list. */
function scopeFor(user) {
  if (!user) return undefined;
  if (roleNameOf(user) === 'PATIENT') return { patientId: user.patientId ?? -1 };
  return undefined;
}

async function list({ user, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const order = getSort(query, SORTABLE, [['appointmentDate', 'DESC'], ['startTime', 'ASC']]);

  const statuses = query.status ? String(query.status).split(',').map((s) => s.trim()) : null;

  const where = combineWhere(
    scopeFor(user),
    statuses ? { status: { [Op.in]: statuses } } : undefined,
    query.patientId ? { patientId: Number(query.patientId) } : undefined,
    query.doctorId ? { doctorId: Number(query.doctorId) } : undefined,
    query.departmentId ? { departmentId: Number(query.departmentId) } : undefined,
    query.type ? { type: query.type } : undefined,
    query.date ? { appointmentDate: query.date } : undefined,
    query.from ? { appointmentDate: { [Op.gte]: query.from } } : undefined,
    query.to ? { appointmentDate: { [Op.lte]: query.to } } : undefined,
    query.upcoming ? { appointmentDate: { [Op.gte]: toDateOnly() }, status: { [Op.in]: LIVE_STATUSES } } : undefined,
    query.mine ? (roleNameOf(user) === 'DOCTOR' ? { '$doctor.user_id$': user.id } : undefined) : undefined,
    searchWhere(query.search, [['appointmentNumber', 'string'], ['reason', 'string']]),
  );

  const { rows, count } = await Appointment.findAndCountAll({
    where,
    include: APPT_INCLUDE,
    order,
    limit,
    offset,
    distinct: true,
  });

  return { appointments: rows.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/* ------------------------------------------------------------------ *
 * Availability
 * ------------------------------------------------------------------ */

/** Generates the default slot grid for a doctor on a date from their profile. */
function defaultSlotsFor(doctor, date) {
  const availability = doctor.availability && typeof doctor.availability === 'object' ? doctor.availability : {};
  const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(`${date}T00:00:00Z`).getUTCDay()];
  const windows = availability[dayKey] || availability.daily || null;

  const start = (windows?.start || '08:00');
  const end = (windows?.end || '16:00');
  const duration = doctor.slotDurationMinutes || 30;

  const slots = [];
  for (let minutes = timeToMinutes(start); minutes + duration <= timeToMinutes(end); minutes += duration) {
    const toHhmm = (value) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    slots.push({ startTime: toHhmm(minutes), endTime: toHhmm(minutes + duration) });
  }
  return slots;
}

/**
 * Doctors available in a department (optionally filtered by date).
 */
async function availableDoctors({ departmentId, date, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  const where = combineWhere(
    { isAcceptingAppointments: true },
    departmentId ? { departmentId: Number(departmentId) } : undefined,
    query.specialization ? { specialization: { [Op.iLike]: `%${query.specialization}%` } } : undefined,
  );

  const { rows, count } = await Doctor.findAndCountAll({
    where,
    include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    order: [
      [{ model: User, as: 'user' }, 'firstName', 'ASC'],
      ['id', 'ASC'],
    ],
    limit,
    offset,
    distinct: true,
  });

  const doctors = [];
  for (const doctor of rows) {
    // eslint-disable-next-line no-await-in-loop
    const slotCount = date
      // eslint-disable-next-line no-await-in-loop
      ? await AppointmentSlot.count({ where: { doctorId: doctor.id, slotDate: date, status: 'OPEN', isBlocked: false } })
      : null;
    doctors.push({
      id: doctor.id,
      specialization: doctor.specialization,
      subSpecialization: doctor.subSpecialization,
      consultationFee: Number(doctor.consultationFee || 0),
      slotDurationMinutes: doctor.slotDurationMinutes,
      isOnDuty: doctor.isOnDuty,
      user: doctor.user ? doctor.user.get({ plain: true }) : null,
      name: doctor.user ? `${doctor.user.firstName} ${doctor.user.lastName || ''}`.trim() : null,
      availableSlots: slotCount,
    });
  }

  return { doctors, pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/** The bookable slot grid for a doctor on a date (creating nothing). */
async function availability({ doctorId, date }) {
  const doctor = await Doctor.findByPk(doctorId, { include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }] });
  if (!doctor) throw AppError.notFound('Doctor not found');

  const day = date || toDateOnly();
  if (isPast(combineDateTime(day, '23:59'))) {
    throw AppError.badRequest('Cannot view availability for a past date');
  }

  const existing = await AppointmentSlot.findAll({
    where: { doctorId, slotDate: day },
    order: [['startTime', 'ASC']],
  });

  // Materialise the default grid if the doctor has no explicit slots yet.
  if (!existing.length) {
    const defaults = defaultSlotsFor(doctor, day);
    await AppointmentSlot.bulkCreate(
      defaults.map((slot) => ({
        doctorId: doctor.id,
        departmentId: doctor.departmentId,
        slotDate: day,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: SLOT_STATUS.OPEN,
        isBlocked: false,
      })),
    );
  }

  const slots = await AppointmentSlot.findAll({
    where: { doctorId, slotDate: day },
    order: [['startTime', 'ASC']],
  });

  const booked = await Appointment.findAll({
    where: { doctorId, appointmentDate: day, status: { [Op.in]: LIVE_STATUSES } },
    attributes: ['id', 'slotId', 'startTime', 'status', 'patientId'],
  });

  const bookedBySlot = new Map(booked.filter((a) => a.slotId).map((a) => [a.slotId, a]));

  return {
    doctor: {
      id: doctor.id,
      name: doctor.user ? `${doctor.user.firstName} ${doctor.user.lastName}`.trim() : null,
      specialization: doctor.specialization,
      slotDurationMinutes: doctor.slotDurationMinutes,
      consultationFee: Number(doctor.consultationFee || 0),
    },
    date: day,
    slots: slots.map((slot) => {
      const appointment = bookedBySlot.get(slot.id);
      return {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
        isAvailable: slot.status === SLOT_STATUS.OPEN && !slot.isBlocked && !appointment,
        appointmentId: appointment ? appointment.id : null,
      };
    }),
  };
}

/** Explicitly blocks a slot (leave, procedure, etc.). */
async function blockSlot({ doctorId, slotId, isBlocked, notes, actor }) {
  const slot = await AppointmentSlot.findByPk(slotId);
  if (!slot) throw AppError.notFound('Slot not found');
  if (Number(slot.doctorId) !== Number(doctorId)) throw AppError.badRequest('Slot does not belong to this doctor');

  const booked = await Appointment.count({
    where: { slotId: slot.id, status: { [Op.in]: LIVE_STATUSES } },
  });
  if (booked && isBlocked) throw AppError.conflict('Cannot block a slot that already has a live appointment');

  await slot.update({
    isBlocked: Boolean(isBlocked),
    status: isBlocked ? SLOT_STATUS.BLOCKED : SLOT_STATUS.OPEN,
    notes: notes ?? slot.notes,
    updatedBy: actor?.id ?? null,
  });

  return slot.get({ plain: true });
}

/* ------------------------------------------------------------------ *
 * Booking
 * ------------------------------------------------------------------ */

async function nextAppointmentNumber({ transaction }) {
  const last = await Appointment.findOne({
    order: [['id', 'DESC']],
    attributes: ['appointmentNumber'],
    transaction,
  });
  let sequence = 1;
  if (last && typeof last.appointmentNumber === 'string') {
    const parsed = Number.parseInt(last.appointmentNumber.split('-').pop(), 10);
    if (Number.isFinite(parsed)) sequence = parsed + 1;
  }
  return numbered('APT', sequence);
}

/**
 * Books an appointment. Runs in a transaction and locks the slot row so two
 * concurrent requests cannot both take the last slot.
 */
async function book({ user, data }) {
  const patientId = resolvePatientId(user, data.patientId);

  const patient = await Patient.findByPk(patientId);
  if (!patient) throw AppError.notFound('Patient not found');

  const doctor = await Doctor.findByPk(data.doctorId);
  if (!doctor) throw AppError.notFound('Doctor not found');

  const departmentId = data.departmentId ?? doctor.departmentId;
  const department = await Department.findByPk(departmentId);
  if (!department) throw AppError.notFound('Department not found');
  if (doctor.departmentId && Number(doctor.departmentId) !== Number(departmentId)) {
    throw AppError.badRequest('Doctor does not work in the selected department');
  }
  if (!doctor.isAcceptingAppointments) {
    throw AppError.badRequest('This doctor is not currently accepting appointments');
  }

  const date = data.appointmentDate;
  if (isPast(combineDateTime(date, '00:00')) && !data.allowPastDate) {
    throw AppError.badRequest('Appointments cannot be booked in the past');
  }

  return sequelize.transaction(async (transaction) => {
    let slot = null;

    if (data.slotId) {
      // Row lock: serialises concurrent bookings of the same slot.
      // eslint-disable-next-line no-await-in-loop
      slot = await AppointmentSlot.findByPk(data.slotId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!slot) throw AppError.notFound('Slot not found');
      if (Number(slot.doctorId) !== Number(doctor.id)) throw AppError.badRequest('Slot belongs to a different doctor');
      if (String(slot.slotDate) !== String(date)) throw AppError.badRequest('Slot is not on the requested date');
      if (slot.isBlocked) throw AppError.conflict('That slot has been blocked');
    } else {
      // eslint-disable-next-line no-await-in-loop
      slot = await AppointmentSlot.findOne({
        where: { doctorId: doctor.id, slotDate: date, startTime: data.startTime, status: SLOT_STATUS.OPEN, isBlocked: false },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!slot) throw AppError.conflict('That time slot is no longer available');
    }

    // Belt and braces: explicit live-status check inside the transaction.
    // eslint-disable-next-line no-await-in-loop
    const clash = await Appointment.findOne({
      where: {
        doctorId: doctor.id,
        appointmentDate: date,
        startTime: slot.startTime,
        status: { [Op.in]: LIVE_STATUSES },
      },
      transaction,
    });
    if (clash) throw AppError.conflict('That slot has already been booked');

    const fee = data.fee ?? Number(doctor.consultationFee || 0);

    const appointment = await Appointment.create(
      {
        appointmentNumber: await nextAppointmentNumber({ transaction }),
        patientId: patient.id,
        doctorId: doctor.id,
        departmentId: department.id,
        slotId: slot.id,
        appointmentDate: date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: data.autoConfirm === false ? APPOINTMENT_STATUS.REQUESTED : APPOINTMENT_STATUS.CONFIRMED,
        type: data.type || 'NEW',
        reason: data.reason ?? null,
        notes: data.notes ?? null,
        fee,
        rescheduledFromId: data.rescheduledFromId ?? null,
        createdBy: user?.id ?? null,
      },
      { transaction },
    );

    await slot.update({ status: SLOT_STATUS.BOOKED }, { transaction });

    const full = await Appointment.findByPk(appointment.id, { include: APPT_INCLUDE, transaction });

    await notificationService.notify({
      userIds: await recipientUserIds({ patientId: patient.id, doctorUserId: doctor.userId }),
      patientId: patient.id,
      type: 'APPOINTMENT',
      title: 'Appointment booked',
      message: `Appointment ${appointment.appointmentNumber} on ${date} at ${slot.startTime} with ${
        doctor.user ? `Dr ${doctor.user.firstName} ${doctor.user.lastName}` : 'your doctor'
      }.`,
      data: { appointmentId: appointment.id, appointmentNumber: appointment.appointmentNumber },
      actionUrl: `/appointments/${appointment.id}`,
    });

    realtime.emitToDepartment(department.id, EVENTS.APPOINTMENT_CREATED, present(full));
    realtime.emitToPatient(patient.id, EVENTS.APPOINTMENT_CREATED, present(full));

    return present(full);
  });
}

function resolvePatientId(user, requested) {
  if (roleNameOf(user) === 'PATIENT') {
    if (!user.patientId) throw AppError.forbidden('Your account is not linked to a patient record');
    if (requested && Number(requested) !== Number(user.patientId)) {
      throw AppError.forbidden('You may only book appointments for yourself');
    }
    return user.patientId;
  }
  if (!requested) throw AppError.badRequest('patientId is required');
  return Number(requested);
}

async function recipientUserIds({ patientId, doctorUserId }) {
  const ids = [];
  if (doctorUserId) ids.push(doctorUserId);
  const patientUserId = await notificationService.userIdForPatient(patientId);
  if (patientUserId) ids.push(patientUserId);
  return ids;
}

async function getById({ user, id }) {
  const appointment = await Appointment.findByPk(id, { include: APPT_INCLUDE });
  if (!appointment) throw AppError.notFound('Appointment not found');
  if (roleNameOf(user) === 'PATIENT' && Number(appointment.patientId) !== Number(user.patientId)) {
    throw AppError.forbidden('You are not authorised to view this appointment');
  }
  return present(appointment);
}

/* ------------------------------------------------------------------ *
 * State transitions
 * ------------------------------------------------------------------ */

const TRANSITIONS = {
  [APPOINTMENT_STATUS.REQUESTED]: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CANCELLED],
  [APPOINTMENT_STATUS.CONFIRMED]: [
    APPOINTMENT_STATUS.CHECKED_IN,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
  ],
  [APPOINTMENT_STATUS.CHECKED_IN]: [
    APPOINTMENT_STATUS.IN_QUEUE,
    APPOINTMENT_STATUS.IN_CONSULTATION,
    APPOINTMENT_STATUS.CANCELLED,
  ],
  [APPOINTMENT_STATUS.IN_QUEUE]: [APPOINTMENT_STATUS.IN_CONSULTATION, APPOINTMENT_STATUS.CANCELLED],
  [APPOINTMENT_STATUS.IN_CONSULTATION]: [APPOINTMENT_STATUS.COMPLETED],
  [APPOINTMENT_STATUS.COMPLETED]: [],
  [APPOINTMENT_STATUS.CANCELLED]: [],
  [APPOINTMENT_STATUS.NO_SHOW]: [],
};

async function transition({ user, id, status, reason }) {
  const appointment = await Appointment.findByPk(id);
  if (!appointment) throw AppError.notFound('Appointment not found');

  const allowed = TRANSITIONS[appointment.status] || [];
  if (!allowed.includes(status)) {
    throw AppError.conflict(`Cannot change an appointment from ${appointment.status} to ${status}`);
  }

  const patch = { status, updatedBy: user?.id ?? null };
  const now = new Date();

  if (status === APPOINTMENT_STATUS.CHECKED_IN) patch.checkedInAt = now;
  if (status === APPOINTMENT_STATUS.IN_CONSULTATION) patch.startedAt = now;
  if (status === APPOINTMENT_STATUS.COMPLETED) patch.completedAt = now;
  if (status === APPOINTMENT_STATUS.CANCELLED) {
    patch.cancelledAt = now;
    patch.cancelReason = reason || 'Cancelled by ' + (roleNameOf(user) || 'user');
  }

  await sequelize.transaction(async (transaction) => {
    await appointment.update(patch, { transaction });

    if (status === APPOINTMENT_STATUS.IN_QUEUE) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await QueueEntry.findOne({ where: { appointmentId: appointment.id }, transaction });
      if (!existing) {
        // eslint-disable-next-line no-await-in-loop
        const ticket = await require('./queue.service').nextTicket({
          departmentId: appointment.departmentId,
          date: appointment.appointmentDate,
          transaction,
        });
        // eslint-disable-next-line no-await-in-loop
        await QueueEntry.create(
          {
            ticketNumber: ticket,
            queueDate: appointment.appointmentDate,
            departmentId: appointment.departmentId,
            doctorId: appointment.doctorId,
            appointmentId: appointment.id,
            patientId: appointment.patientId,
            status: QUEUE_STATUS.WAITING,
            position: ticket,
            priority: 'ROUTINE',
            createdBy: user?.id ?? null,
          },
          { transaction },
        );
      }
    }

    // Cancelling or completing frees the slot again.
    if ([APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.NO_SHOW].includes(status)) {
      if (appointment.slotId) {
        // eslint-disable-next-line no-await-in-loop
        const slot = await AppointmentSlot.findByPk(appointment.slotId, { transaction });
        if (slot && slot.status === SLOT_STATUS.BOOKED) {
          await slot.update({ status: SLOT_STATUS.OPEN }, { transaction });
        }
      }
    }
  });

  const updated = await Appointment.findByPk(id, { include: APPT_INCLUDE });

  const eventByStatus = {
    CONFIRMED: EVENTS.APPOINTMENT_CONFIRMED,
    CHECKED_IN: EVENTS.APPOINTMENT_CHECKED_IN,
    IN_QUEUE: EVENTS.QUEUE_JOINED,
    COMPLETED: EVENTS.APPOINTMENT_COMPLETED,
    CANCELLED: EVENTS.APPOINTMENT_CANCELLED,
    NO_SHOW: EVENTS.APPOINTMENT_NO_SHOW,
  };

  const event = eventByStatus[status];
  if (event) {
    realtime.emitToDepartment(appointment.departmentId, event, present(updated));
    realtime.emitToPatient(appointment.patientId, event, present(updated));
  }

  if ([APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.CANCELLED].includes(status)) {
    await notificationService.notify({
      userIds: await recipientUserIds({ patientId: appointment.patientId, doctorUserId: await doctorUserIdOf(appointment) }),
      patientId: appointment.patientId,
      type: 'APPOINTMENT',
      title: `Appointment ${status.toLowerCase().replace('_', ' ')}`,
      message: `Appointment ${appointment.appointmentNumber} is now ${status}.${reason ? ` Reason: ${reason}` : ''}`,
      data: { appointmentId: appointment.id, status },
      priority: status === APPOINTMENT_STATUS.CANCELLED ? 'HIGH' : 'NORMAL',
    });
  }

  return present(updated);
}

async function doctorUserIdOf(appointment) {
  const doctor = await Doctor.findByPk(appointment.doctorId, { attributes: ['userId'] });
  return doctor ? doctor.userId : null;
}

const confirm = ({ user, id }) => transition({ user, id, status: APPOINTMENT_STATUS.CONFIRMED });
const checkIn = ({ user, id }) => transition({ user, id, status: APPOINTMENT_STATUS.CHECKED_IN });
const start = ({ user, id }) => transition({ user, id, status: APPOINTMENT_STATUS.IN_CONSULTATION });
const complete = ({ user, id }) => transition({ user, id, status: APPOINTMENT_STATUS.COMPLETED });
const cancel = ({ user, id, reason }) => transition({ user, id, status: APPOINTMENT_STATUS.CANCELLED, reason });
const markNoShow = ({ user, id, reason }) => transition({ user, id, status: APPOINTMENT_STATUS.NO_SHOW, reason });

/** Moves an appointment to a new slot, freeing the old one. */
async function reschedule({ user, id, data }) {
  const appointment = await Appointment.findByPk(id);
  if (!appointment) throw AppError.notFound('Appointment not found');

  if (!LIVE_STATUSES.includes(appointment.status)) {
    throw AppError.conflict(`A ${appointment.status.toLowerCase()} appointment cannot be rescheduled`);
  }

  const replacement = await book({
    user,
    data: {
      patientId: appointment.patientId,
      doctorId: data.doctorId ?? appointment.doctorId,
      departmentId: data.departmentId ?? appointment.departmentId,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      slotId: data.slotId,
      type: appointment.type,
      reason: appointment.reason,
      fee: appointment.fee,
      rescheduledFromId: appointment.id,
    },
  });

  await sequelize.transaction(async (transaction) => {
    await appointment.update(
      { status: APPOINTMENT_STATUS.CANCELLED, cancelledAt: new Date(), cancelReason: 'Rescheduled', updatedBy: user?.id ?? null },
      { transaction },
    );
    if (appointment.slotId) {
      // eslint-disable-next-line no-await-in-loop
      const oldSlot = await AppointmentSlot.findByPk(appointment.slotId, { transaction });
      if (oldSlot && oldSlot.status === SLOT_STATUS.BOOKED) {
        await oldSlot.update({ status: SLOT_STATUS.OPEN }, { transaction });
      }
    }
  });

  realtime.emitToDepartment(appointment.departmentId, EVENTS.APPOINTMENT_RESCHEDULED, {
    previousId: appointment.id,
    appointment: replacement,
  });

  return { previous: present(appointment), appointment: replacement };
}

/** Bulk mark of the day's no-shows. */
async function markNoShows({ user, date, departmentId }) {
  const day = date || toDateOnly();
  const stale = await Appointment.findAll({
    where: combineWhere(
      { appointmentDate: day, status: { [Op.in]: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.REQUESTED] } },
      departmentId ? { departmentId: Number(departmentId) } : undefined,
    ),
  });

  const results = [];
  for (const appointment of stale) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await markNoShow({ user, id: appointment.id, reason: 'Marked as no show by staff' }));
  }
  return results;
}

/** Consultation history of a patient, newest first. */
async function patientHistory({ user, patientId, query = {} }) {
  const { page, limit, offset } = getPagination(query);
  if (roleNameOf(user) === 'PATIENT' && Number(user.patientId) !== Number(patientId)) {
    throw AppError.forbidden('You are not authorised to view this history');
  }

  const { rows, count } = await Appointment.findAndCountAll({
    where: { patientId },
    include: APPT_INCLUDE,
    order: [['appointmentDate', 'DESC']],
    limit,
    offset,
  });

  return { appointments: rows.map(present), pagination: buildPaginationMeta({ page, limit, total: count }) };
}

/** Follow-up suggestions: completed appointments that asked for a review. */
async function followUps({ user, query = {} }) {
  const where = combineWhere(
    { type: 'FOLLOW_UP', status: { [Op.in]: LIVE_STATUSES } },
    query.from ? { appointmentDate: { [Op.gte]: query.from } } : undefined,
    query.to ? { appointmentDate: { [Op.lte]: query.to } } : undefined,
  );

  const { rows, count } = await Appointment.findAndCountAll({
    where,
    include: APPT_INCLUDE,
    order: [['appointmentDate', 'ASC']],
    limit: getPagination(query).limit,
    offset: getPagination(query).offset,
  });

  return { appointments: rows.map(present), pagination: buildPaginationMeta({ ...getPagination(query), total: count }) };
}

async function statistics({ query = {} }) {
  const day = query.date || toDateOnly();
  const where = combineWhere({ appointmentDate: day }, query.departmentId ? { departmentId: Number(query.departmentId) } : undefined);

  const [total, byStatus, byDepartment] = await Promise.all([
    Appointment.count({ where }),
    Appointment.findAll({ where, attributes: ['status', [fn('COUNT', col('id')), 'count']], group: ['status'], raw: true }),
    Appointment.findAll({
      where,
      attributes: ['departmentId', [fn('COUNT', col('id')), 'count'], [fn('COALESCE', fn('SUM', col('fee')), 0), 'fees']],
      group: ['departmentId'],
      raw: true,
    }),
  ]);

  return {
    date: day,
    total,
    byStatus: byStatus.reduce((acc, row) => ({ ...acc, [row.status]: Number(row.count) }), {}),
    byDepartment: byDepartment.map((row) => ({
      departmentId: row.departmentId,
      count: Number(row.count),
      fees: Number(row.fees || 0),
    })),
    currency: env.CURRENCY,
  };
}

module.exports = {
  list,
  getById,
  book,
  confirm,
  checkIn,
  start,
  complete,
  cancel,
  markNoShow,
  markNoShows,
  reschedule,
  availability,
  availableDoctors,
  blockSlot,
  patientHistory,
  followUps,
  statistics,
  present,
  nextAppointmentNumber,
  defaultSlotsFor,
  TRANSITIONS,
  LIVE_STATUSES,
  SORTABLE,
  APPT_INCLUDE,
};