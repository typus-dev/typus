import { Service } from '@/core/decorators/component.js';
import { BaseService } from '@/core/base/BaseService.js';
import { inject } from 'tsyringe';
import { DslService } from '@/dsl/services/DslService.js';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Security levels for configuration values
 */
export enum SecurityLevel {
  CRITICAL = 'critical',     // Never expose, never store in DB (DATABASE_URL, JWT_SECRET)
  SENSITIVE = 'sensitive',   // Encrypt if in DB (SMTP_PASSWORD, API keys)
  INTERNAL = 'internal',     // Can be in DB (SMTP_HOST, LOG_LEVEL)
  PUBLIC = 'public'          // Safe for frontend (SITE_NAME, theme)
}

/**
 * UnifiedConfigService - Priority chain: process.env → database → defaults
 *
 * Features:
 * - Priority chain: .env takes precedence, DB fills gaps, defaults as fallback
 * - Encryption for sensitive values (using APP_SECRET)
 * - Caching for performance
 * - Security level classification
 * - Audit trail via SystemConfigAudit
 * - Event emitter for config changes
 */
@Service()
export class ConfigService extends BaseService {
  private cache = new Map<string, any>();
  private eventEmitter = new EventEmitter();

  // Critical variables that should NEVER be in database
  private readonly CRITICAL_KEYS = [
    'database.url',
    'app.secret',
    'jwt.secret',
    'session.secret',
    'DATABASE_URL',
    'APP_SECRET',
    'JWT_SECRET',
    'SESSION_SECRET'
  ];

  constructor(
    @inject(DslService) private dslService: DslService
  ) {
    super();
  }

  /**
   * Get config value from database only (ignoring .env)
   * Used for dynamic configs that should be editable via admin panel
   *
   * @param key - Config key
   * @param defaultValue - Default value if not found (optional)
   * @returns Config value from database, or defaultValue if not found
   */
  async getFromDb(key: string, defaultValue?: any): Promise<any> {
    try {
      // Use Prisma directly (bypasses DSL auth) for system services
      const config = await this.prisma.systemConfig.findUnique({
        where: { key }
      });

      if (config) {
        // Decrypt if encrypted
        let value = config.isEncrypted
          ? this.decrypt(config.value)
          : config.value;

        // Parse value based on dataType
        value = this.parseValue(value, config.dataType);

        // Don't log secret values
        const isSecret = /password$|secret$|api[_\-.]?key$|token$|private[_\-.]?key$|credentials?$/i.test(key);
        this.logger.debug(`[ConfigService] Found value for ${key} via Prisma`, isSecret ? '[REDACTED]' : value);
        return value;
      }

      this.logger.debug(`[ConfigService] No data found for key ${key}`);
    } catch (error) {
      this.logger.error(`[ConfigService] Error reading config ${key}:`, error);
    }

    // Fallback to default value (undefined if not provided)
    this.logger.debug(`[ConfigService] Returning fallback for ${key}:`, defaultValue);
    return defaultValue;
  }

  /**
   * Get config value with priority chain: process.env → cache → database → default
   *
   * @param key - Config key (supports both 'site.name' and 'SITE_NAME' formats)
   * @param defaultValue - Default value if not found
   * @returns Config value
   */
  async get(key: string, defaultValue?: any): Promise<any> {
    // 1. Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // 2. Check process.env (HIGHEST PRIORITY)
    // Convert dot notation to ENV format: site.name → SITE_NAME
    const envKey = key.toUpperCase().replace(/\./g, '_');
    if (process.env[envKey] !== undefined) {
      const value = this.parseValue(process.env[envKey]!);
      this.cache.set(key, value);
      return value;
    }

    // 3. Check database using direct Prisma access
    // Using getFromDb() to bypass DSL hooks (which mask secrets for client display)
    // This ensures internal services always get the real values
    const value = await this.getFromDb(key, defaultValue);

    // Cache it if we got a real value (not the key fallback)
    if (value !== undefined && value !== key) {
      this.cache.set(key, value);
    }

    this.logger.debug(`[ConfigService] Returning value for ${key}`);
    return value;
  }

  /**
   * Get public configs by category (returns array of { key, value } objects)
   * Used by frontend to load public configs before authentication
   */
  async getPublicConfigsByCategory(category: string): Promise<Array<{ key: string; value: any }>> {
    const result = await this.dslService.executeOperation(
      'ConfigPublic',
      'read',
      null,
      { category },
      undefined,
      undefined,
      null, // userId = null (system context)
      null, // ability = null (bypass auth)
      'system'
    );

    if ('error' in result && result.error) {
      this.logger.warn(`[ConfigService] Error fetching public configs for category ${category}:`, result.error);
      return [];
    }

    if (!('data' in result) || !result.data) {
      this.logger.debug(`[ConfigService] No public configs found for category: ${category}`);
      return [];
    }

    // Return array with parsed values
    return result.data.map((item: any) => ({
      key: item.key,
      value: this.parseValue(item.value, item.dataType)
    }));
  }

  /**
   * Get all configs by category from SystemConfig (returns array of { key, value } objects)
   * Used by authenticated frontend to load category-specific private configs
   */
  async getConfigsByCategory(category: string): Promise<Array<{ key: string; value: any }>> {
    const result = await this.dslService.executeOperation(
      'SystemConfig',
      'read',
      null,
      { category },
      undefined,
      undefined,
      undefined,
      undefined,
      'system'
    );

    if ('error' in result && result.error) {
      this.logger.warn(`[ConfigService] Error fetching configs for category ${category}:`, result.error);
      return [];
    }

    if (!('data' in result) || !result.data) {
      this.logger.debug(`[ConfigService] No configs found for category: ${category}`);
      return [];
    }

    // Return array as-is (for frontend consumption)
    return result.data.map((item: any) => ({
      key: item.key,
      value: item.value
    }));
  }

  /**
   * Get all configs by category (returns flat object { key: value })
   * Used internally for legacy code
   */
  async getByCategory(category: string): Promise<Record<string, any>> {
    const result = await this.dslService.executeOperation(
      'SystemConfig',
      'read',
      null,
      { category },
      undefined,
      undefined,
      undefined,
      undefined,
      'system'
    );

    if ('error' in result && result.error) {
      return {};
    }

    if (!('data' in result) || !result.data) {
      return {};
    }

    // Convert to object { key: value }
    return result.data.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }

  /**
   * Get public configs only (no authentication required)
   * Used for anonymous users accessing /api/system/config
   *
   * @returns Object with config key-value pairs
   */
  async getPublicConfigs(): Promise<Record<string, any>> {
    try {
      const result = await this.dslService.executeOperation(
        'ConfigPublic',
        'read',
        null,
        {},
        undefined,
        undefined,
        null, // userId = null (system context)
        null, // ability = null (bypass auth)
        'system'
      );

      this.logger.debug('[ConfigService] Public configs DSL result:', {
        hasError: 'error' in result,
        hasData: 'data' in result,
        dataLength: result.data?.length
      });

      if (!('error' in result) && 'data' in result && result.data) {
        // Transform array to object { key: value }
        const configs: Record<string, any> = {};
        for (const item of result.data) {
          const value = this.parseValue(item.value, item.dataType);
          configs[item.key] = value;
        }
        return configs;
      }

      return {};
    } catch (error) {
      this.logger.error('[ConfigService] Error reading public configs:', error);
      return {};
    }
  }

  /**
   * Get all configs (public + system) - requires authentication
   * Used for authenticated users accessing /api/system/config
   *
   * @param userId - User ID for authorization
   * @param ability - User ability for authorization
   * @returns Object with merged config key-value pairs (public + system)
   */
  async getAllConfigs(userId?: number, ability?: any): Promise<Record<string, any>> {
    try {
      // Read both tables in parallel
      const [publicResult, systemResult] = await Promise.all([
        this.dslService.executeOperation(
          'ConfigPublic',
          'read',
          null,
          {},
          undefined,
          undefined,
          null,
          null,
          'system'
        ),
        this.dslService.executeOperation(
          'SystemConfig',
          'read',
          null,
          {},
          undefined,
          undefined,
          userId || null,
          ability || null,
          'system'
        )
      ]);

      this.logger.debug('[ConfigService] All configs DSL results:', {
        publicHasError: 'error' in publicResult,
        publicDataLength: publicResult.data?.length,
        systemHasError: 'error' in systemResult,
        systemDataLength: systemResult.data?.length
      });

      const configs: Record<string, any> = {};

      // Add public configs
      if (!('error' in publicResult) && 'data' in publicResult && publicResult.data) {
        for (const item of publicResult.data) {
          const value = this.parseValue(item.value, item.dataType);
          configs[item.key] = value;
        }
      }

      // Add system configs (with decryption if needed)
      if (!('error' in systemResult) && 'data' in systemResult && systemResult.data) {
        for (const item of systemResult.data) {
          let value = item.isEncrypted
            ? this.decrypt(item.value)
            : item.value;
          value = this.parseValue(value, item.dataType);
          configs[item.key] = value;
        }
      }

      return configs;
    } catch (error) {
      this.logger.error('[ConfigService] Error reading all configs:', error);
      // Fallback to public configs only
      return this.getPublicConfigs();
    }
  }

  /**
   * Set config value (stores in database only, never in .env)
   *
   * @param key - Config key
   * @param value - Config value
   * @param options - Additional options (category, description, etc.)
   * @throws Error if trying to set CRITICAL variable
   */
  async set(
    key: string,
    value: any,
    options?: {
      category?: string;
      description?: string;
      dataType?: string;
      requiresRestart?: boolean;
      isEncrypted?: boolean;
    }
  ): Promise<void> {
    // Security check: prevent setting CRITICAL variables in database
    if (this.isCritical(key)) {
      throw new Error(
        `Cannot set CRITICAL variable ${key} in database. ` +
        `This must be configured in .env file.`
      );
    }

    // Determine if value should be encrypted
    const shouldEncrypt = options?.isEncrypted ?? this.shouldEncrypt(key);

    // Encrypt value if sensitive
    const finalValue = shouldEncrypt && value
      ? this.encrypt(String(value))
      : String(value);

    // Auto-detect data type if not provided
    const dataType = options?.dataType || this.detectDataType(value);

    // Check if config exists
    const existing = await this.dslService.executeOperation(
      'SystemConfig',
      'read',
      null,
      { key },
      undefined,
      undefined,
      undefined,
      undefined,
      'system'
    );

    const isUpdate = 'data' in existing && existing.data && existing.data.length > 0;
    const oldValue = isUpdate ? existing.data[0].value : undefined;

    // Prepare data
    const data = {
      key,
      value: finalValue,
      category: options?.category,
      dataType,
      isEncrypted: shouldEncrypt,
      requiresRestart: options?.requiresRestart ?? false,
      description: options?.description
    };

    if (isUpdate) {
      // Update existing
      await this.dslService.executeOperation(
        'SystemConfig',
        'update',
        { value: finalValue, ...options },
        { key },
        undefined,
        undefined,
        undefined,
        undefined,
        'system'
      );
    } else {
      // Create new
      await this.dslService.executeOperation(
        'SystemConfig',
        'create',
        data,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'system'
      );
    }

    // Clear cache for this key
    this.cache.delete(key);

    // Create audit trail
    await this.createAuditLog(key, oldValue, value, isUpdate ? 'update' : 'create');

    // Emit event for real-time updates
    this.eventEmitter.emit('config:changed', { key, value, oldValue });

    this.logger.info(`[ConfigService] Config ${isUpdate ? 'updated' : 'created'}: ${key}`);
  }

  /**
   * Delete config
   */
  async delete(key: string): Promise<void> {
    // Security check
    if (this.isCritical(key)) {
      throw new Error(`Cannot delete CRITICAL variable ${key}`);
    }

    await this.dslService.executeOperation(
      'SystemConfig',
      'delete',
      null,
      { key },
      undefined,
      undefined,
      undefined,
      undefined,
      'system'
    );

    // Clear cache
    this.cache.delete(key);

    // Create audit log
    await this.createAuditLog(key, undefined, undefined, 'delete');

    this.logger.info(`[ConfigService] Config deleted: ${key}`);
  }

  /**
   * Clear all cached config values
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('[ConfigService] Cache cleared');
  }

  /**
   * Listen to config change events
   */
  on(event: 'config:changed', listener: (data: { key: string; value: any; oldValue?: any }) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // ==================== SECURITY & ENCRYPTION ====================

  /**
   * Check if key is CRITICAL (should never be in database)
   */
  private isCritical(key: string): boolean {
    const normalizedKey = key.toLowerCase();
    return this.CRITICAL_KEYS.some(criticalKey =>
      normalizedKey === criticalKey.toLowerCase()
    );
  }

  /**
   * Check if value should be encrypted based on key pattern
   */
  private shouldEncrypt(key: string): boolean {
    const sensitivePatterns = [
      /password$/i,
      /secret$/i,
      /api[_\-.]?key$/i,
      /token$/i,
      /access[_\-.]?key$/i,
      /private[_\-.]?key$/i,
      /credentials?$/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(key));
  }

  /**
   * Encrypt value using AES-256-GCM
   */
  private encrypt(value: string): string {
    if (!process.env.APP_SECRET) {
      throw new Error('APP_SECRET not configured - cannot encrypt sensitive values');
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
  private decrypt(encryptedData: string): string {
    if (!process.env.APP_SECRET) {
      throw new Error('APP_SECRET not configured - cannot decrypt sensitive values');
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
      this.logger.error('[ConfigService] Decryption failed:', error);
      throw new Error('Failed to decrypt config value');
    }
  }

  // ==================== VALUE PARSING ====================

  /**
   * Parse value based on data type
   */
  private parseValue(value: string, dataType?: string): any {
    if (value === null || value === undefined) {
      return value;
    }

    const type = dataType || 'string';

    switch (type) {
      case 'boolean':
        return value === 'true' || value === '1' || value === 'yes';

      case 'number':
        const num = Number(value);
        return isNaN(num) ? value : num;

      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }

      case 'string':
      default:
        return value;
    }
  }

  /**
   * Auto-detect data type from value
   */
  private detectDataType(value: any): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'object') return 'json';
    return 'string';
  }

  // ==================== AUDIT TRAIL ====================

  /**
   * Create audit log entry for config change
   */
  private async createAuditLog(
    key: string,
    oldValue: any,
    newValue: any,
    action: 'create' | 'update' | 'delete'
  ): Promise<void> {
    try {
      await this.dslService.executeOperation(
        'SystemConfigAudit',
        'create',
        {
          key,
          oldValue: oldValue ? String(oldValue) : null,
          newValue: newValue ? String(newValue) : null,
          action,
          changedAt: new Date(),
          changedBy: 'system' // TODO: get actual user ID from context
        },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'system'
      );
    } catch (error) {
      // Don't fail the config change if audit log fails
      this.logger.error('[ConfigService] Failed to create audit log:', error);
    }
  }
}
