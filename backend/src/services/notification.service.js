const { Op } = require('sequelize');
const env = require('../config/env');
const { NOTIFICATION_TYPES } = require('../config/constants');
const { roleNameOf } = require('../utils/accessControl');
const { EVENTS } = require('../realtime/events');
const realtime = require('../realtime/socket');
const logger = require('../utils/logger');

/**
 * In-app notifications.
 *
 * Every notification is written to `notifications` and pushed over Socket.IO
 * to the recipient's private room. Writes never throw into the caller: losing a
 * notification must not roll back (or fail) the business transaction that
 * triggered it.
 */

/** Resolves the user account behind a patient record, when one exists. */
async function userIdForPatient(patientId) {
  if (!patientId) return null;
  const { User } = require('../models');
  const user = await User.findOne({ where: { patientId }, attributes: ['id'], raw: true });
  return user ? user.id : null;
}

/**
 * @param {object} params
 * @param {number[]} [params.userIds] recipient user ids
 * @param {number} [params.patientId] recipient patient (resolved to their account)
 * @param {number} [params.role] notify every active user holding this role
 * @param {string} params.type one of NOTIFICATION_TYPES
 * @param {string} params.title
 * @param {string} params.message
 * @param {object} [params.data]
 * @param {string} [params.priority] LOW | NORMAL | HIGH | URGENT
 * @param {string} [params.actionUrl]
 */
async function notify({
  userIds = [],
  patientId = null,
  role = null,
  type = NOTIFICATION_TYPES.SYSTEM,
  title,
  message,
  data = {},
  priority = 'NORMAL',
  actionUrl = null,
  createdBy = null,
}) {
  try {
    const { Notification, User, Role } = require('../models');

    const recipients = new Set(userIds.filter(Boolean).map(String));

    if (patientId) {
      const userId = await userIdForPatient(patientId);
      if (userId) recipients.add(userId);
    }

    if (role) {
      const roleRow = await Role.findOne({ where: { name: role }, attributes: ['id'] });
      if (roleRow) {
        const users = await User.findAll({
          where: { roleId: roleRow.id, status: 'ACTIVE' },
          attributes: ['id'],
          raw: true,
        });
        users.forEach((u) => recipients.add(u.id));
      }
    }

    if (!recipients.size) return { created: 0, notified: 0 };

    const rows = Array.from(recipients).map((userId) => ({
      userId,
      patientId,
      type,
      title: String(title).slice(0, 150),
      message,
      data,
      priority,
      actionUrl,
      createdBy,
      isRead: false,
    }));

    const created = await Notification.bulkCreate(rows);

    // Real-time push to each recipient's private room.
    created.forEach((notification) => {
      realtime.emitToUser(notification.userId, EVENTS.NOTIFICATION, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt,
      });
    });

    return { created: created.length, notified: created.length };
  } catch (error) {
    logger.error('notification.failed', { type, title, message: error.message });
    return { created: 0, notified: 0, error: error.message };
  }
}

async function list({ user, page = 1, limit = 20, isRead, type }) {
  const { Notification } = require('../models');
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));

  const where = { userId: user.id };
  if (isRead !== undefined) where.isRead = isRead;
  if (type) where.type = type;

  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  return { rows, count };
}

async function unreadCount(userId) {
  const { Notification } = require('../models');
  return Notification.count({ where: { userId, isRead: false } });
}

async function markRead({ userId, id }) {
  const { Notification } = require('../models');
  const notification = await Notification.findOne({ where: { id, userId } });
  if (!notification) return null;
  if (!notification.isRead) {
    await notification.update({ isRead: true, readAt: new Date() });
  }
  return notification;
}

async function markAllRead({ userId }) {
  const { Notification } = require('../models');
  const [count] = await Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { userId, isRead: false } },
  );
  return count;
}

async function remove({ userId, id }) {
  const { Notification } = require('../models');
  const removed = await Notification.destroy({ where: { id, userId } });
  return removed;
}

/**
 * Notifies the requesting doctor (and optionally the patient) about a result.
 * Used by laboratory, imaging and pharmacy flows.
 */
async function notifyResultReady({ orderedByUserId, patientId, event, payload, alsoPatient = true }) {
  const userIds = orderedByUserId ? [orderedByUserId] : [];
  await notify({
    userIds,
    patientId: alsoPatient ? patientId : null,
    type: NOTIFICATION_TYPES.LABORATORY,
    title: payload.title,
    message: payload.message,
    data: payload.data || {},
    priority: payload.priority || 'NORMAL',
    actionUrl: payload.actionUrl,
  });

  if (event) {
    realtime.emitToPatient(patientId, event, payload.data || {});
    realtime.emitToHospital(event, payload.data || {});
  }
}

module.exports = {
  notify,
  notifyResultReady,
  list,
  unreadCount,
  markRead,
  markAllRead,
  remove,
  userIdForPatient,
};