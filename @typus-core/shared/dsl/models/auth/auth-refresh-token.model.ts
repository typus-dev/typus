import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * Auth Refresh Token model definition
 * User sessions and refresh tokens management
 */
export const AuthRefreshTokenModel: DslModel = {
  name: 'AuthRefreshToken',
  module: 'auth',
  tableName: 'refresh_tokens',
  fields: [
    {
      name: 'id',
      type: 'string',
      required: true,
      unique: true,
      primaryKey: true,
      autoIncrement: false
    },
    {
      name: 'userId',
      type: 'Int',
      required: true,
      validation: [
        { type: 'required' }
      ]
    },
    {
      name: 'token',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 512 }
      ]
    },
    {
      name: 'accessTokenJti',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'expiresAt',
      type: 'datetime',
      required: true,
      validation: [
        { type: 'required' }
      ]
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
      inverseSide: 'refreshTokens',
      required: true
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
registry.registerModel(AuthRefreshTokenModel);

export { AuthRefreshTokenModel as AuthRefreshToken };