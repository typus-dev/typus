/**
 * Dispatcher Tasks Seed
 *
 * Seeds essential automated background tasks:
 * - Database backups (every 12 hours)
 * - CMS scheduled publishing (every 5 minutes)
 * - System garbage collection (daily)
 * - Site cache warmup (daily)
 *
 * Note: Plugin-specific tasks (web_analytics, nginx_log_rotation) are
 * seeded by individual plugins, not the core seed.
 *
 * Uses upsert to be idempotent (safe to run multiple times).
 */

import { PrismaClient } from '../../prisma/generated/client/index.js';

export async function seedDispatcherTasks(prisma: PrismaClient) {
  const tasks = [
    // 1. Database Backup
    {
      name: 'Database Backup',
      type: 'database_backup',
      data: {
        storage: {
          type: 'local'
        },
        options: {
          compress: true,
          includeData: true,
          includeStructure: true,
          singleTransaction: true
        },
        retention: {
          days: 30,
          maxFiles: 50
        },
        naming: {
          pattern: '{database}_{timestamp}.sql',
          timestampFormat: 'YYYY-MM-DD_HH-mm-ss'
        }
      },
      periodSec: 43200, // 12 hours
      isActive: true
    },

    // 2. CMS Scheduled Publishing
    {
      name: 'CMS Scheduled Publishing',
      type: 'cms_scheduled_publishing',
      data: {
        batchSize: 50,
        systemUserId: 1,
        notifications: {
          onPublish: {
            emails: [],
            template: 'cms_item_published_dsl'
          },
          onError: {
            emails: [],
            template: 'cms_publishing_error_dsl'
          }
        },
        timeout: 30000,
        queueName: 'system_queue'
      },
      periodSec: 300, // 5 minutes
      isActive: true
    },

    // 3. System Garbage Collection
    {
      name: 'System Garbage Collection',
      type: 'system_garbage_collection_task',
      data: {
        targets: {
          storage: {
            enabled: true,
            daysThreshold: 7,
            batchSize: 100,
            cleanDeleted: true,
            cleanExpired: true
          },
          taskHistory: {
            enabled: true,
            keepLast: 1000,
            excludeStatuses: ['failed', 'retry'],
            batchSize: 1000
          },
          systemLogs: {
            enabled: false,
            keepDays: 7,
            keepErrorsDays: 30,
            batchSize: 1000
          },
          sessions: {
            enabled: false,
            keepDays: 7
          }
        },
        dryRun: false
      },
      periodSec: 86400, // 24 hours
      isActive: true
    },

    // 4. Site Cache Warmup
    {
      name: 'Site Cache Warmup',
      type: 'cache_generation_task',
      data: {
        force: false,
        action: 'sitemap',
        batchSize: 3
      },
      periodSec: 86400, // 24 hours
      isActive: true
    }
  ];

  for (const task of tasks) {
    // Use findFirst + update/create since 'name' is not a unique field
    const existing = await prisma.dispatcherTask.findFirst({
      where: { name: task.name }
    });

    if (existing) {
      await prisma.dispatcherTask.update({
        where: { id: existing.id },
        data: {
          data: task.data, // Prisma handles JSON serialization automatically
          periodSec: task.periodSec,
          isActive: task.isActive,
          updatedAt: new Date()
        }
      });
    } else {
      await prisma.dispatcherTask.create({
        data: {
          name: task.name,
          type: task.type,
          data: task.data, // Prisma handles JSON serialization automatically
          periodSec: task.periodSec,
          isActive: task.isActive,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }

  console.log(`    ℹ️  Seeded ${tasks.length} dispatcher tasks`);
}
