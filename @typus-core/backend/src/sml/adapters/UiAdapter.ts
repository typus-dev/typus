/**
 * UI Adapter for SML
 *
 * Registers UI-related operations under ui.*
 * Provides form definitions, component metadata, and menu structures.
 */

import { SML } from '@typus-core/shared/sml';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();
const OWNER = 'core:ui';

/**
 * Register UI operations in SML.
 */
export async function registerUiOperations(): Promise<void> {
  logger.debug('[SML:UiAdapter] Registering UI operations');

  let registeredCount = 0;

  // ==========================================================================
  // Menu Operations
  // ==========================================================================

  // ui.menu.list - List menus
  SML.register('ui.menu.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      try {
        const menus = await prisma.cmsMenu.findMany({
          where: params.location ? { location: params.location } : {},
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            location: true,
            position: true
          }
        });

        return { items: menus, total: menus.length };
      } catch {
        // Table might not exist
        return { items: [], total: 0 };
      }
    },
    schema: {
      description: 'List available menus',
      params: {
        location: { type: 'string', description: 'Filter by location: header, sidebar, footer' }
      },
      returns: {
        type: 'MenuList',
        fields: {
          items: { type: 'Menu[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ui.menu.items - Get menu items
  SML.register('ui.menu.items', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.menuId && !params.menuSlug) {
        throw new Error('Menu ID or slug is required');
      }

      try {
        // Find menu
        const menu = await prisma.cmsMenu.findFirst({
          where: params.menuId
            ? { id: params.menuId }
            : { slug: params.menuSlug }
        });

        if (!menu) {
          return { found: false, items: [] };
        }

        // Get menu items
        const items = await prisma.cmsMenuItem.findMany({
          where: { menuId: menu.id },
          orderBy: [{ parentId: 'asc' }, { position: 'asc' }],
          select: {
            id: true,
            title: true,
            url: true,
            icon: true,
            parentId: true,
            position: true,
            target: true
          }
        });

        // Build tree structure
        const buildTree = (parentId: number | null): any[] => {
          return items
            .filter(i => i.parentId === parentId)
            .map(item => ({
              ...item,
              children: buildTree(item.id)
            }));
        };

        return { found: true, menuId: menu.id, items: buildTree(null) };
      } catch {
        return { found: false, items: [] };
      }
    },
    schema: {
      description: 'Get menu items as tree',
      params: {
        menuId: { type: 'number', description: 'Menu ID' },
        menuSlug: { type: 'string', description: 'Menu slug' }
      },
      returns: {
        type: 'MenuItems',
        fields: {
          found: { type: 'boolean', required: true },
          menuId: { type: 'number' },
          items: { type: 'MenuItem[]' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // Form Schema Operations
  // ==========================================================================

  // ui.form.schema - Get form schema for a model
  SML.register('ui.form.schema', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.model) {
        throw new Error('Model name is required');
      }

      // Get SML operation schema for the model
      const createPath = `actions.${params.model}.create`;
      const opInfo = SML.describe(createPath);

      if (!opInfo) {
        // Try data.models path
        const modelPath = `data.models.${params.model}.create`;
        const modelInfo = SML.describe(modelPath);

        if (!modelInfo) {
          return { found: false, model: params.model };
        }

        return {
          found: true,
          model: params.model,
          fields: modelInfo.schema.params || {},
          source: 'data.models'
        };
      }

      return {
        found: true,
        model: params.model,
        fields: opInfo.schema.params || {},
        source: 'actions'
      };
    },
    schema: {
      description: 'Get form field schema for a model',
      params: {
        model: { type: 'string', required: true, description: 'Model name (e.g., compass.item, project.task)' }
      },
      returns: {
        type: 'FormSchema',
        fields: {
          found: { type: 'boolean', required: true },
          model: { type: 'string' },
          fields: { type: 'object' },
          source: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // Dynamic Routes
  // ==========================================================================

  // ui.routes.list - List dynamic routes
  SML.register('ui.routes.list', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      try {
        const routes = await prisma.systemDynamicRoute.findMany({
          where: params.type ? { type: params.type } : {},
          orderBy: { path: 'asc' },
          select: {
            id: true,
            path: true,
            type: true,
            handler: true,
            config: true,
            isActive: true
          }
        });

        return {
          items: routes.filter(r => r.isActive),
          total: routes.length
        };
      } catch {
        return { items: [], total: 0 };
      }
    },
    schema: {
      description: 'List dynamic routes',
      params: {
        type: { type: 'string', description: 'Filter by type: page, api, redirect' }
      },
      returns: {
        type: 'RouteList',
        fields: {
          items: { type: 'Route[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // Theme/Styling
  // ==========================================================================

  // ui.theme.current - Get current theme settings
  SML.register('ui.theme.current', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      // Get theme-related configs
      const themeConfigs = await prisma.systemConfig.findMany({
        where: {
          category: 'theme'
        }
      });

      const theme: Record<string, any> = {};
      for (const config of themeConfigs) {
        const key = config.key.replace('theme.', '');
        theme[key] = config.value;
      }

      return {
        name: theme.name || 'default',
        mode: theme.mode || 'light',
        primaryColor: theme.primaryColor || '#3b82f6',
        settings: theme
      };
    },
    schema: {
      description: 'Get current theme settings',
      returns: {
        type: 'Theme',
        fields: {
          name: { type: 'string' },
          mode: { type: 'string' },
          primaryColor: { type: 'string' },
          settings: { type: 'object' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // ==========================================================================
  // Component Registry
  // ==========================================================================

  // ui.components.list - List available UI components
  SML.register('ui.components.list', {
    handler: async (params, ctx) => {
      // Static list of available components
      const components = [
        { name: 'DataTable', category: 'display', description: 'Table with sorting, filtering, pagination' },
        { name: 'Form', category: 'input', description: 'Dynamic form builder' },
        { name: 'Card', category: 'display', description: 'Content card container' },
        { name: 'Modal', category: 'overlay', description: 'Modal dialog' },
        { name: 'Tabs', category: 'navigation', description: 'Tab navigation' },
        { name: 'Tree', category: 'display', description: 'Hierarchical tree view' },
        { name: 'Calendar', category: 'input', description: 'Date/time picker' },
        { name: 'Chart', category: 'display', description: 'Data visualization charts' },
        { name: 'KanbanBoard', category: 'display', description: 'Kanban task board' },
        { name: 'Timeline', category: 'display', description: 'Timeline/activity feed' }
      ];

      const filtered = params.category
        ? components.filter(c => c.category === params.category)
        : components;

      return { items: filtered, total: filtered.length };
    },
    schema: {
      description: 'List available UI components',
      params: {
        category: { type: 'string', description: 'Filter by category: display, input, navigation, overlay' }
      },
      returns: {
        type: 'ComponentList',
        fields: {
          items: { type: 'Component[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  logger.info(`[SML:UiAdapter] Registered ${registeredCount} UI operations`);
}
