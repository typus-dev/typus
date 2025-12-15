import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * Auth User Role model definition
 * Junction table for many-to-many relationship between users and roles
 */
export const AuthUserRoleModel: DslModel = {
  name: 'AuthUserRole',
  module: 'auth',
  tableName: 'user_roles',
  fields: [
    {
      name: 'userId',
      type: 'Int',
      required: true
    },
    {
      name: 'roleId',
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

  relations: [
    {
      name: 'user',
      type: 'belongsTo',
      target: 'AuthUser',
      foreignKey: 'userId',
      inverseSide: 'userRoles'
    },
    {
      name: 'role',
      type: 'belongsTo',
      target: 'AuthRole',
      foreignKey: 'roleId',
      inverseSide: 'userRoles'
    }
  ],

  primaryKey: ['userId', 'roleId'],

  access: {
    create: ['admin'],
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
registry.registerModel(AuthUserRoleModel);

// Export as AuthUserRole for convenience
export { AuthUserRoleModel as AuthUserRole };
