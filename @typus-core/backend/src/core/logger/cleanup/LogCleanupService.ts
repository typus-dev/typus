import { Logger } from '../../../core/logger/Logger';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Service for cleaning up old log entries
 */
export class LogCleanupService {
  private readonly maxLogs: number;
  private readonly logger: Logger;
  private static isRunning = false;
  
  /**
   * Creates a new LogCleanupService
   * @param maxLogs Maximum number of logs to keep
   * @param prisma The Prisma client instance
   */
constructor(maxLogs: number = 10000, private readonly prisma: InstanceType<typeof PrismaClient>) {
    this.maxLogs = maxLogs;
    this.logger = new Logger();
  }

  /**
   * Cleans up old logs, keeping only the most recent ones
   * Deletes logs older than the threshold in a single operation
   */
  async cleanup(): Promise<void> {
    // Prevent concurrent cleanup operations
    if (LogCleanupService.isRunning) {
      this.logger.info('[LogCleanupService] Cleanup already in progress, skipping');
      return;
    }

    LogCleanupService.isRunning = true;

    try {
      // Count total logs
      const count = await this.prisma.systemLog.count(); // Use the passed prisma instance

      if (count <= this.maxLogs) {
        this.logger.info(`[LogCleanupService] No cleanup needed (${count} logs < ${this.maxLogs} max)`);
        return;
      }
      
      // Calculate how many logs to delete
      const deleteCount = count - this.maxLogs;
      
      this.logger.info(`[LogCleanupService] Starting cleanup of ${deleteCount} logs (${count} total, keeping ${this.maxLogs})`);
      
      // Find the ID threshold - we'll delete everything older than this
      const oldestLogsToKeep = await this.prisma.systemLog.findMany({ // Use the passed prisma instance
        select: { id: true },
        orderBy: { id: 'desc' },
        skip: this.maxLogs - 1,
        take: 1
      });

      if (oldestLogsToKeep.length === 0) {
        this.logger.info('[LogCleanupService] Could not determine threshold ID, skipping cleanup');
        return;
      }

      const thresholdId = oldestLogsToKeep[0].id;

      // Variable to track deleted logs
      let totalDeleted = 0;

      // Delete logs in one operation
      const result = await this.prisma.systemLog.deleteMany({ // Use the passed prisma instance
        where: {
          id: { lt: thresholdId }
        }
      });

      totalDeleted = result.count;

      // Also delete associated error records that might be orphaned
      await this.prisma.systemError.deleteMany({ // Use the passed prisma instance
        where: {
          logId: { // Use logId instead of log
            lt: thresholdId
          }
        }
      });

      this.logger.info(`[LogCleanupService] Cleanup completed: deleted ${totalDeleted} logs`);

    } catch (error) {
      this.logger.error('[LogCleanupService] Error during log cleanup', { error });
    } finally {
      LogCleanupService.isRunning = false;
    }
  }
}
