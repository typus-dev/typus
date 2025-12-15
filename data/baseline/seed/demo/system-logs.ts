/**
 * Demo System Logs Seed
 *
 * Creates realistic system log entries for demo purposes.
 * Generates logs for the last 7 days with various levels and modules.
 */

import { PrismaClient } from '../../../prisma/generated/client/index.js';

// Helper to generate random date within last N days
function randomDate(daysBack: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

// Helper to generate UUID-like context ID
function generateContextId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Demo log templates
const logTemplates = [
  // Auth module
  { level: 'info', source: 'backend', module: 'auth', component: 'AuthService', message: 'User logged in successfully', hasUser: true },
  { level: 'info', source: 'backend', module: 'auth', component: 'AuthService', message: 'User logged out', hasUser: true },
  { level: 'warn', source: 'backend', module: 'auth', component: 'AuthService', message: 'Failed login attempt - invalid password', hasUser: false },
  { level: 'warn', source: 'backend', module: 'auth', component: 'AuthService', message: 'Failed login attempt - user not found', hasUser: false },
  { level: 'info', source: 'backend', module: 'auth', component: 'TokenService', message: 'Access token refreshed', hasUser: true },
  { level: 'warn', source: 'backend', module: 'auth', component: 'TokenService', message: 'Refresh token expired', hasUser: true },

  // CMS module
  { level: 'info', source: 'backend', module: 'cms', component: 'CmsService', message: 'Content item created', hasUser: true },
  { level: 'info', source: 'backend', module: 'cms', component: 'CmsService', message: 'Content item updated', hasUser: true },
  { level: 'info', source: 'backend', module: 'cms', component: 'CmsService', message: 'Content item published', hasUser: true },
  { level: 'debug', source: 'backend', module: 'cms', component: 'CacheService', message: 'Page cache invalidated', hasUser: false },

  // System module
  { level: 'info', source: 'backend', module: 'system', component: 'ConfigService', message: 'Configuration updated', hasUser: true },
  { level: 'info', source: 'backend', module: 'system', component: 'Application', message: 'Server started successfully', hasUser: false },
  { level: 'debug', source: 'backend', module: 'system', component: 'HealthCheck', message: 'Health check passed', hasUser: false },
  { level: 'warn', source: 'backend', module: 'system', component: 'MemoryMonitor', message: 'Memory usage above 70%', hasUser: false },

  // Queue module
  { level: 'info', source: 'backend', module: 'queue', component: 'TaskScheduler', message: 'Scheduled task executed: database_backup', hasUser: false },
  { level: 'info', source: 'backend', module: 'queue', component: 'TaskScheduler', message: 'Scheduled task executed: cms_scheduled_publishing', hasUser: false },
  { level: 'info', source: 'backend', module: 'queue', component: 'TaskWorker', message: 'Task completed successfully', hasUser: false },
  { level: 'error', source: 'backend', module: 'queue', component: 'TaskWorker', message: 'Task failed after 3 retries', hasUser: false },
  { level: 'warn', source: 'backend', module: 'queue', component: 'TaskWorker', message: 'Task retry scheduled', hasUser: false },

  // API requests
  { level: 'info', source: 'backend', module: 'http', component: 'RequestLogger', message: 'GET /api/health 200 5ms', hasUser: false },
  { level: 'info', source: 'backend', module: 'http', component: 'RequestLogger', message: 'POST /api/auth/login 200 120ms', hasUser: false },
  { level: 'info', source: 'backend', module: 'http', component: 'RequestLogger', message: 'GET /api/dsl 200 45ms', hasUser: true },
  { level: 'info', source: 'backend', module: 'http', component: 'RequestLogger', message: 'POST /api/dsl 200 89ms', hasUser: true },
  { level: 'warn', source: 'backend', module: 'http', component: 'RequestLogger', message: 'GET /api/unknown 404 12ms', hasUser: false },
  { level: 'error', source: 'backend', module: 'http', component: 'RequestLogger', message: 'POST /api/upload 500 234ms', hasUser: true },

  // Storage module
  { level: 'info', source: 'backend', module: 'storage', component: 'StorageService', message: 'File uploaded successfully', hasUser: true },
  { level: 'info', source: 'backend', module: 'storage', component: 'StorageService', message: 'File deleted', hasUser: true },
  { level: 'warn', source: 'backend', module: 'storage', component: 'StorageService', message: 'Storage quota warning: 80% used', hasUser: false },

  // Database
  { level: 'info', source: 'backend', module: 'database', component: 'PrismaClient', message: 'Database connection established', hasUser: false },
  { level: 'debug', source: 'backend', module: 'database', component: 'PrismaClient', message: 'Query executed in 15ms', hasUser: false },
  { level: 'warn', source: 'backend', module: 'database', component: 'PrismaClient', message: 'Slow query detected: 1200ms', hasUser: false },

  // Frontend logs
  { level: 'info', source: 'frontend', module: 'app', component: 'Router', message: 'Navigation to /dashboard', hasUser: true },
  { level: 'error', source: 'frontend', module: 'app', component: 'ErrorBoundary', message: 'Unhandled component error', hasUser: true },
  { level: 'warn', source: 'frontend', module: 'api', component: 'ApiClient', message: 'Request timeout after 30s', hasUser: true },
];

// Demo IP addresses
const demoIPs = [
  '192.168.1.100',
  '10.0.0.50',
  '172.16.0.25',
  '203.0.113.42',
  '198.51.100.88',
  '192.0.2.100',
];

// Demo request paths
const demoPaths = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/dsl',
  '/api/health',
  '/api/config',
  '/dashboard',
  '/content',
  '/settings',
];

// Demo user IDs (matches demo users from 003-demo-data.ts)
const demoUserIds = [1, 2, 3, 4, 5];

export async function seedSystemLogs(prisma: PrismaClient) {
  console.log('    📝 Creating demo system logs...');

  // Check if logs already exist
  const existingCount = await prisma.systemLog.count();
  if (existingCount > 50) {
    console.log(`       ⏭️  Skipping - ${existingCount} logs already exist`);
    return;
  }

  const logs: any[] = [];
  const daysBack = 7;
  const logsPerDay = 50; // ~350 logs total

  for (let day = 0; day < daysBack; day++) {
    for (let i = 0; i < logsPerDay; i++) {
      const template = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      const timestamp = randomDate(day + 1);

      // Weight towards more recent days
      if (day > 3 && Math.random() > 0.7) continue;

      // Weight log levels: mostly info, some warn, few errors
      let level = template.level;
      const levelRoll = Math.random();
      if (levelRoll > 0.95) level = 'error';
      else if (levelRoll > 0.85) level = 'warn';
      else if (levelRoll > 0.7) level = 'debug';
      else level = 'info';

      const log = {
        timestamp,
        level,
        source: template.source,
        module: template.module,
        component: template.component,
        message: template.message,
        metadata: {},
        contextId: generateContextId(),
        userId: template.hasUser ? String(demoUserIds[Math.floor(Math.random() * demoUserIds.length)]) : null,
        ipAddress: demoIPs[Math.floor(Math.random() * demoIPs.length)],
        requestPath: demoPaths[Math.floor(Math.random() * demoPaths.length)],
        requestMethod: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
        executionTime: Math.floor(Math.random() * 500) + 5,
        createdAt: timestamp,
      };

      logs.push(log);
    }
  }

  // Sort by timestamp descending
  logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Insert in batches
  const batchSize = 50;
  let created = 0;

  for (let i = 0; i < logs.length; i += batchSize) {
    const batch = logs.slice(i, i + batchSize);
    await prisma.systemLog.createMany({
      data: batch,
      skipDuplicates: true,
    });
    created += batch.length;
  }

  console.log(`       ✅ Created ${created} demo log entries`);
}
