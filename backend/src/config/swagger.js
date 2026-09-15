const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'InstantTalk API',
      version: '1.0.0',
      description:
        'REST API documentation for the InstantTalk real-time chat application. ' +
        'All protected endpoints require a Bearer token obtained from `POST /api/auth/login` or `POST /api/auth/register`.',
    },
    servers: [
      {
        url: '/',
        description: 'Current server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', minLength: 2, maxLength: 50 },
            email: { type: 'string', format: 'email' },
            avatar: { type: 'string' },
            bio: { type: 'string', maxLength: 200 },
            isOnline: { type: 'boolean' },
            lastSeen: { type: 'string', format: 'date-time' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                token: { type: 'string' },
              },
            },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            participants: { type: 'array', items: { $ref: '#/components/schemas/User' } },
            isGroup: { type: 'boolean' },
            groupName: { type: 'string' },
            groupAvatar: { type: 'string' },
            groupDescription: { type: 'string' },
            createdBy: { type: 'string' },
            admins: { type: 'array', items: { type: 'string' } },
            lastMessage: { $ref: '#/components/schemas/Message' },
            unreadCount: { type: 'object' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            conversationId: { type: 'string' },
            sender: { $ref: '#/components/schemas/User' },
            content: { type: 'string' },
            type: { type: 'string', enum: ['text', 'image', 'file', 'call'] },
            replyTo: { type: 'string' },
            readBy: { type: 'array', items: { type: 'string' } },
            deleted: { type: 'boolean' },
            editedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Call: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            conversationId: { type: 'string' },
            caller: { $ref: '#/components/schemas/User' },
            receiver: { $ref: '#/components/schemas/User' },
            isGroup: { type: 'boolean' },
            participants: { type: 'array', items: { $ref: '#/components/schemas/User' } },
            type: { type: 'string', enum: ['audio', 'video'] },
            status: { type: 'string', enum: ['completed', 'missed', 'declined', 'busy', 'failed'] },
            duration: { type: 'number' },
            startedAt: { type: 'string', format: 'date-time' },
            endedAt: { type: 'string', format: 'date-time' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string', nullable: true },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, '..', 'routes', '*.js').replace(/\\/g, '/')],
};

module.exports = swaggerJsdoc(options);