const {
  id,
  z,
  booleanish,
  enumOf,
  optionalBooleanish,
  optionalEnumOf,
  optionalText,
  paginationQuery,
} = require('./common');
const { NOTIFICATION_TYPES } = require('../config/constants');

/** In-app notification + internal messaging contracts. */

const list = {
  query: z.object({
    page: paginationQuery.page,
    limit: paginationQuery.limit,
    isRead: optionalBooleanish,
    type: optionalEnumOf(Object.values(NOTIFICATION_TYPES)),
  }),
};

const notificationRoute = { params: z.object({ id: id }) };

/* ------------------------------------------------------------------ *
 * Messaging
 * ------------------------------------------------------------------ */

const startConversation = {
  body: z.object({
    patientId: id,
    participantIds: z.array(id).max(25).optional(),
    subject: z.string().trim().max(180).optional(),
    type: enumOf(['DIRECT', 'GROUP', 'CASE']).optional(),
    message: optionalText(4000),
  }),
};

const sendMessage = {
  body: z.object({
    body: z.string().trim().min(1, 'A message body is required').max(4000),
    documentId: id.optional(),
    attachmentUrl: z.string().trim().max(500).optional(),
    attachmentName: z.string().trim().max(180).optional(),
  }),
};

const listMessages = {
  query: z.object({
    ...paginationQuery,
    since: z.string().optional(),
  }),
};

const addParticipants = {
  body: z.object({
    userIds: z.array(id).min(1, 'Select at least one user'),
    roleInConversation: enumOf(['MEMBER', 'OWNER', 'OBSERVER']).optional(),
  }),
};

const archive = { body: z.object({ archived: z.coerce.boolean().default(true) }) };

const listConversations = {
  query: z.object({
    ...paginationQuery,
    archived: optionalBooleanish,
    unread: optionalBooleanish,
    search: z.string().trim().max(120).optional(),
  }),
};

const markRead = {
  params: z.object({ id: id }),
  body: z.object({ messageId: id.optional() }),
};

const conversationRoute = { params: z.object({ id: id }) };

module.exports = {
  list,
  notificationRoute,
  startConversation,
  sendMessage,
  listMessages,
  addParticipants,
  archive,
  listConversations,
  markRead,
  conversationRoute,
};