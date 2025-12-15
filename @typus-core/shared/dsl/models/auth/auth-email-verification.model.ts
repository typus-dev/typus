import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * Auth Email Verification model definition
 * Stores email verification tokens
 */
export const AuthEmailVerificationModel: DslModel = {
  name: 'AuthEmailVerification',
  module: 'auth',
  tableName: 'email_verifications',
  fields: [
    {
      name: 'id',
      type: 'string',
      required: true,
      unique: true,
      primaryKey: true,
      autoincrement: true,
      validation: [
        { type: 'maxLength', value: 36 }
      ],
      prisma: {
        default: 'uuid()',
        type: '@db.VarChar(36)'
      }
    },
    {
      name: 'token',
      type: 'string',
      required: true,
      unique: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 191 }
      ]
    },
    {
      name: 'expiresAt',
      type: 'datetime',
      required: true
    },
    {
      name: 'userId',
      type: 'Int',
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
    read: ['admin', 'system'],
    update: ['admin', 'system'],
    delete: ['admin', 'system'],
    count: ['admin']
  },

  config: {
    timestamps: true
  },
  generatePrisma: true
};

// Register the model
registry.registerModel(AuthEmailVerificationModel);

// Export as AuthEmailVerification for convenience
export { AuthEmailVerificationModel as AuthEmailVerification };
