/**
 * Dispatcher Task History Demo Seed
 *
 * Creates ~120 task execution history records over the last 7 days
 * for realistic chart visualization.
 */

import { PrismaClient } from '../../../prisma/generated/client/index.js';

// Task definitions matching existing tasks in DB
const TASKS = [
  { id: 1, name: 'Database Backup', type: 'database_backup', queue: 'Backup' },
  { id: 2, name: 'CMS Scheduled Publishing', type: 'cms_scheduled_publishing', queue: 'System' },
  { id: 3, name: 'System Garbage Collection', type: 'system_garbage_collection_task', queue: 'System' },
  { id: 4, name: 'Site Cache Warmup', type: 'cache_generation_task', queue: 'Cache' },
];

// Generate random duration based on task type
function randomDuration(taskType: string): number {
  const baseDurations: Record<string, [number, number]> = {
    'database_backup': [5000, 30000],        // 5-30 seconds
    'cms_scheduled_publishing': [500, 3000], // 0.5-3 seconds
    'system_garbage_collection_task': [2000, 15000], // 2-15 seconds
    'cache_generation_task': [1000, 8000],   // 1-8 seconds
  };
  const [min, max] = baseDurations[taskType] || [1000, 5000];
  return Math.floor(Math.random() * (max - min) + min);
}

// Generate execution records for a given day
function generateDayExecutions(date: Date, countRange: [number, number]) {
  const executions: any[] = [];
  const count = Math.floor(Math.random() * (countRange[1] - countRange[0]) + countRange[0]);

  for (let i = 0; i < count; i++) {
    const task = TASKS[Math.floor(Math.random() * TASKS.length)];
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);

    const startedAt = new Date(date);
    startedAt.setHours(hour, minute, Math.floor(Math.random() * 60), 0);

    const duration = randomDuration(task.type);
    const finishedAt = new Date(startedAt.getTime() + duration);

    // 90% success rate overall, but some tasks more reliable than others
    const successRate = task.type === 'database_backup' ? 0.85 : 0.95;
    const isSuccess = Math.random() < successRate;

    executions.push({
      taskId: task.id,
      taskName: task.name,
      taskType: task.type,
      queueName: task.queue,
      status: isSuccess ? 'success' : 'failed',
      startedAt,
      finishedAt,
      duration,
      error: isSuccess ? null : getRandomError(task.type),
      result: isSuccess ? { processed: Math.floor(Math.random() * 100) + 1 } : null,
      metadata: {
        triggeredBy: Math.random() > 0.8 ? 'manual' : 'scheduler',
        retryAttempt: isSuccess ? 0 : Math.floor(Math.random() * 3),
      },
      createdAt: startedAt,
      updatedAt: finishedAt,
    });
  }

  return executions;
}

function getRandomError(taskType: string): string {
  const errors: Record<string, string[]> = {
    'database_backup': [
      'Connection timeout to backup server',
      'Insufficient disk space',
      'Database lock acquisition failed',
    ],
    'cms_scheduled_publishing': [
      'Content validation failed',
      'Media asset not found',
      'Publish permission denied',
    ],
    'system_garbage_collection_task': [
      'Memory allocation error',
      'Process timeout exceeded',
      'Lock contention detected',
    ],
    'cache_generation_task': [
      'Redis connection failed',
      'Cache key collision',
      'Serialization error',
    ],
  };
  const taskErrors = errors[taskType] || ['Unknown error'];
  return taskErrors[Math.floor(Math.random() * taskErrors.length)];
}

export async function seedDispatcherHistory(prisma: PrismaClient) {
  // Check if we already have enough history
  const existingCount = await prisma.dispatcherTaskHistory.count();
  if (existingCount >= 100) {
    console.log(`  ⏭️  Dispatcher history: ${existingCount} records exist, skipping`);
    return;
  }

  console.log('  📋 Generating dispatcher task history...');

  const now = new Date();
  const allExecutions: any[] = [];

  // Generate data for last 7 days with varying activity
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(0, 0, 0, 0);

    // More activity on weekdays
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const countRange: [number, number] = isWeekend ? [10, 15] : [15, 25];

    const dayExecutions = generateDayExecutions(date, countRange);
    allExecutions.push(...dayExecutions);
  }

  // Sort by startedAt
  allExecutions.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  // Insert all records
  for (const execution of allExecutions) {
    await prisma.dispatcherTaskHistory.create({
      data: execution
    });
  }

  const successCount = allExecutions.filter(e => e.status === 'success').length;
  const failedCount = allExecutions.length - successCount;

  console.log(`  ✅ Created ${allExecutions.length} task history records`);
  console.log(`     - Success: ${successCount}, Failed: ${failedCount}`);
  console.log(`     - Success rate: ${Math.round((successCount / allExecutions.length) * 100)}%`);
}
