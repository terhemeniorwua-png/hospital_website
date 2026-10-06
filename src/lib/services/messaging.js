import { api } from '../api/client';

/**
 * Messaging + notifications.
 *
 * Conversations are mounted under /notifications/conversations:
 *   POST   /notifications/conversations          { patientId, participantIds?, subject?, type?, message? }
 *   GET    /notifications/conversations          -> inbox
 *   GET    /notifications/conversations/:id      -> thread
 *   GET    /notifications/conversations/:id/messages?since=
 *   POST   /notifications/conversations/:id/messages  { body, documentId? }
 *   POST   /notifications/conversations/:id/read
 *   PATCH  /notifications/conversations/:id/archive   { archived }
 *   POST   /notifications/conversations/:id/participants { userIds, roleInConversation? }
 */

export async function listNotifications(query) {
  return api.get('/notifications/', { query });
}

export async function unreadNotificationCount() {
  return api.get('/notifications/unread-count');
}

export async function markNotificationRead(id) {
  return api.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  return api.put('/notifications/read-all');
}

export async function listConversations(query) {
  return api.get('/notifications/conversations', { query });
}

export async function getConversation(id) {
  return api.get(`/notifications/conversations/${id}`);
}

export async function listMessages(conversationId, query) {
  return api.get(`/notifications/conversations/${conversationId}/messages`, { query });
}

export async function sendMessage(conversationId, payload) {
  return api.post(`/notifications/conversations/${conversationId}/messages`, payload);
}

export async function startConversation(payload) {
  return api.post('/notifications/conversations', payload);
}

export async function markConversationRead(id) {
  return api.post(`/notifications/conversations/${id}/read`);
}

export async function archiveConversation(id, archived = true) {
  return api.patch(`/notifications/conversations/${id}/archive`, { archived });
}

export function unreadCount(data) {
  return Number(data?.unreadCount ?? data?.count ?? 0);
}

export function conversationTitle(conversation) {
  if (!conversation) return '';
  if (conversation.subject) return conversation.subject;
  const participants = conversation.participants || conversation.otherParticipants;
  if (Array.isArray(participants) && participants.length) {
    return participants
      .map((p) => p.user?.fullName || `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim() || p.fullName)
      .filter(Boolean)
      .join(', ');
  }
  return conversation.type === 'DIRECT' ? 'Direct message' : 'Conversation';
}

export function conversationPreview(conversation) {
  return conversation?.lastMessage?.body || conversation?.lastMessage?.message || conversation?.preview || '';
}