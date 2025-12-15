import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * Auth User model definition
 * Main user model for authentication and user management
 */
export const AuthUserModel: DslModel = {
  name: 'AuthUser',
  module: 'auth',
  tableName: 'users',
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
      name: 'isApproved',
      type: 'boolean',
      required: false,
      default: false
    },
    {
      name: 'isDeleted',
      type: 'boolean',
      required: false,
      default: false
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
      name: 'email',
      type: 'string',
      required: true,
      unique: true,
      validation: [
        { type: 'required' },
        { type: 'email' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'password',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'minLength', value: 8 }
      ]
    },
    {
      name: 'phoneNumber',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'avatarUrl',
      type: 'string',
      required: false,
      validation: [
        { type: 'url' },
        { type: 'maxLength', value: 2048 }
      ]
    },
    {
      name: 'notes',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'otp',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'role',
      type: 'string',
      required: false
    },
    {
      name: 'dateOfBirth',
      type: 'datetime',
      required: false
    },
    {
      name: 'isAdmin',
      type: 'boolean',
      required: false,
      default: false
    },
    {
      name: 'verificationToken',
      type: 'string',
      required: false
    },
    {
      name: 'isEmailVerified',
      type: 'boolean',
      required: false,
      default: false
    },
    {
      name: 'lastName',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'middleName',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'firstName',
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
      name: 'lastLoginAttempt',
      type: 'datetime',
      required: false
    },
    {
      name: 'lastLogin',
      type: 'datetime',
      required: false
    },
    {
      name: 'lastActivity',
      type: 'datetime',
      required: false
    },
    {
      name: 'cardNumber',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'twoFactorSecret',
      type: 'string',
      required: false
    },
    {
      name: 'isTwoFactorEnabled',
      type: 'boolean',
      required: false,
      default: false
    },
    {
      name: 'twoFactorMethod',
      type: 'string',
      required: false,
      default: 'email'
    },
    {
      name: 'twoFactorTempSecret',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'twoFactorTempMethod',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'twoFactorTempExpiry',
      type: 'datetime',
      required: false
    },
    {
      name: 'emailNotifications',
      type: 'boolean',
      required: false,
      default: true
    },
    {
      name: 'pushNotifications',
      type: 'boolean',
      required: false,
      default: false
    },
    {
      name: 'telegramNotifications',
      type: 'boolean',
      required: false,
      default: false
    },
    {
      name: 'telegramChatId',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 255 }
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
      name: 'userRoles',
      type: 'hasMany',
      target: 'AuthUserRole',
      foreignKey: 'userId'
    },
    {
      name: 'loginHistory',
      type: 'hasMany',
      target: 'AuthHistory',
      foreignKey: 'userId'
    },
    {
      name: 'refreshTokens',
      type: 'hasMany',
      target: 'AuthRefreshToken',
      foreignKey: 'userId'
    }
  ],

  access: {
    create: ['admin', 'public'],
    read: ['admin', 'user'],
    update: ['admin', 'user'],
    delete: ['admin'],
    count: ['admin']
  },

  config: {
    timestamps: true
  },
  generatePrisma: true
};

// Register the model
registry.registerModel(AuthUserModel);

// Export as AuthUser for convenience
export { AuthUserModel as AuthUser };
