/**
 * Demo Data Extended Seed
 *
 * Loads extended demo data for realistic-looking installations.
 * This is separate from core demo data (003-demo-data.ts) and includes:
 * - System logs (last 7 days)
 * - Auth history (last 30 days)
 * - Active sessions
 * - Demo tour scenarios for AI Agent
 *
 * Enable with: LOAD_EXTENDED_DEMO=true
 */

import { PrismaClient } from '../../../prisma/generated/client/index.js';
import { seedSystemLogs } from './system-logs.ts';
import { seedAuthHistory } from './auth-history.ts';
import { seedSessions } from './sessions.ts';
import { seedDispatcherHistory } from './dispatcher-history.ts';
import { seedDemoScenarios } from './demo-scenarios.ts';
import { seedNewsletterData } from './newsletter.ts';

export async function seedExtendedDemo(prisma: PrismaClient) {
  console.log('');
  console.log('🎭 Loading extended demo data...');
  console.log('');

  // System Logs
  await seedSystemLogs(prisma);

  // Auth History
  await seedAuthHistory(prisma);

  // Active Sessions
  await seedSessions(prisma);

  // Dispatcher Task History
  await seedDispatcherHistory(prisma);

  // AI Agent Demo Scenarios
  await seedDemoScenarios(prisma);

  // Newsletter Data
  await seedNewsletterData(prisma);

  console.log('');
  console.log('✅ Extended demo data loaded');
}
