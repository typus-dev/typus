/**
 * Feed Adapter for SML
 *
 * Registers activity feed operations under feed.*
 * Provides activity streams, timelines, and recent updates.
 */

import { SML } from '@typus-core/shared/sml';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger();
const OWNER = 'core:feed';

/**
 * Register feed operations in SML.
 */
export async function registerFeedOperations(): Promise<void> {
  logger.debug('[SML:FeedAdapter] Registering feed operations');

  let registeredCount = 0;

  // ==========================================================================
  // Activity Feed
  // ==========================================================================

  // feed.activity - Get recent activity across system
  SML.register('feed.activity', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const limit = Math.min(params.limit || 20, 50);
      const since = params.since ? new Date(params.since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days default

      // Fetch recent items from multiple tables
      const [recentTasks, recentCompass, recentContacts] = await Promise.all([
        prisma.projectTask.findMany({
          where: { updatedAt: { gte: since } },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: { id: true, title: true, status: true, updatedAt: true, projectId: true }
        }),
        prisma.compassItem.findMany({
          where: { updatedAt: { gte: since } },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: { id: true, title: true, status: true, type: true, updatedAt: true }
        }),
        prisma.crmContact.findMany({
          where: { updatedAt: { gte: since } },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: { id: true, name: true, email: true, updatedAt: true }
        })
      ]);

      // Combine and sort by date
      const activities = [
        ...recentTasks.map(t => ({ type: 'task', ...t })),
        ...recentCompass.map(c => ({ type: 'compass', ...c })),
        ...recentContacts.map(c => ({ type: 'contact', ...c }))
      ].sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
       .slice(0, limit);

      return { items: activities, total: activities.length };
    },
    schema: {
      description: 'Get recent activity across the system',
      params: {
        limit: { type: 'number', description: 'Max items (default 20, max 50)' },
        since: { type: 'string', description: 'ISO date to filter from (default 7 days ago)' }
      },
      returns: {
        type: 'ActivityList',
        fields: {
          items: { type: 'Activity[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // feed.project - Get activity for a specific project
  SML.register('feed.project', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      if (!params.projectId) {
        throw new Error('Project ID is required');
      }

      const limit = Math.min(params.limit || 20, 50);

      // Get project activities
      const activities = await prisma.projectActivity.findMany({
        where: { projectId: params.projectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          createdAt: true,
          userId: true
        }
      });

      return { items: activities, total: activities.length };
    },
    schema: {
      description: 'Get activity feed for a specific project',
      params: {
        projectId: { type: 'number', required: true, description: 'Project ID' },
        limit: { type: 'number', description: 'Max items (default 20, max 50)' }
      },
      returns: {
        type: 'ProjectActivityList',
        fields: {
          items: { type: 'ProjectActivity[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // feed.user - Get activity for current user
  SML.register('feed.user', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const userId = ctx?.user?.id;
      if (!userId) {
        return { items: [], total: 0, message: 'Not authenticated' };
      }

      const limit = Math.min(params.limit || 20, 50);
      const since = params.since ? new Date(params.since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get user's tasks and compass items
      const [myTasks, myCompass] = await Promise.all([
        prisma.projectTask.findMany({
          where: {
            OR: [
              { assigneeId: userId },
              { createdBy: userId }
            ],
            updatedAt: { gte: since }
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: { id: true, title: true, status: true, updatedAt: true, projectId: true }
        }),
        prisma.compassItem.findMany({
          where: {
            userId: userId,
            updatedAt: { gte: since }
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: { id: true, title: true, status: true, type: true, updatedAt: true }
        })
      ]);

      const activities = [
        ...myTasks.map(t => ({ type: 'task', ...t })),
        ...myCompass.map(c => ({ type: 'compass', ...c }))
      ].sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
       .slice(0, limit);

      return { items: activities, total: activities.length };
    },
    schema: {
      description: 'Get activity feed for current user',
      params: {
        limit: { type: 'number', description: 'Max items (default 20, max 50)' },
        since: { type: 'string', description: 'ISO date to filter from' }
      },
      returns: {
        type: 'UserActivityList',
        fields: {
          items: { type: 'Activity[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'public' });
  registeredCount++;

  // feed.logs - Get recent system logs (admin only)
  SML.register('feed.logs', {
    handler: async (params, ctx) => {
      const prisma = global.prisma;
      if (!prisma) throw new Error('Database not available');

      const limit = Math.min(params.limit || 50, 200);
      const where: any = {};

      if (params.level) where.level = params.level;
      if (params.source) where.source = { contains: params.source };

      const logs = await prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          level: true,
          message: true,
          source: true,
          createdAt: true
        }
      });

      return { items: logs, total: logs.length };
    },
    schema: {
      description: 'Get recent system logs',
      params: {
        limit: { type: 'number', description: 'Max items (default 50, max 200)' },
        level: { type: 'string', description: 'Filter by level: info, warn, error, debug' },
        source: { type: 'string', description: 'Filter by source (partial match)' }
      },
      returns: {
        type: 'LogList',
        fields: {
          items: { type: 'SystemLog[]' },
          total: { type: 'number' }
        }
      }
    }
  }, { owner: OWNER, visibility: 'admin' });
  registeredCount++;

  logger.info(`[SML:FeedAdapter] Registered ${registeredCount} feed operations`);
}
