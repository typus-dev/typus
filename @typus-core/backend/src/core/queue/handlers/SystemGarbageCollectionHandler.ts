import { Service, inject } from '@/core/decorators/component';
import { BaseTaskHandler } from './BaseTaskHandler';
import { TaskSchema } from '../interfaces';
import { FileSystemService } from '@/modules/storage/services/FileSystemService';

interface GCTargets {
  storage?: {
    enabled: boolean;
    daysThreshold: number;
    batchSize: number;
    cleanDeleted: boolean;
    cleanExpired: boolean;
  };
  taskHistory?: {
    enabled: boolean;
    keepLast?: number;
    keepDays?: number;
    excludeStatuses?: string[];
    batchSize: number;
  };
  systemLogs?: {
    enabled: boolean;
    keepDays: number;
    keepErrorsDays?: number;
    batchSize: number;
  };
  sessions?: {
    enabled: boolean;
    keepDays: number;
  };
}

interface GCStats {
  storage: {
    deletedFiles: number;
    expiredFiles: number;
    freedSpace: number;
    errors: number;
  };
  taskHistory: {
    deletedRecords: number;
    errors: number;
  };
  systemLogs: {
    deletedRecords: number;
    errors: number;
  };
  sessions: {
    deletedRecords: number;
    errors: number;
  };
  totalDuration: number;
}

/**
 * System Garbage Collection Handler
 * Universal task for cleaning up system garbage (files, history, logs, sessions)
 */
@Service()
export class SystemGarbageCollectionHandler extends BaseTaskHandler {
  constructor(
    @inject(FileSystemService) private fileSystemService: FileSystemService
  ) {
    super();
  }

  getSchema(): TaskSchema {
    return {
      type: 'system_garbage_collection_task',
      fields: ['targets', 'dryRun'],
      validate: (data) => {
        if (!data.targets) {
          throw new Error('targets configuration is required');
        }

        // At least one target must be enabled
        const hasEnabled = Object.values(data.targets).some(
          (target: any) => target?.enabled === true
        );

        if (!hasEnabled) {
          throw new Error('At least one cleanup target must be enabled');
        }
      }
    };
  }

  private normalize(data: any): any {
    return {
      targets: {
        storage: {
          enabled: data.targets?.storage?.enabled || false,
          daysThreshold: data.targets?.storage?.daysThreshold ?? 30,
          batchSize: data.targets?.storage?.batchSize ?? 100,
          cleanDeleted: data.targets?.storage?.cleanDeleted ?? true,
          cleanExpired: data.targets?.storage?.cleanExpired ?? true
        },
        taskHistory: {
          enabled: data.targets?.taskHistory?.enabled || false,
          keepLast: data.targets?.taskHistory?.keepLast ?? 1000,
          keepDays: data.targets?.taskHistory?.keepDays,
          excludeStatuses: data.targets?.taskHistory?.excludeStatuses || [],
          batchSize: data.targets?.taskHistory?.batchSize ?? 500
        },
        systemLogs: {
          enabled: data.targets?.systemLogs?.enabled || false,
          keepDays: data.targets?.systemLogs?.keepDays ?? 7,
          keepErrorsDays: data.targets?.systemLogs?.keepErrorsDays ?? 30,
          batchSize: data.targets?.systemLogs?.batchSize ?? 1000
        },
        sessions: {
          enabled: data.targets?.sessions?.enabled || false,
          keepDays: data.targets?.sessions?.keepDays ?? 7
        }
      },
      dryRun: data.dryRun || false
    };
  }

  async execute(data: any): Promise<GCStats> {
    const startTime = Date.now();
    const payload = this.normalize(data);
    await this.validate(payload);

    this.logger.info('[SystemGC] Starting system garbage collection', {
      targets: Object.keys(payload.targets).filter(k => payload.targets[k].enabled),
      dryRun: payload.dryRun
    });

    const stats: GCStats = {
      storage: {
        deletedFiles: 0,
        expiredFiles: 0,
        freedSpace: 0,
        errors: 0
      },
      taskHistory: {
        deletedRecords: 0,
        errors: 0
      },
      systemLogs: {
        deletedRecords: 0,
        errors: 0
      },
      sessions: {
        deletedRecords: 0,
        errors: 0
      },
      totalDuration: 0
    };

    // Execute each target independently (errors don't cascade)

    if (payload.targets.storage.enabled) {
      try {
        stats.storage = await this.cleanupStorage(payload.targets.storage, payload.dryRun);
      } catch (error) {
        this.logger.error('[SystemGC] Storage cleanup failed', {
          error: error instanceof Error ? error.message : String(error)
        });
        stats.storage.errors++;
      }
    }

    if (payload.targets.taskHistory.enabled) {
      try {
        stats.taskHistory = await this.cleanupTaskHistory(payload.targets.taskHistory, payload.dryRun);
      } catch (error) {
        this.logger.error('[SystemGC] Task history cleanup failed', {
          error: error instanceof Error ? error.message : String(error)
        });
        stats.taskHistory.errors++;
      }
    }

    if (payload.targets.systemLogs.enabled) {
      try {
        stats.systemLogs = await this.cleanupSystemLogs(payload.targets.systemLogs, payload.dryRun);
      } catch (error) {
        this.logger.error('[SystemGC] System logs cleanup failed', {
          error: error instanceof Error ? error.message : String(error)
        });
        stats.systemLogs.errors++;
      }
    }

    if (payload.targets.sessions.enabled) {
      try {
        stats.sessions = await this.cleanupSessions(payload.targets.sessions, payload.dryRun);
      } catch (error) {
        this.logger.error('[SystemGC] Sessions cleanup failed', {
          error: error instanceof Error ? error.message : String(error)
        });
        stats.sessions.errors++;
      }
    }

    stats.totalDuration = Date.now() - startTime;

    this.logger.info('[SystemGC] System garbage collection completed', {
      stats,
      durationMs: stats.totalDuration
    });

    return stats;
  }

  /**
   * Clean up storage files (deleted + expired)
   */
  private async cleanupStorage(config: any, dryRun: boolean) {
    const stats = {
      deletedFiles: 0,
      expiredFiles: 0,
      freedSpace: 0,
      errors: 0
    };

    // Clean soft-deleted files
    if (config.cleanDeleted) {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - config.daysThreshold);

      this.logger.info('[SystemGC:Storage] Cleaning up deleted files', {
        thresholdDate: thresholdDate.toISOString(),
        daysThreshold: config.daysThreshold
      });

      // FIXED: Add pagination loop to process ALL deleted files, not just one batch
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore) {
        const deletedFiles = await this.prisma.storageFile.findMany({
          where: {
            status: 'DELETED',
            deletedAt: { lt: thresholdDate }
          },
          take: config.batchSize,
          select: {
            id: true,
            storagePath: true,
            size: true,
            originalName: true,
            deletedAt: true
          }
        });

        if (deletedFiles.length === 0) {
          hasMore = false;
          break;
        }

        this.logger.info(`[SystemGC:Storage] Processing batch of ${deletedFiles.length} deleted files (total so far: ${totalProcessed})`);

        for (const file of deletedFiles) {
          try {
            if (!dryRun) {
              // Try to delete physical file (might not exist - orphaned record)
              const physicalFileDeleted = await this.fileSystemService.deleteFile(file.storagePath);

              // Always delete from database (cleanup orphaned records)
              await this.prisma.storageFile.delete({
                where: { id: file.id }
              });

              stats.deletedFiles++;

              if (physicalFileDeleted) {
                // Physical file existed and was deleted
                stats.freedSpace += file.size;
                this.logger.debug('[SystemGC:Storage] Deleted file and record', {
                  id: file.id,
                  path: file.storagePath,
                  size: file.size
                });
              } else {
                // Physical file didn't exist, but cleaned up orphaned DB record
                this.logger.info('[SystemGC:Storage] Cleaned orphaned record (physical file not found)', {
                  id: file.id,
                  path: file.storagePath
                });
              }
            } else {
              // Dry run
              stats.deletedFiles++;
              stats.freedSpace += file.size;
              this.logger.info('[SystemGC:Storage] [DRY RUN] Would delete', {
                id: file.id,
                path: file.storagePath,
                size: file.size
              });
            }
          } catch (error) {
            this.logger.error('[SystemGC:Storage] Error cleaning up deleted file', {
              fileId: file.id,
              error: error instanceof Error ? error.message : String(error)
            });
            stats.errors++;
          }
        }

        totalProcessed += deletedFiles.length;

        // Continue if batch is full (there might be more files)
        hasMore = deletedFiles.length === config.batchSize;
      }

      this.logger.info(`[SystemGC:Storage] Finished cleaning deleted files - Total processed: ${totalProcessed}`);
    }

    // Clean expired files
    if (config.cleanExpired) {
      const now = new Date();

      this.logger.info('[SystemGC:Storage] Cleaning up expired files');

      const expiredFiles = await this.prisma.storageFile.findMany({
        where: {
          expiresAt: { lt: now },
          status: { not: 'DELETED' }
        },
        take: config.batchSize,
        select: {
          id: true,
          storagePath: true,
          size: true,
          originalName: true,
          expiresAt: true
        }
      });

      this.logger.info(`[SystemGC:Storage] Found ${expiredFiles.length} expired files to clean`);

      for (const file of expiredFiles) {
        try {
          if (!dryRun) {
            // Try to delete physical file (might not exist - orphaned record)
            const physicalFileDeleted = await this.fileSystemService.deleteFile(file.storagePath);

            // Always update database record to EXPIRED status
            await this.prisma.storageFile.update({
              where: { id: file.id },
              data: {
                status: 'EXPIRED',
                deletedAt: now
              }
            });

            stats.expiredFiles++;

            if (physicalFileDeleted) {
              // Physical file existed and was deleted
              stats.freedSpace += file.size;
              this.logger.debug('[SystemGC:Storage] Expired file cleaned', {
                id: file.id,
                path: file.storagePath,
                expiredAt: file.expiresAt
              });
            } else {
              // Physical file didn't exist, but updated orphaned DB record
              this.logger.info('[SystemGC:Storage] Cleaned orphaned expired file (physical file not found)', {
                id: file.id,
                path: file.storagePath
              });
            }
          } else {
            // Dry run
            stats.expiredFiles++;
            stats.freedSpace += file.size;
            this.logger.info('[SystemGC:Storage] [DRY RUN] Would expire', {
              id: file.id,
              path: file.storagePath,
              expiredAt: file.expiresAt
            });
          }
        } catch (error) {
          this.logger.error('[SystemGC:Storage] Error cleaning up expired file', {
            fileId: file.id,
            error: error instanceof Error ? error.message : String(error)
          });
          stats.errors++;
        }
      }
    }

    return stats;
  }

  /**
   * Clean up task history
   */
  private async cleanupTaskHistory(config: any, dryRun: boolean) {
    const stats = {
      deletedRecords: 0,
      errors: 0
    };

    try {
      let idsToDelete: number[] = [];

      // Strategy 1: Keep last N records
      if (config.keepLast) {
        this.logger.info('[SystemGC:TaskHistory] Keeping last N records', {
          keepLast: config.keepLast
        });

        // Get total count first
        const totalCount = await this.prisma.dispatcherTaskHistory.count({
          where: {
            status: { notIn: config.excludeStatuses }
          }
        });

        if (totalCount > config.keepLast) {
          // Get IDs to delete (all except last N)
          const toDelete = await this.prisma.dispatcherTaskHistory.findMany({
            where: {
              status: { notIn: config.excludeStatuses }
            },
            orderBy: { startedAt: 'desc' },
            skip: config.keepLast,
            take: config.batchSize,
            select: { id: true }
          });

          idsToDelete = toDelete.map(r => r.id);
        }
      }
      // Strategy 2: Keep last N days
      else if (config.keepDays) {
        this.logger.info('[SystemGC:TaskHistory] Keeping last N days', {
          keepDays: config.keepDays
        });

        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - config.keepDays);

        const toDelete = await this.prisma.dispatcherTaskHistory.findMany({
          where: {
            startedAt: { lt: thresholdDate },
            status: { notIn: config.excludeStatuses }
          },
          take: config.batchSize,
          select: { id: true }
        });

        idsToDelete = toDelete.map(r => r.id);
      }

      this.logger.info(`[SystemGC:TaskHistory] Found ${idsToDelete.length} task history records to delete`);

      if (idsToDelete.length > 0) {
        if (!dryRun) {
          const result = await this.prisma.dispatcherTaskHistory.deleteMany({
            where: {
              id: { in: idsToDelete }
            }
          });

          stats.deletedRecords = result.count;
          this.logger.info(`[SystemGC:TaskHistory] Deleted ${result.count} records`);
        } else {
          stats.deletedRecords = idsToDelete.length;
          this.logger.info('[SystemGC:TaskHistory] [DRY RUN] Would delete task history records', {
            count: idsToDelete.length
          });
        }
      }
    } catch (error) {
      this.logger.error('[SystemGC:TaskHistory] Task history cleanup error', {
        error: error instanceof Error ? error.message : String(error)
      });
      stats.errors++;
    }

    return stats;
  }

  /**
   * Clean up system logs
   */
  private async cleanupSystemLogs(config: any, dryRun: boolean) {
    const stats = {
      deletedRecords: 0,
      errors: 0
    };

    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - config.keepDays);

      const errorThresholdDate = new Date();
      errorThresholdDate.setDate(
        errorThresholdDate.getDate() - (config.keepErrorsDays || config.keepDays)
      );

      this.logger.info('[SystemGC:SystemLogs] Cleaning up system logs', {
        keepDays: config.keepDays,
        keepErrorsDays: config.keepErrorsDays
      });

      // Delete old non-error logs
      const oldLogs = await this.prisma.systemLog.findMany({
        where: {
          createdAt: { lt: thresholdDate },
          level: { notIn: ['error', 'fatal'] }
        },
        take: config.batchSize,
        select: { id: true }
      });

      // Delete old error logs (with longer retention)
      const oldErrorLogs = await this.prisma.systemLog.findMany({
        where: {
          createdAt: { lt: errorThresholdDate },
          level: { in: ['error', 'fatal'] }
        },
        take: config.batchSize,
        select: { id: true }
      });

      const allIdsToDelete = [
        ...oldLogs.map(l => l.id),
        ...oldErrorLogs.map(l => l.id)
      ];

      this.logger.info(`[SystemGC:SystemLogs] Found ${allIdsToDelete.length} system log records to delete`);

      if (allIdsToDelete.length > 0) {
        if (!dryRun) {
          const result = await this.prisma.systemLog.deleteMany({
            where: {
              id: { in: allIdsToDelete }
            }
          });

          stats.deletedRecords = result.count;
          this.logger.info(`[SystemGC:SystemLogs] Deleted ${result.count} log records`);
        } else {
          stats.deletedRecords = allIdsToDelete.length;
          this.logger.info('[SystemGC:SystemLogs] [DRY RUN] Would delete system logs', {
            count: allIdsToDelete.length
          });
        }
      }
    } catch (error) {
      this.logger.error('[SystemGC:SystemLogs] System logs cleanup error', {
        error: error instanceof Error ? error.message : String(error)
      });
      stats.errors++;
    }

    return stats;
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupSessions(config: any, dryRun: boolean) {
    const stats = {
      deletedRecords: 0,
      errors: 0
    };

    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - config.keepDays);

      this.logger.info('[SystemGC:Sessions] Cleaning up expired sessions', {
        keepDays: config.keepDays
      });

      const count = await this.prisma.systemSessionStorage.count({
        where: {
          updatedAt: { lt: thresholdDate }
        }
      });

      this.logger.info(`[SystemGC:Sessions] Found ${count} expired sessions to delete`);

      if (count > 0) {
        if (!dryRun) {
          const result = await this.prisma.systemSessionStorage.deleteMany({
            where: {
              updatedAt: { lt: thresholdDate }
            }
          });

          stats.deletedRecords = result.count;
          this.logger.info(`[SystemGC:Sessions] Deleted ${result.count} sessions`);
        } else {
          stats.deletedRecords = count;
          this.logger.info('[SystemGC:Sessions] [DRY RUN] Would delete sessions', { count });
        }
      }
    } catch (error) {
      this.logger.error('[SystemGC:Sessions] Sessions cleanup error', {
        error: error instanceof Error ? error.message : String(error)
      });
      stats.errors++;
    }

    return stats;
  }
}
