const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const controller = require('../controllers/notification.controller');
const schemas = require('../validators/notification.validator');

const router = express.Router();

router.use(authenticate);

/* Notifications ------------------------------------------------------------- */
router.get('/', authorize('notifications:read'), validate(schemas.list), controller.list);
router.get('/unread-count', authorize('notifications:read'), controller.unreadCount);
router.put('/read-all', authorize('notifications:read'), controller.markAllRead);
router.put('/:id/read', authorize('notifications:read'), validate(schemas.notificationRoute), controller.markRead);
router.delete('/:id', authorize('notifications:read'), validate(schemas.notificationRoute), controller.remove);

/* Messaging ----------------------------------------------------------------- */
router.get('/conversations', authorize('messages:read'), validate(schemas.listConversations), controller.listConversations);
router.post('/conversations', authorize('messages:send'), validate(schemas.startConversation), controller.startConversation);
router.get('/conversations/unread-count', authorize('messages:read'), controller.unreadMessages);
router.get('/conversations/:id', authorize('messages:read'), validate(schemas.conversationRoute), controller.getConversation);
router.get('/conversations/:id/messages', authorize('messages:read'), validate(schemas.conversationRoute), validate(schemas.listMessages), controller.listMessages);
router.post('/conversations/:id/messages', authorize('messages:send'), validate(schemas.conversationRoute), validate(schemas.sendMessage), controller.sendMessage);
router.post('/conversations/:id/read', authorize('messages:read'), validate(schemas.conversationRoute), validate(schemas.markRead), controller.markConversationRead);
router.post('/conversations/:id/participants', authorize('messages:send'), validate(schemas.conversationRoute), validate(schemas.addParticipants), controller.addParticipants);
router.patch('/conversations/:id/archive', authorize('messages:send'), validate(schemas.conversationRoute), validate(schemas.archive), controller.archive);

module.exports = router;