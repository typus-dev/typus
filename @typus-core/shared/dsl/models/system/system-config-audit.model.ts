import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * SystemConfigAudit model definition
 *
 * Audit trail for all configuration changes.
 * Tracks who changed what, when, and from which source.
 *
 * Features:
 * - Complete change history (old value → new value)
 * - User attribution (who made the change)
 * - Source tracking (wizard, admin_ui, api, migration, cli)
 * - IP address and user agent logging
 * - Immutable records (no updates, only inserts)
 */
export const SystemConfigAuditModel: DslModel = {
  name: 'SystemConfigAudit',
  module: 'system',
  tableName: 'config_audit_log',
  generatePrisma: true,
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
      name: 'configKey',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'oldValue',
      type: 'text',
      required: false
    },
    {
      name: 'newValue',
      type: 'text',
      required: false
    },
    {
      name: 'changedBy',
      type: 'Int',
      required: false
    },
    {
      name: 'changeSource',
      type: 'string',
      required: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 50 }
      ]
    },
    {
      name: 'ipAddress',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 45 }
      ]
    },
    {
      name: 'userAgent',
      type: 'text',
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

  access: {
    create: ['admin', 'system'],
    read: ['admin'],
    update: ['admin'],
    delete: ['admin'],
    count: ['admin']
  },

  config: {
    timestamps: true
  }
};

registry.registerModel(SystemConfigAuditModel);
export { SystemConfigAuditModel as SystemConfigAudit };
