import { LogCleanupService } from './LogCleanupService';
import prisma from '../../database/prisma.js';

// Get settings from environment variables
const MAX_LOGS = process.env.LOG_MAX_RECORDS
  ? parseInt(process.env.LOG_MAX_RECORDS) 
  : 10000;

const CLEANUP_INTERVAL_MINUTES = process.env.LOG_CLEANUP_INTERVAL_MINUTES 
  ? parseInt(process.env.LOG_CLEANUP_INTERVAL_MINUTES) 
  : 60;

const RUN_ON_START = process.env.LOG_CLEANUP_ON_START 
  ? process.env.LOG_CLEANUP_ON_START.toLowerCase() === 'true' 
  : true;

/**
 * Initialize log cleanup service with hourly runs
 * Uses environment variables for configuration:
 * - LOG_MAX_RECORDS: Maximum number of logs to keep (default: 10000)
 * - LOG_CLEANUP_INTERVAL_MINUTES: Cleanup interval in minutes (default: 60)
 * - LOG_CLEANUP_ON_START: Whether to run cleanup on start (default: true)
 */
export function initLogCleanup(): void {
  const cleanupService = new LogCleanupService(MAX_LOGS, prisma); // Pass prisma instance

  // Convert minutes to milliseconds
  const intervalMs = CLEANUP_INTERVAL_MINUTES * 60 * 1000;
  
  // Log configuration
  console.log(`[LogCleanup] Initialized with settings:
  - Max logs: ${MAX_LOGS}
  - Cleanup interval: ${CLEANUP_INTERVAL_MINUTES} minutes
  - Run on start: ${RUN_ON_START}`);
  
  // Set up recurring cleanup
  setInterval(async () => {
    console.log('[LogCleanup] Running scheduled cleanup');
    await cleanupService.cleanup();
  }, intervalMs);
  
  // Run cleanup on start if enabled
  if (RUN_ON_START) {
    // Delay initial cleanup to allow application to fully start
    setTimeout(async () => {
      console.log('[LogCleanup] Running initial cleanup on application start');
      await cleanupService.cleanup();
    }, 60000); // 1 minute delay
  }
}

export { LogCleanupService };
