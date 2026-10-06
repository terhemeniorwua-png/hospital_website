/**
 * Authenticated Socket.IO gateway.
 *
 * Design rules:
 *  - every connection must present a valid access token; unauthenticated
 *    handshakes are rejected before any room is joined
 *  - a socket is only ever auto-joined into rooms the principal owns
 *    (`user:<id>`, `patient:<id>` for patient accounts, `hospital` for admins)
 *  - joining any other room is an explicit, authorised operation handled by
 *    `subscribe:*` events, each of which re-checks database state
 */
const { Server } = require('socket.io');
const { Op } = require('sequelize');

const env = require('../config/env');
const logger = require('../utils/logger');
const { verifyAccessToken } = require('../utils/jwt');
const { roleNameOf } = require('../utils/accessControl');
const { ROLES } = require('../config/constants');
const { EVENTS, ROOMS } = require('./events');

let io = null;

/** Rooms a socket may always occupy once authenticated. */
function baseRoomsFor(user) {
  const rooms = [ROOMS.user(user.id)];
  if (user.patientId) rooms.push(ROOMS.patient(user.patientId));

  const role = roleNameOf(user);
  if ([ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN].includes(role)) rooms.push(ROOMS.hospital());
  return rooms;
}

function tokenFromHandshake(handshake) {
  const auth = handshake.auth || {};
  if (auth.token) return String(auth.token).replace(/^Bearer\s+/i, '');
  const header = handshake.headers?.authorization;
  if (header && /^Bearer\s+/i.test(header)) return header.split(' ')[1];
  if (auth.accessToken) return String(auth.accessToken);
  return null;
}

/** Lazily required to keep the models out of the socket bootstrap cycle. */
function getModels() {
  // eslint-disable-next-line global-require
  return require('../models');
}

async function loadSocketUser(token) {
  const { User, Role } = getModels();
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    throw new Error(error.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token');
  }
  if (payload.type !== 'access') throw new Error('Invalid access token');

  const user = await User.findByPk(payload.sub, {
    include: [{ model: Role, as: 'role' }],
    attributes: ['id', 'firstName', 'lastName', 'email', 'roleId', 'patientId', 'status'],
  });

  if (!user) throw new Error('Account no longer exists');
  if (user.status !== 'ACTIVE') throw new Error('Account is not active');

  user.roleName = user.role ? user.role.name : undefined;
  return user;
}

/* ------------------------------------------------------------------ *
 * Authorised subscriptions
 * ------------------------------------------------------------------ */

/** Staff roles allowed to watch department / queue traffic. */
const STAFF_ROLES = Object.values(ROLES).filter((role) => role !== ROLES.PATIENT);

async function canJoinDepartment(user, departmentId) {
  if ([ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN].includes(roleNameOf(user))) return true;
  if (!STAFF_ROLES.includes(roleNameOf(user))) return false;
  const { Department, DepartmentStaff } = getModels();
  const department = await Department.findByPk(departmentId, { attributes: ['id'] });
  if (!department) return false;
  const assignment = await DepartmentStaff.findOne({ where: { userId: user.id, departmentId } });
  return Boolean(assignment);
}

async function canJoinPatient(user, patientId) {
  if (roleNameOf(user) === ROLES.PATIENT) return Number(user.patientId) === Number(patientId);
  return STAFF_ROLES.includes(roleNameOf(user));
}

async function canJoinAppointment(user, appointmentId) {
  const { Appointment } = getModels();
  const appointment = await Appointment.findByPk(appointmentId, { attributes: ['id', 'patientId'] });
  if (!appointment) return false;
  if (roleNameOf(user) === ROLES.PATIENT) return Number(user.patientId) === Number(appointment.patientId);
  return STAFF_ROLES.includes(roleNameOf(user));
}

async function canJoinConversation(user, conversationId) {
  const { ConversationParticipant } = getModels();
  const participant = await ConversationParticipant.findOne({
    where: { conversationId, userId: user.id },
    attributes: ['id'],
  });
  return Boolean(participant);
}

const SUBSCRIBERS = {
  async department(user, departmentId) {
    if (!(await canJoinDepartment(user, departmentId))) throw new Error('Not authorised to watch this department');
    return [ROOMS.department(departmentId), ROOMS.queue(departmentId)];
  },
  async queue(user, departmentId) {
    if (!(await canJoinDepartment(user, departmentId))) throw new Error('Not authorised to watch this queue');
    return [ROOMS.queue(departmentId)];
  },
  async patient(user, patientId) {
    if (!(await canJoinPatient(user, patientId))) throw new Error('Not authorised to watch this patient');
    return [ROOMS.patient(patientId)];
  },
  async appointment(user, appointmentId) {
    if (!(await canJoinAppointment(user, appointmentId))) throw new Error('Not authorised to watch this appointment');
    return [ROOMS.appointment(appointmentId)];
  },
  async conversation(user, conversationId) {
    if (!(await canJoinConversation(user, conversationId))) throw new Error('Not authorised to join this conversation');
    return [ROOMS.conversation(conversationId)];
  },
};

/* ------------------------------------------------------------------ *
 * Server bootstrap
 * ------------------------------------------------------------------ */

/**
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function attachRealtime(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
    pingTimeout: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token = tokenFromHandshake(socket.handshake);
      if (!token) return next(new Error('Authentication token is required'));

      const user = await loadSocketUser(token);
      socket.data.user = user;
      socket.data.userId = user.id;
      socket.data.role = user.roleName;
      socket.data.patientId = user.patientId ?? null;
      return next();
    } catch (error) {
      return next(new Error(error.message));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    baseRoomsFor(user).forEach((room) => socket.join(room));

    logger.info('socket.connected', { userId: user.id, role: socket.data.role });
    socket.emit('connection.ready', {
      userId: user.id,
      role: socket.data.role,
      patientId: socket.data.patientId,
      rooms: Array.from(socket.rooms),
      events: Object.values(EVENTS),
    });

    socket.on('subscribe', async (payload, ack) => {
      try {
        const kind = payload && payload.type;
        const id = payload && payload.id;
        const subscriber = SUBSCRIBERS[kind];
        if (!subscriber) throw new Error(`Unknown subscription type: ${kind}`);
        const rooms = await subscriber(user, id);
        rooms.forEach((room) => socket.join(room));
        if (typeof ack === 'function') ack({ success: true, rooms });
      } catch (error) {
        if (typeof ack === 'function') ack({ success: false, message: error.message });
      }
    });

    socket.on('unsubscribe', (payload, ack) => {
      const kind = payload && payload.type;
      const id = payload && payload.id;
      const roomByType = {
        department: ROOMS.department,
        queue: ROOMS.queue,
        patient: ROOMS.patient,
        appointment: ROOMS.appointment,
        conversation: ROOMS.conversation,
      };
      const builder = roomByType[kind];
      if (builder) socket.leave(builder(id));
      if (typeof ack === 'function') ack({ success: Boolean(builder) });
    });

    socket.on('conversation:join', async (payload, ack) => {
      try {
        const conversationId = Number(payload?.conversationId ?? payload);
        const rooms = await SUBSCRIBERS.conversation(user, conversationId);
        rooms.forEach((room) => socket.join(room));
        if (typeof ack === 'function') ack({ success: true, rooms });
      } catch (error) {
        if (typeof ack === 'function') ack({ success: false, message: error.message });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info('socket.disconnected', { userId: user.id, reason });
    });
  });

  logger.info('socket.io.ready', { path: '/socket.io', cors: env.CORS_ORIGINS });
  return io;
}

function getIo() {
  return io;
}

/** Test helper: drop the singleton so a new server can be attached. */
function reset() {
  io = null;
}

/* ------------------------------------------------------------------ *
 * Emission helpers (no-ops when the gateway is not running, e.g. in tests)
 * ------------------------------------------------------------------ */
const emit = (room, event, payload) => {
  if (!io) return false;
  io.to(room).emit(event, payload);
  return true;
};

const emitToUser = (userId, event, payload) => emit(ROOMS.user(userId), event, payload);
const emitToHospital = (event, payload) => emit(ROOMS.hospital(), event, payload);
const emitToDepartment = (departmentId, event, payload) => emit(ROOMS.department(departmentId), event, payload);
const emitToPatient = (patientId, event, payload) => emit(ROOMS.patient(patientId), event, payload);
const emitToQueue = (departmentId, event, payload) => emit(ROOMS.queue(departmentId), event, payload);
const emitToConversation = (conversationId, event, payload) => emit(ROOMS.conversation(conversationId), event, payload);
const emitToAppointment = (appointmentId, event, payload) => emit(ROOMS.appointment(appointmentId), event, payload);

/** Emits to a set of user ids in one pass (used for multi-recipient events). */
function emitToUsers(userIds, event, payload) {
  const ids = Array.from(new Set((userIds || []).filter(Boolean)));
  if (!io || !ids.length) return false;
  ids.forEach((userId) => emitToUser(userId, event, payload));
  return true;
}

/** Every socket of users attached to a department (used for result alerts). */
async function departmentUserIds(departmentId) {
  const { DepartmentStaff } = getModels();
  const rows = await DepartmentStaff.findAll({
    where: { departmentId },
    attributes: ['userId'],
    raw: true,
  });
  return rows.map((row) => row.userId);
}

/** All active clinical users who should be told about a published result. */
async function clinicalUserIds() {
  const { User, Role } = getModels();
  const roles = await Role.findAll({
    where: { name: { [Op.in]: [ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ROLES.RADIOLOGIST, ROLES.NURSE] } },
    attributes: ['id'],
    raw: true,
  });
  const users = await User.findAll({
    where: { roleId: { [Op.in]: roles.map((r) => r.id) }, status: 'ACTIVE' },
    attributes: ['id'],
    raw: true,
  });
  return users.map((u) => u.id);
}

module.exports = {
  attachRealtime,
  getIo,
  reset,
  emitToUser,
  emitToUsers,
  emitToHospital,
  emitToDepartment,
  emitToPatient,
  emitToQueue,
  emitToConversation,
  emitToAppointment,
  departmentUserIds,
  clinicalUserIds,
  EVENTS,
  ROOMS,
};