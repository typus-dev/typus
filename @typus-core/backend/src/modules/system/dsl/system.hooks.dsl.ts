/**
 * DSL Hooks for System module
 *
 * Config validation and processing
 */

import { container } from 'tsyringe';
import * as crypto from 'crypto';

// Critical variables that should NEVER be in database
const CRITICAL_KEYS = [
  'database.url',
  'DATABASE_URL',
  'app.secret',
  'APP_SECRET',
  'jwt.secret',
  'JWT_SECRET',
  'session.secret',
  'SESSION_SECRET'
];

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
 * Placeholder for masked secret values (ASCII only to avoid encoding issues)
 */
const MASKED_VALUE = '********';

function isCritical(key: string): boolean {
  const normalizedKey = key?.toLowerCase();
  return CRITICAL_KEYS.some(criticalKey =>
    normalizedKey === criticalKey.toLowerCase()
  );
}

/**
 * Check if config key should be encrypted
 */
function shouldEncrypt(key: string): boolean {
  return SECRET_KEY_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Check if a value is masked (contains our mask placeholder)
 */
function isMaskedValue(value: string): boolean {
  return value?.includes(MASKED_VALUE);
}

/**
 * Mask a secret value for client display
 * Shows first 6 and last 4 chars if long enough
 * @param value - Original decrypted value
 * @returns Masked value like "sk-or-••••••••z789" or "••••••••"
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
 * Encrypt value using AES-256-GCM
 */
function encryptValue(value: string): string {
  if (!process.env.APP_SECRET) {
    throw new Error('APP_SECRET not configured');
  }

  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(process.env.APP_SECRET, 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    algorithm
  });
}

/**
 * Decrypt value using AES-256-GCM
 */
function decryptValue(encryptedData: string): string {
  if (!process.env.APP_SECRET) {
    throw new Error('APP_SECRET not configured');
  }

  try {
    const { encrypted, iv, authTag, algorithm = 'aes-256-gcm' } = JSON.parse(encryptedData);
    const key = crypto.scryptSync(process.env.APP_SECRET, 'salt', 32);

    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    global.logger?.error('[decryptValue] Decryption failed:', error);
    throw new Error('Failed to decrypt value');
  }
}

/**
 * SystemConfig.beforeCreate
 * Validation before creating config and automatic encryption
 */
export async function beforeCreateSystemConfigHandler(data: any) {
  // Block CRITICAL variables
  if (isCritical(data.key)) {
    throw new Error(
      `Cannot create CRITICAL variable ${data.key} in database. ` +
      `This must be configured in .env file.`
    );
  }

  // Validate key format (only lowercase, dots, underscores)
  if (data.key && !/^[a-z0-9._]+$/.test(data.key)) {
    throw new Error(
      'Config key must contain only lowercase letters, numbers, dots and underscores'
    );
  }

  // Auto-encrypt sensitive values
  if (data.value !== undefined && data.key) {
    if (shouldEncrypt(data.key)) {
      // Encrypt the value
      data.value = encryptValue(String(data.value));
      data.isEncrypted = true;

      global.logger?.info(`[SystemConfig_beforeCreate] Encrypted value for ${data.key}`, {
        isEncrypted: true,
        valueLength: data.value.length
      });
    } else {
      // Ensure isEncrypted is false for non-sensitive values
      if (data.isEncrypted === undefined) {
        data.isEncrypted = false;
      }
    }
  }

  return data;
}

/**
 * SystemConfig.beforeUpdate
 * Validation before updating config and automatic encryption
 * Ignores masked values to prevent overwriting secrets with masked placeholders
 */
export async function beforeUpdateSystemConfigHandler(data: any, context: any) {
  global.logger?.debug('[SystemConfig_beforeUpdate] Hook called', {
    hasData: !!data,
    hasContext: !!context,
    hasMetadata: !!context?.metadata,
    filter: context?.metadata?.filter,
    dataKeys: Object.keys(data || {})
  });

  // Cannot change key
  if (data.key) {
    delete data.key;
  }

  // Auto-encrypt sensitive values if value is being updated
  if (data.value !== undefined && context?.metadata?.filter?.id) {
    try {
      // Get the current record from database to check its key
      const record = await context.prisma.systemConfig.findUnique({
        where: { id: context.metadata.filter.id },
        select: { key: true }
      });

      if (!record) {
        global.logger?.warn('[SystemConfig_beforeUpdate] Record not found', {
          filterId: context.metadata.filter.id
        });
        return data;
      }

      const key = record.key;

      // Check if this is a secret field
      if (shouldEncrypt(key)) {
        // If value is masked, don't update it (user didn't change the secret)
        if (isMaskedValue(String(data.value))) {
          global.logger?.info(`[SystemConfig_beforeUpdate] Ignoring masked value for ${key} - not updating secret`);
          delete data.value;
          delete data.isEncrypted;
          return data;
        }

        // Encrypt the new value
        data.value = encryptValue(String(data.value));
        data.isEncrypted = true;

        global.logger?.info(`[SystemConfig_beforeUpdate] Encrypted new value for ${key}`, {
          isEncrypted: true,
          encryptedValueLength: data.value.length
        });
      } else {
        // Ensure isEncrypted is false for non-sensitive values
        data.isEncrypted = false;
      }
    } catch (error) {
      global.logger?.error('[SystemConfig_beforeUpdate] Error during encryption', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  return data;
}

/**
 * SystemConfig.afterCreate
 * Logging after creation and cache invalidation
 */
export async function afterCreateSystemConfigHandler(data: any) {
  global.logger?.info(`[SystemConfig] Created: ${data.key} = ${JSON.stringify(data.value)}`);

  // Clear ConfigService cache
  try {
    const { ConfigService } = await import('../services/ConfigService.js');
    const configService = container.resolve(ConfigService);
    configService.clearCache();
    global.logger?.debug('[SystemConfig] ConfigService cache cleared');
  } catch (error) {
    global.logger?.warn('[SystemConfig] Could not clear ConfigService cache:', error);
  }

  return data;
}

/**
 * SystemConfig.afterUpdate
 * Logging after update and cache invalidation
 */
export async function afterUpdateSystemConfigHandler(data: any) {
  global.logger?.info(`[SystemConfig] Updated: ${data.key}`);

  // Clear ConfigService cache
  try {
    const { ConfigService } = await import('../services/ConfigService.js');
    const configService = container.resolve(ConfigService);
    configService.clearCache();
    global.logger?.debug('[SystemConfig] ConfigService cache cleared');
  } catch (error) {
    global.logger?.warn('[SystemConfig] Could not clear ConfigService cache:', error);
  }

  return data;
}

/**
 * SystemConfig.afterDelete
 * Clear cache after deletion
 */
export async function afterDeleteSystemConfigHandler(data: any) {
  global.logger?.info(`[SystemConfig] Deleted: ${data.key}`);

  // Clear ConfigService cache
  try {
    const { ConfigService } = await import('../services/ConfigService.js');
    const configService = container.resolve(ConfigService);
    configService.clearCache();
    global.logger?.debug('[SystemConfig] ConfigService cache cleared');
  } catch (error) {
    global.logger?.warn('[SystemConfig] Could not clear ConfigService cache:', error);
  }

  return data;
}

/**
 * Process a single config record: decrypt if needed, then mask secrets
 */
function processConfigRecord(record: any): void {
  if (!record || !record.key) return;

  // Step 1: Decrypt if encrypted
  if (record.isEncrypted && record.value) {
    try {
      record.value = decryptValue(record.value);
      global.logger?.debug(`[SystemConfig_afterRead] Decrypted value for ${record.key}`);
    } catch (error) {
      global.logger?.error(`[SystemConfig_afterRead] Failed to decrypt ${record.key}:`, error);
      record.value = MASKED_VALUE; // Show masked on error
    }
  }

  // Step 2: Mask secret values (never send real secrets to client)
  if (shouldEncrypt(record.key) && record.value) {
    record.value = maskSecretValue(record.value);
    record.isMasked = true; // Flag for client to know value is masked
    global.logger?.debug(`[SystemConfig_afterRead] Masked secret value for ${record.key}`);
  }

  // Always set isEncrypted to false for client (we don't send encrypted data)
  record.isEncrypted = false;
}

/**
 * SystemConfig.afterRead
 * Decrypt encrypted values and mask secrets before sending to client
 */
export async function afterReadSystemConfigHandler(data: any) {
  global.logger?.debug(`[SystemConfig_afterRead] Hook called`, {
    isArray: Array.isArray(data),
    hasData: !!data?.data,
    hasPaginationMeta: !!data?.paginationMeta,
    dataType: typeof data,
    keys: data ? Object.keys(data) : []
  });

  // Handle pagination result structure: { data: [...], paginationMeta: {...} }
  if (data && data.data && Array.isArray(data.data)) {
    global.logger?.debug(`[SystemConfig_afterRead] Processing array of ${data.data.length} records`);
    for (const record of data.data) {
      processConfigRecord(record);
    }
  }
  // Handle single record (findUnique)
  else if (data && !Array.isArray(data) && data.key) {
    processConfigRecord(data);
  }
  // Handle array of records without pagination
  else if (Array.isArray(data)) {
    global.logger?.debug(`[SystemConfig_afterRead] Processing plain array of ${data.length} records`);
    for (const record of data) {
      processConfigRecord(record);
    }
  }

  return data;
}

// ==================== ConfigPublic Hooks ====================

/**
 * ConfigPublic.beforeCreate
 * Validation before creating public config and automatic encryption
 */
export async function beforeCreateConfigPublicHandler(data: any) {
  // Validate key format (only lowercase, dots, underscores)
  if (data.key && !/^[a-z0-9._]+$/.test(data.key)) {
    throw new Error(
      'Config key must contain only lowercase letters, numbers, dots and underscores'
    );
  }

  // Auto-encrypt sensitive values
  if (data.value !== undefined && data.key) {
    if (shouldEncrypt(data.key)) {
      // Encrypt the value
      data.value = encryptValue(String(data.value));
      data.isEncrypted = true;

      global.logger?.info(`[ConfigPublic_beforeCreate] Encrypted value for ${data.key}`, {
        isEncrypted: true,
        valueLength: data.value.length
      });
    } else {
      // Ensure isEncrypted is false for non-sensitive values
      if (data.isEncrypted === undefined) {
        data.isEncrypted = false;
      }
    }
  }

  return data;
}

/**
 * ConfigPublic.beforeUpdate
 * Validation before updating public config and automatic encryption
 */
export async function beforeUpdateConfigPublicHandler(data: any, context: any) {
  // Cannot change key
  if (data.key) {
    delete data.key;
  }

  // Auto-encrypt sensitive values if value is being updated
  if (data.value !== undefined && context?.metadata?.filter?.id) {
    try {
      // Get the current record from database to check its key
      const record = await context.prisma.configPublic.findUnique({
        where: { id: context.metadata.filter.id },
        select: { key: true }
      });

      if (!record) {
        global.logger?.warn('[ConfigPublic_beforeUpdate] Record not found', {
          filterId: context.metadata.filter.id
        });
        return data;
      }

      const key = record.key;

      global.logger?.info('[ConfigPublic_beforeUpdate] Found record', {
        key,
        shouldEncrypt: shouldEncrypt(key)
      });

      // Check if value should be encrypted
      if (shouldEncrypt(key)) {
        // Encrypt the value
        data.value = encryptValue(String(data.value));
        data.isEncrypted = true;

        global.logger?.info(`[ConfigPublic_beforeUpdate] Encrypted value for ${key}`, {
          isEncrypted: true,
          encryptedValueLength: data.value.length
        });
      } else {
        // Ensure isEncrypted is false for non-sensitive values
        data.isEncrypted = false;
      }
    } catch (error) {
      global.logger?.error('[ConfigPublic_beforeUpdate] Error during encryption', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  return data;
}

/**
 * ConfigPublic.afterCreate
 * Logging after creation and cache invalidation
 */
export async function afterCreateConfigPublicHandler(data: any) {
  global.logger?.info(`[ConfigPublic] Created: ${data.key} = ${JSON.stringify(data.value)}`);

  // Clear ConfigService cache
  try {
    const { ConfigService } = await import('../services/ConfigService.js');
    const configService = container.resolve(ConfigService);
    configService.clearCache();
    global.logger?.debug('[ConfigPublic] ConfigService cache cleared');
  } catch (error) {
    global.logger?.warn('[ConfigPublic] Could not clear ConfigService cache:', error);
  }

  return data;
}

/**
 * ConfigPublic.afterUpdate
 * Logging after update and cache invalidation
 */
export async function afterUpdateConfigPublicHandler(data: any) {
  global.logger?.info(`[ConfigPublic] Updated: ${data.key}`);

  // Clear ConfigService cache
  try {
    const { ConfigService } = await import('../services/ConfigService.js');
    const configService = container.resolve(ConfigService);
    configService.clearCache();
    global.logger?.debug('[ConfigPublic] ConfigService cache cleared');
  } catch (error) {
    global.logger?.warn('[ConfigPublic] Could not clear ConfigService cache:', error);
  }

  return data;
}

/**
 * ConfigPublic.afterDelete
 * Clear cache after deletion
 */
export async function afterDeleteConfigPublicHandler(data: any) {
  global.logger?.info(`[ConfigPublic] Deleted: ${data.key}`);

  // Clear ConfigService cache
  try {
    const { ConfigService } = await import('../services/ConfigService.js');
    const configService = container.resolve(ConfigService);
    configService.clearCache();
    global.logger?.debug('[ConfigPublic] ConfigService cache cleared');
  } catch (error) {
    global.logger?.warn('[ConfigPublic] Could not clear ConfigService cache:', error);
  }

  return data;
}

/**
 * ConfigPublic.afterRead
 * Decrypt encrypted values after reading from database
 */
export async function afterReadConfigPublicHandler(data: any) {
  global.logger?.info(`[ConfigPublic_afterRead] Hook called`, {
    isArray: Array.isArray(data),
    hasData: !!data?.data,
    hasPaginationMeta: !!data?.paginationMeta
  });

  // Handle pagination result structure: { data: [...], paginationMeta: {...} }
  if (data && data.data && Array.isArray(data.data)) {
    global.logger?.info(`[ConfigPublic_afterRead] Processing array of ${data.data.length} records`);

    for (const record of data.data) {
      if (record.isEncrypted && record.value) {
        try {
          record.value = decryptValue(record.value);
          record.isEncrypted = false; // Mark as decrypted
          global.logger?.info(`[ConfigPublic_afterRead] Decrypted value for ${record.key}`);
        } catch (error) {
          global.logger?.error(`[ConfigPublic_afterRead] Failed to decrypt ${record.key}:`, error);
        }
      }
    }
  }
  // Handle single record (findUnique)
  else if (data && data.isEncrypted && data.value) {
    try {
      data.value = decryptValue(data.value);
      data.isEncrypted = false; // Mark as decrypted
      global.logger?.info(`[ConfigPublic_afterRead] Decrypted value for ${data.key}`);
    } catch (error) {
      global.logger?.error(`[ConfigPublic_afterRead] Failed to decrypt ${data.key}:`, error);
    }
  }
  // Handle array of records without pagination
  else if (Array.isArray(data)) {
    global.logger?.info(`[ConfigPublic_afterRead] Processing plain array of ${data.length} records`);

    for (const record of data) {
      if (record.isEncrypted && record.value) {
        try {
          record.value = decryptValue(record.value);
          record.isEncrypted = false; // Mark as decrypted
          global.logger?.info(`[ConfigPublic_afterRead] Decrypted value for ${record.key}`);
        } catch (error) {
          global.logger?.error(`[ConfigPublic_afterRead] Failed to decrypt ${record.key}:`, error);
        }
      }
    }
  }

  return data;
}
