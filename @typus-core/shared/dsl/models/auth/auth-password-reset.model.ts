import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * Auth Password Reset model definition
 * Stores password reset tokens
 */
export const AuthPasswordResetModel: DslModel = {
  name: 'AuthPasswordReset',
  module: 'auth',
  tableName: 'password_resets',
  fields: [
    {
      name: 'id',
      type: 'string',
      required: true,
      unique: true,
      primaryKey: true,
      validation: [
        { type: 'maxLength', value: 36 }
      ],
      prisma: {
        default: 'dbgenerated("(UUID())")',
        type: '@db.VarChar(36)'
      }
    },
    {
      name: 'userId',
      type: 'Int',
      required: true
    },
    {
      name: 'token',
      type: 'string',
      required: true,
      unique: true,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'expiresAt',
      type: 'datetime',
      required: true
    },
    {
      name: 'createdAt',
      type: 'datetime',
      required: true
    },
    {
      name: 'updatedAt',
      type: 'datetime',
      required: true
    }
  ],

  relations: [],

  access: {
    create: ['admin', 'system'],
    read: ['admin'],
    update: ['admin'],
    delete: ['admin'],
    count: ['admin']
  },

  config: {
    timestamps: true
  },
  generatePrisma: true
};

// Register the model
registry.registerModel(AuthPasswordResetModel);

// Export as AuthPasswordReset for convenience
export { AuthPasswordResetModel as AuthPasswordReset };
