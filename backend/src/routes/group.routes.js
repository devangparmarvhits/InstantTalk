const express = require('express');
const { createGroup, getUserGroups, getGroupInfo, updateGroup } = require('../controllers/group.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Group chat endpoints
 */

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a group conversation
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: Family Group }
 *               description:
 *                 type: string
 *                 maxLength: 200
 *               participantIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Group created
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
 *       400:
 *         description: Group name is required
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
router.post('/', protect, createGroup);

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get all groups the current user belongs to
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User groups fetched
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
router.get('/', protect, getUserGroups);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: Get information about a group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group (conversation) ID
 *     responses:
 *       200:
 *         description: Group info fetched
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
 *       404:
 *         description: Group not found
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
router.get('/:groupId', protect, getGroupInfo);

/**
 * @swagger
 * /api/groups/{groupId}:
 *   put:
 *     summary: Update a group (only admins can update)
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group (conversation) ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: New Group Name }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Group updated
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
 *       404:
 *         description: Group not found or not authorized
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
router.put('/:groupId', protect, updateGroup);

module.exports = router;
