const asyncHandler = require('../utils/asyncHandler');
const { created, success, noContent } = require('../utils/apiResponse');
const { queryOf, bodyOf, paramsOf, sendList } = require('../utils/http');
const AppError = require('../utils/AppError');
const { buildPaginationMeta } = require('../utils/pagination');
const notificationService = require('../services/notification.service');
const messagingService = require('../services/messaging.service');

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

const list = asyncHandler(async (req, res) => {
  const query = queryOf(req);
  const { rows, count } = await notificationService.list({ user: req.user, ...query });
  return sendList(res, {
    notifications: rows.map((row) => row.get ? row.get({ plain: true }) : row),
    pagination: buildPaginationMeta({ page: query.page, limit: query.limit, total: count }),
  }, { message: 'Notifications retrieved' });
});

const unreadCount = asyncHandler(async (req, res) => {
  const data = { count: await notificationService.unreadCount(req.user.id) };
  return success(res, { message: 'Unread notification count', data });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markRead({ userId: req.user.id, id: paramsOf(req).id });
  if (!notification) throw AppError.notFound('Notification not found');
  return success(res, {
    message: 'Notification marked as read',
    data: notification.get ? notification.get({ plain: true }) : notification,
  });
});

const markAllRead = asyncHandler(async (req, res) => {
  const count = await notificationService.markAllRead({ userId: req.user.id });
  return success(res, { message: 'All notifications marked as read', data: { updated: count } });
});

const remove = asyncHandler(async (req, res) => {
  await notificationService.remove({ userId: req.user.id, id: paramsOf(req).id });
  return noContent(res);
});

/* ------------------------------------------------------------------ *
 * Internal messaging
 * ------------------------------------------------------------------ */

const listConversations = asyncHandler(async (req, res) => {
  const result = await messagingService.listConversations({ user: req.user, query: queryOf(req) });
  return sendList(res, result, { message: 'Conversations retrieved' });
});

const getConversation = asyncHandler(async (req, res) => {
  const data = await messagingService.getConversation({ user: req.user, id: paramsOf(req).id });
  return success(res, { message: 'Conversation retrieved', data });
});

const startConversation = asyncHandler(async (req, res) => {
  const data = await messagingService.startConversation({ user: req.user, data: bodyOf(req) });
  return created(res, { message: 'Conversation started', data });
});

const listMessages = asyncHandler(async (req, res) => {
  const result = await messagingService.listMessages({
    user: req.user,
    id: paramsOf(req).id,
    query: queryOf(req),
  });
  return sendList(res, result, { message: 'Messages retrieved' });
});

const sendMessage = asyncHandler(async (req, res) => {
  const data = await messagingService.sendMessage({
    user: req.user,
    id: paramsOf(req).id,
    data: bodyOf(req),
  });
  return created(res, { message: 'Message sent', data });
});

const markConversationRead = asyncHandler(async (req, res) => {
  const data = await messagingService.markRead({
    user: req.user,
    id: paramsOf(req).id,
    messageId: bodyOf(req).messageId,
  });
  return success(res, { message: 'Conversation marked as read', data });
});

const addParticipants = asyncHandler(async (req, res) => {
  const data = await messagingService.addParticipantsToConversation({
    user: req.user,
    id: paramsOf(req).id,
    data: bodyOf(req),
  });
  return success(res, { message: 'Participants added', data });
});

const archive = asyncHandler(async (req, res) => {
  const data = await messagingService.archive({
    user: req.user,
    id: paramsOf(req).id,
    archived: bodyOf(req).archived,
  });
  return success(res, { message: 'Conversation updated', data });
});

const unreadMessages = asyncHandler(async (req, res) => {
  const data = await messagingService.unreadCount({ user: req.user });
  return success(res, { message: 'Unread message count', data });
});

module.exports = {
  list,
  unreadCount,
  markRead,
  markAllRead,
  remove,
  listConversations,
  getConversation,
  startConversation,
  listMessages,
  sendMessage,
  markConversationRead,
  addParticipants,
  archive,
  unreadMessages,
};