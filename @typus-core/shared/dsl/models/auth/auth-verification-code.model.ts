import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * Auth Verification Code model definition
 * Stores temporary verification codes for email/phone verification
 */
export const AuthVerificationCodeModel: DslModel = {
  name: 'AuthVerificationCode',
  module: 'auth',
  tableName: 'verification_codes',
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
      name: 'email',
      type: 'string',
      required: true,
      unique: true,
      validation: [
        { type: 'email' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'code',
      type: 'string',
      required: true,
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
registry.registerModel(AuthVerificationCodeModel);

// Export as AuthVerificationCode for convenience
export { AuthVerificationCodeModel as AuthVerificationCode };
