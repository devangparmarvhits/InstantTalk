const express = require('express');
const multer = require('multer');
const { getUsers, updateProfile, updateSettings } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
const path = require('path');
const upload = multer({ dest: path.join(__dirname, '../../uploads') });

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users except the current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', protect, getUsers);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update the current user's profile (name, bio, avatar)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     consumes: [multipart/form-data]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               bio:
 *                 type: string
 *                 example: Software developer
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Not authorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/profile', protect, upload.single('avatar'), updateProfile);

/**
 * @swagger
 * /api/users/settings/{section}:
 *   put:
 *     summary: Update a settings section (privacy, notifications or appearance)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: section
 *         required: true
 *         schema:
 *           type: string
 *           enum: [privacy, notifications, appearance]
 *         description: Settings section to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 title: privacy
 *                 properties:
 *                   lastSeen:
 *                     type: string
 *                     enum: [everyone, contacts, nobody]
 *                   onlineStatus: { type: boolean }
 *                   readReceipts: { type: boolean }
 *                   profilePhoto:
 *                     type: string
 *                     enum: [everyone, contacts, nobody]
 *               - type: object
 *                 title: notifications
 *                 properties:
 *                   messages: { type: boolean }
 *                   sound: { type: boolean }
 *                   preview: { type: boolean }
 *               - type: object
 *                 title: appearance
 *                 properties:
 *                   theme:
 *                     type: string
 *                     enum: [dark, light, system]
 *                   fontSize:
 *                     type: string
 *                     enum: [small, medium, large]
 *     responses:
 *       200:
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Invalid settings section
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
router.put('/settings/:section', protect, updateSettings);

module.exports = router;
