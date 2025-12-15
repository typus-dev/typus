/**
 * Config Adapter for SML
 *
 * Registers configuration operations:
 * - config.* — public settings (feature flags, UI preferences)
 * - system.config.* — system settings (admin only, hidden from AI)
 */

import { SML } from '@typus-core/shared/sml';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();
const OWNER = 'core:config';

// Categories that are safe for public/AI access
const PUBLIC_CATEGORIES = ['ui', 'feature', 'site', 'seo', 'social_media'];

// Categories that should be hidden from AI
const SYSTEM_CATEGORIES = ['email', 'security', 'integrations', 'storage', 'queue', 'cache', 'session', 'logging', 'performance', 'ai', 'notifications', 'messaging'];

/**
 * Register config operations in SML.
 */
export async function registerConfigOperations(): Promise<void> {
  logger.debug('[SML:ConfigAdapter] Registering config operations');

  let registeredCount = 0;

  // ==========================================================================
  // Public Config Operations (safe for AI)
  // ==========================================================================

  // config.get - Get a public config value
  SML.register('config.get', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.key) {
        throw new Error('Config key is required');
      }

      const config = await prisma.systemConfig.findFirst({
        where: { key: params.key }
      });

      if (!config) {
        return { found: false, key: params.key };
      }

      // Block access to system categories for non-admins
      if (config.category && SYSTEM_CATEGORIES.includes(config.category)) {
        if (!ctx?.user?.roles?.includes('admin')) {
          return { found: false, key: params.key, message: 'Access denied' };
        }
      }

      // Don't return encrypted values
      if (config.isEncrypted) {
        return { found: true, key: params.key, value: '[ENCRYPTED]' };
      }

      return {
        found: true,
        key: config.key,
        value: config.value,
        category: config.category
      };
    },
    schema: {
      description: 'Get a public configuration value (feature flags, UI settings)',
      params: {
        key: { type: 'string', required: true, description: 'Config key (e.g., feature.darkMode, ui.theme)' }
      },
      returns: {
        type: 'ConfigValue',
        fields: {
          found: { type: 'boolean', required: true },
          key: { type: 'string' },
          value: { type: 'any' },
          category: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // config.list - List public configs only
  SML.register('config.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {
        category: { in: PUBLIC_CATEGORIES },
        isEncrypted: false
      };

      if (params.category) {
        if (!PUBLIC_CATEGORIES.includes(params.category)) {
          return { items: [], total: 0, message: 'Category not accessible' };
        }
        where.category = params.category;
      }

      const configs = await prisma.systemConfig.findMany({
        where,
        orderBy: { key: 'asc' },
        select: {
          key: true,
          value: true,
          category: true,
          description: true
        }
      });

      return { items: configs, total: configs.length };
    },
    schema: {
      description: 'List public configuration values (feature flags, UI settings)',
      params: {
        category: { type: 'string', description: 'Filter by category: ui, feature, site, seo' }
      },
      returns: {
        type: 'ConfigList',
        fields: {
          items: { type: 'ConfigValue[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // config.features - List feature flags (convenience method)
  SML.register('config.features', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const configs = await prisma.systemConfig.findMany({
        where: {
          category: 'feature',
          isEncrypted: false
        },
        orderBy: { key: 'asc' },
        select: {
          key: true,
          value: true,
          description: true
        }
      });

      // Convert to feature flag format
      const features: Record<string, boolean> = {};
      for (const c of configs) {
        const flagName = c.key.replace('feature.', '');
        features[flagName] = c.value === true || c.value === 'true' || c.value === 1;
      }

      return { features, count: Object.keys(features).length };
    },
    schema: {
      description: 'Get all feature flags as key-value pairs',
      returns: {
        type: 'FeatureFlags',
        fields: {
          features: { type: 'object', description: 'Map of feature name to enabled status' },
          count: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // System Config Operations (admin only, hidden from AI)
  // ==========================================================================

  // system.config.get - Get any config (admin)
  SML.register('system.config.get', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.key) {
        throw new Error('Config key is required');
      }

      const config = await prisma.systemConfig.findFirst({
        where: { key: params.key }
      });

      if (!config) {
        return { found: false, key: params.key };
      }

      return {
        found: true,
        key: config.key,
        value: config.isEncrypted ? '[ENCRYPTED]' : config.value,
        category: config.category,
        dataType: config.dataType,
        isEncrypted: config.isEncrypted,
        requiresRestart: config.requiresRestart
      };
    },
    schema: {
      description: 'Get any configuration value (admin only)',
      params: {
        key: { type: 'string', required: true, description: 'Config key' }
      },
      returns: {
        type: 'SystemConfigValue',
        fields: {
          found: { type: 'boolean', required: true },
          key: { type: 'string' },
          value: { type: 'any' },
          category: { type: 'string' },
          dataType: { type: 'string' },
          isEncrypted: { type: 'boolean' },
          requiresRestart: { type: 'boolean' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'internal' });
  registeredCount++;

  // system.config.list - List all configs (admin)
  SML.register('system.config.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {};
      if (params.category) where.category = params.category;

      const configs = await prisma.systemConfig.findMany({
        where,
        orderBy: { key: 'asc' },
        select: {
          key: true,
          value: true,
          category: true,
          dataType: true,
          description: true,
          isEncrypted: true,
          requiresRestart: true
        }
      });

      // Mask encrypted values
      const items = configs.map(c => ({
        ...c,
        value: c.isEncrypted ? '[ENCRYPTED]' : c.value
      }));

      return { items, total: items.length };
    },
    schema: {
      description: 'List all configuration values (admin only)',
      params: {
        category: { type: 'string', description: 'Filter by category' }
      },
      returns: {
        type: 'SystemConfigList',
        fields: {
          items: { type: 'SystemConfigValue[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'internal' });
  registeredCount++;

  // system.config.categories - List all categories (admin)
  SML.register('system.config.categories', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const categories = await prisma.systemConfig.findMany({
        select: { category: true },
        distinct: ['category'],
        where: { category: { not: null } }
      });

      const all = categories.map(c => c.category).filter(Boolean) as string[];

      return {
        all,
        public: PUBLIC_CATEGORIES,
        system: SYSTEM_CATEGORIES,
        total: all.length
      };
    },
    schema: {
      description: 'List all configuration categories with access levels',
      returns: {
        type: 'CategoryInfo',
        fields: {
          all: { type: 'string[]' },
          public: { type: 'string[]' },
          system: { type: 'string[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'internal' });
  registeredCount++;

  // system.config.set - Set a config value (admin)
  SML.register('system.config.set', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.key) {
        throw new Error('Config key is required');
      }

      const existing = await prisma.systemConfig.findFirst({
        where: { key: params.key }
      });

      if (existing) {
        await prisma.systemConfig.update({
          where: { id: existing.id },
          data: {
            value: params.value,
            category: params.category ?? existing.category,
            dataType: params.dataType ?? existing.dataType,
            description: params.description ?? existing.description,
            updatedBy: ctx?.user?.id
          }
        });
      } else {
        await prisma.systemConfig.create({
          data: {
            key: params.key,
            value: params.value,
            category: params.category,
            dataType: params.dataType || 'string',
            description: params.description,
            createdBy: ctx?.user?.id
          }
        });
      }

      return { success: true, key: params.key, created: !existing };
    },
    schema: {
      description: 'Set a configuration value (admin only)',
      params: {
        key: { type: 'string', required: true, description: 'Config key' },
        value: { type: 'any', required: true, description: 'Config value' },
        category: { type: 'string', description: 'Category for grouping' },
        dataType: { type: 'string', description: 'Data type: string, number, boolean, json' },
        description: { type: 'string', description: 'Human-readable description' }
      },
      returns: {
        type: 'SetResult',
        fields: {
          success: { type: 'boolean', required: true },
          key: { type: 'string' },
          created: { type: 'boolean' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'internal' });
  registeredCount++;

  // system.config.delete - Delete a config value (admin)
  SML.register('system.config.delete', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.key) {
        throw new Error('Config key is required');
      }

      const result = await prisma.systemConfig.deleteMany({
        where: { key: params.key }
      });

      return { success: result.count > 0, deleted: result.count };
    },
    schema: {
      description: 'Delete a configuration value (admin only)',
      params: {
        key: { type: 'string', required: true, description: 'Config key to delete' }
      },
      returns: {
        type: 'DeleteResult',
        fields: {
          success: { type: 'boolean', required: true },
          deleted: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'internal' });
  registeredCount++;

  logger.info(`[SML:ConfigAdapter] Registered ${registeredCount} config operations`);
}
