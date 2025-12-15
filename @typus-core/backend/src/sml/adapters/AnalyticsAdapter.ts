/**
 * Analytics Adapter for SML
 *
 * Registers analytics/statistics operations under analytics.*
 * Provides BI, metrics, and aggregation queries.
 */

import { SML } from '@typus-core/shared/sml';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();
const OWNER = 'core:analytics';

/**
 * Register analytics operations in SML.
 */
export async function registerAnalyticsOperations(): Promise<void> {
  logger.debug('[SML:AnalyticsAdapter] Registering analytics operations');

  let registeredCount = 0;

  // ==========================================================================
  // Overview Statistics
  // ==========================================================================

  // analytics.overview - Get system overview statistics
  SML.register('analytics.overview', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const [
        usersCount,
        projectsCount,
        tasksCount,
        contactsCount,
        compassItemsCount
      ] = await Promise.all([
        prisma.authUser.count(),
        prisma.project.count(),
        prisma.projectTask.count(),
        prisma.crmContact.count(),
        prisma.compassItem.count()
      ]);

      return {
        users: usersCount,
        projects: projectsCount,
        tasks: tasksCount,
        contacts: contactsCount,
        compassItems: compassItemsCount,
        timestamp: new Date().toISOString()
      };
    },
    schema: {
      description: 'Get system overview statistics',
      returns: {
        type: 'OverviewStats',
        fields: {
          users: { type: 'number' },
          projects: { type: 'number' },
          tasks: { type: 'number' },
          contacts: { type: 'number' },
          compassItems: { type: 'number' },
          timestamp: { type: 'string' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // analytics.project - Get project statistics
  SML.register('analytics.project', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.projectId) {
        throw new Error('Project ID is required');
      }

      const [
        totalTasks,
        todoTasks,
        inProgressTasks,
        doneTasks
      ] = await Promise.all([
        prisma.projectTask.count({ where: { projectId: params.projectId } }),
        prisma.projectTask.count({ where: { projectId: params.projectId, status: 'todo' } }),
        prisma.projectTask.count({ where: { projectId: params.projectId, status: 'in-progress' } }),
        prisma.projectTask.count({ where: { projectId: params.projectId, status: 'done' } })
      ]);

      const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

      return {
        projectId: params.projectId,
        totalTasks,
        byStatus: {
          todo: todoTasks,
          inProgress: inProgressTasks,
          done: doneTasks
        },
        progress
      };
    },
    schema: {
      description: 'Get statistics for a specific project',
      params: {
        projectId: { type: 'number', required: true, description: 'Project ID' }
      },
      returns: {
        type: 'ProjectStats',
        fields: {
          projectId: { type: 'number' },
          totalTasks: { type: 'number' },
          byStatus: { type: 'object' },
          progress: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // analytics.compass - Get compass/OKR statistics
  SML.register('analytics.compass', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const where: any = {};
      if (ctx?.user?.id) where.userId = ctx.user.id;

      const [
        total,
        byType,
        byStatus
      ] = await Promise.all([
        prisma.compassItem.count({ where }),
        prisma.compassItem.groupBy({
          by: ['type'],
          where,
          _count: true
        }),
        prisma.compassItem.groupBy({
          by: ['status'],
          where,
          _count: true
        })
      ]);

      // Calculate average progress
      const avgProgress = await prisma.compassItem.aggregate({
        where,
        _avg: { progress: true }
      });

      return {
        total,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        averageProgress: Math.round(avgProgress._avg.progress || 0)
      };
    },
    schema: {
      description: 'Get compass/OKR statistics',
      returns: {
        type: 'CompassStats',
        fields: {
          total: { type: 'number' },
          byType: { type: 'object' },
          byStatus: { type: 'object' },
          averageProgress: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // analytics.aggregate - Generic aggregation query
  SML.register('analytics.aggregate', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const allowedModels = ['project', 'projectTask', 'compassItem', 'crmContact', 'socialPost'];

      if (!allowedModels.includes(params.model)) {
        throw new Error(`Model not allowed for aggregation. Allowed: ${allowedModels.join(', ')}`);
      }

      const model = (prisma as any)[params.model];
      if (!model) {
        throw new Error(`Model ${params.model} not found`);
      }

      const result: any = {};

      if (params.count) {
        result.count = await model.count({ where: params.where || {} });
      }

      if (params.groupBy) {
        result.grouped = await model.groupBy({
          by: [params.groupBy],
          where: params.where || {},
          _count: true
        });
      }

      return result;
    },
    schema: {
      description: 'Perform aggregation query on a model',
      params: {
        model: { type: 'string', required: true, description: 'Model: project, projectTask, compassItem, crmContact, socialPost' },
        count: { type: 'boolean', description: 'Include count' },
        groupBy: { type: 'string', description: 'Field to group by' },
        where: { type: 'object', description: 'Filter conditions' }
      },
      returns: {
        type: 'AggregateResult',
        fields: {
          count: { type: 'number' },
          grouped: { type: 'array' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  logger.info(`[SML:AnalyticsAdapter] Registered ${registeredCount} analytics operations`);
}
