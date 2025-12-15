import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * Auth Role model definition
 * User roles for access control
 */
export const AuthRoleModel: DslModel = {
  name: 'AuthRole',
  module: 'auth',
  tableName: 'roles',
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
      name: 'name',
      type: 'string',
      required: true,
      unique: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'description',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'deleted',
      type: 'boolean',
      required: false,
      default: false
    },
    {
      name: 'abilityRules',
      type: 'json',
      required: false
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
      name: 'userRoles',
      type: 'hasMany',
      target: 'AuthUserRole',
      foreignKey: 'roleId'
    }
  ],

  access: {
    create: ['admin'],
    read: ['admin', 'user'],
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
registry.registerModel(AuthRoleModel);

// Export as AuthRole for convenience
export { AuthRoleModel as AuthRole };
