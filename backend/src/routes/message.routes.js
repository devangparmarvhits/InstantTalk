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

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Conversations and messaging endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SendMessageBody:
 *       type: object
 *       required: [conversationId, content]
 *       properties:
 *         conversationId: { type: string }
 *         content: { type: string }
 *         type:
 *           type: string
 *           enum: [text, image, file, call]
 *           default: text
 *         replyTo: { type: string }
 */

/**
 * @swagger
 * /api/messages/conversations:
 *   get:
 *     summary: Get all conversations for the current user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversations:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Conversation' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/conversations', protect, getConversations);

/**
 * @swagger
 * /api/messages/conversations/{userId}:
 *   get:
 *     summary: Get or create a direct conversation with another user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The other participant's user ID
 *     responses:
 *       200:
 *         description: Conversation fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversation: { $ref: '#/components/schemas/Conversation' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/conversations/:userId', protect, getOrCreateConversation);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}/messages:
 *   delete:
 *     summary: Clear a conversation's message history
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation cleared
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/conversations/:conversationId/messages', protect, clearConversation);

/**
 * @swagger
 * /api/messages/conversations/{conversationId}:
 *   delete:
 *     summary: Hide (delete) a conversation for the current user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Conversation deleted
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/conversations/:conversationId', protect, deleteConversation);

/**
 * @swagger
 * /api/messages/upload/file:
 *   post:
 *     summary: Upload a file and get its URL
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     url: { type: string }
 *       400:
 *         description: No file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/upload/file', protect, upload.single('file'), uploadFile);

/**
 * @swagger
 * /api/messages/forward:
 *   post:
 *     summary: Forward a message to one or more conversations
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messageId, conversationIds]
 *             properties:
 *               messageId: { type: string }
 *               conversationIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Message forwarded
 *       404:
 *         description: Message not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/forward', protect, forwardMessage);

/**
 * @swagger
 * /api/messages/{conversationId}:
 *   get:
 *     summary: Get messages for a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     responses:
 *       200:
 *         description: Messages fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Message' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:conversationId', protect, getMessages);

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message in a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageBody'
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     message: { $ref: '#/components/schemas/Message' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', protect, sendMessage);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   put:
 *     summary: Edit a message (only the sender can edit)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *     responses:
 *       200:
 *         description: Message edited
 *       403:
 *         description: Not authorized to edit this message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:messageId', protect, editMessage);

/**
 * @swagger
 * /api/messages/{messageId}:
 *   delete:
 *     summary: Delete a message (for everyone or just for the current user)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deleteForEveryone:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Message deleted
 *       404:
 *         description: Message not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:messageId', protect, deleteMessage);

module.exports = router;
