import { DslModel } from '../../types.js';
import { registry } from '../../registry.js';

/**
 * Patterns that identify secret keys (case-insensitive)
 */
const SECRET_KEY_PATTERNS = [
  /password$/i,
  /secret$/i,
  /api[_\-.]?key$/i,
  /token$/i,
  /access[_\-.]?key$/i,
  /private[_\-.]?key$/i,
  /credentials?$/i
];

/**
 * Placeholder for masked secret values
 */
const MASKED_VALUE = '••••••••';

/**
 * Check if a config key represents a secret
 */
function isSecretKey(key: string): boolean {
  return SECRET_KEY_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Mask a secret value, showing only first and last 4 chars if long enough
 * @param value - Original value
 * @returns Masked value like "sk-or••••••••z789" or "••••••••"
 */
function maskSecretValue(value: string): string {
  if (!value || value.length < 12) {
    return MASKED_VALUE;
  }
  const prefix = value.substring(0, 6);
  const suffix = value.substring(value.length - 4);
  return `${prefix}${MASKED_VALUE}${suffix}`;
}

/**
 * SystemConfig model definition
 *
 * Dynamic runtime configuration storage for non-critical settings.
 * Critical secrets (DATABASE_URL, JWT_SECRET, etc.) must stay in .env file.
 *
 * Features:
 * - Runtime configuration changes without container restart
 * - Optional encryption for sensitive data
 * - Change tracking and audit trail
 * - Category-based organization
 * - Type-safe value storage
 * - Secret masking for sensitive keys (api_key, password, secret, token)
 */
export const SystemConfigModel: DslModel = {
  name: 'SystemConfig',
  module: 'system',
  tableName: 'config',
  generatePrisma: true,
  access: {
    create: ['admin'],
    read: ['admin'],      // Only admins can read via DSL
    update: ['admin'],
    delete: ['admin'],
    count: ['admin']
  },
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
      name: 'key',
      type: 'string',
      required: true,
      unique: true,
      validation: [
        { type: 'required' },
        { type: 'maxLength', value: 255 }
      ]
    },
    {
      name: 'value',
      type: 'text',
      required: true
    },
    {
      name: 'category',
      type: 'string',
      required: false,
      validation: [
        { type: 'maxLength', value: 100 }
      ]
    },
    {
      name: 'dataType',
      type: 'string',
      required: false,
      default: 'string',
      validation: [
        { type: 'maxLength', value: 20 }
      ]
    },
    {
      name: 'isEncrypted',
      type: 'boolean',
      required: false,
      default: false
    },
    {
      name: 'requiresRestart',
      type: 'boolean',
      required: false,
      default: false
    },
    {
      name: 'description',
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
      required: false
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
  config: {
    timestamps: true
  }
};

registry.registerModel(SystemConfigModel);
