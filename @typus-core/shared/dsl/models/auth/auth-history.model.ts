import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * Auth History model definition
 * Login attempts and authentication history tracking
 */
export const AuthHistoryModel: DslModel = {
  name: 'AuthHistory',
  module: 'auth',
  tableName: 'history',
  fields: [
    {
      name: 'id',
      type: 'Int',
      required: true,
      unique: true,
      primaryKey: true,
      autoIncrement: true
    },
    {
      name: 'login',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'email',
      type: 'string',
      required: false,
      validation: [
        { type: 'email' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'password',
      type: 'string',
      required: false
    },
    {
      name: 'deviceData',
      type: 'json',
      required: false
    },
    {
      name: 'ispData',
      type: 'json',
      required: false
    },
    {
      name: 'result',
      type: 'string',
      required: false
    },
    {
      name: 'userId',
      type: 'Int',
      required: false
    },
    {
      name: 'userName',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'googleId',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'avatar',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'token',
      type: 'string',
      required: true,
      validation: [
        { type: 'maxLength', value: 512 }
      ]
    },
    {
      name: 'attemptTime',
      type: 'datetime',
      required: false
    },
    {
      name: 'createdAt',
      type: 'datetime'
    },
    {
      name: 'updatedAt',
      type: 'datetime'
    },
    {
      name: 'createdBy',
      type: 'Int',
      required: false
    },
    {
      name: 'updatedBy',
      type: 'Int',
      required: false
    }
  ],
  
  relations: [
    {
      name: 'user',
      type: 'belongsTo',
      target: 'AuthUser',
      foreignKey: 'userId',
      inverseSide: 'loginHistory',
      required: false
    }
  ],

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

// Register the models
registry.registerModel(AuthHistoryModel);

// Export for convenience
export { AuthHistoryModel as AuthHistory };
