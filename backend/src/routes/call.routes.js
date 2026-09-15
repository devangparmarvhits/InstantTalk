const express = require('express');
const { getCallHistory, createCallRecord, createGroupCallRecord, deleteCall, clearCallHistory } = require('../controllers/call.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Calls
 *   description: Call history and call record endpoints
 */

/**
 * @swagger
 * /api/calls:
 *   get:
 *     summary: Get the current user's call history
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Call history fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     calls:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Call' }
 *                     totalCount: { type: number }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', protect, getCallHistory);

/**
 * @swagger
 * /api/calls:
 *   post:
 *     summary: Create a record for a one-to-one call
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conversationId, peerId, status]
 *             properties:
 *               conversationId: { type: string }
 *               peerId: { type: string }
 *               direction:
 *                 type: string
 *                 enum: [incoming, outgoing]
 *                 default: outgoing
 *                 description: Whether the current user was the caller
 *               type:
 *                 type: string
 *                 enum: [audio, video]
 *                 default: audio
 *               status:
 *                 type: string
 *                 enum: [completed, missed, declined, busy, failed]
 *               duration:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *               endedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Call record created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     call: { $ref: '#/components/schemas/Call' }
 *       400:
 *         description: Missing or invalid required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Direct conversation not found
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
router.post('/', protect, createCallRecord);

/**
 * @swagger
 * /api/calls/group:
 *   post:
 *     summary: Create a record for a group call
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conversationId, status]
 *             properties:
 *               conversationId: { type: string }
 *               type:
 *                 type: string
 *                 enum: [audio, video]
 *                 default: audio
 *               status:
 *                 type: string
 *                 enum: [completed, missed, declined, busy, failed]
 *               duration:
 *                 type: number
 *                 minimum: 0
 *                 default: 0
 *               startedAt:
 *                 type: string
 *                 format: date-time
 *               endedAt:
 *                 type: string
 *                 format: date-time
 *               participantIds:
 *                 type: array
 *                 items: { type: string }
 *                 description: User IDs part of the call; defaults to all group members
 *     responses:
 *       201:
 *         description: Group call record created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     call: { $ref: '#/components/schemas/Call' }
 *       400:
 *         description: Missing or invalid required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Group conversation not found
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
router.post('/group', protect, createGroupCallRecord);

/**
 * @swagger
 * /api/calls/history:
 *   delete:
 *     summary: Clear the current user's call history
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Call history cleared
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/history', protect, clearCallHistory);

/**
 * @swagger
 * /api/calls/{callId}:
 *   delete:
 *     summary: Delete (hide) a call record
 *     tags: [Calls]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call ID
 *     responses:
 *       200:
 *         description: Call deleted
 *       404:
 *         description: Call not found
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
router.delete('/:callId', protect, deleteCall);

module.exports = router;
