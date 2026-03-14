import apiClient from './client';

export function getConversations() {
  return apiClient.get('/messages', { params: { conversations: true } });
}

export function getUnreadCount() {
  return apiClient.get('/messages', { params: { unreadCount: true } });
}

export function getConversation(conversationId) {
  return apiClient.get('/messages', { params: { conversationId } });
}

export function sendMessage(conversationId, content) {
  return apiClient.post('/messages', { conversationId, content });
}

export function startDm(otherUserId, firstMessage) {
  return apiClient.post('/messages', {
    action: 'start-dm',
    otherUserId,
    firstMessage,
  });
}

export function startContact({ recipientUserId, contextType, contextId, contextTitle, firstMessage }) {
  return apiClient.post('/messages', {
    action: 'start-contact',
    recipientUserId,
    contextType: contextType || null,
    contextId: contextId || null,
    contextTitle: contextTitle || null,
    firstMessage,
  });
}

export function markAsRead(conversationId) {
  return apiClient.patch('/messages', null, { params: { conversationId } });
}
