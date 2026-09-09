const express = require('express');
const multer = require('multer');
const {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  forwardMessage,
  clearConversation,
  deleteConversation,
  uploadFile,
} = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
const path = require('path');
const upload = multer({ dest: path.join(__dirname, '../../uploads') });

router.get('/conversations', protect, getConversations);
router.get('/conversations/:userId', protect, getOrCreateConversation);
router.delete('/conversations/:conversationId/messages', protect, clearConversation);
router.delete('/conversations/:conversationId', protect, deleteConversation);
router.post('/upload/file', protect, upload.single('file'), uploadFile);
router.post('/forward', protect, forwardMessage);
router.get('/:conversationId', protect, getMessages);
router.post('/', protect, sendMessage);
router.put('/:messageId', protect, editMessage);
router.delete('/:messageId', protect, deleteMessage);

module.exports = router;
