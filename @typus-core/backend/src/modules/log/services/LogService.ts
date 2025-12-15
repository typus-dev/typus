import { Request } from 'express';
import { LogRepository } from '../repositories/LogRepository.js';
import { inject } from 'tsyringe';
import { Service } from '@/core/decorators/component.js';
import { CoreBase } from '@/core/base/CoreBase.js';
import type { LogEntry, LogSource, FrontendLogRequest } from '@/types/log.js';

/**
 * Service for handling log operations
 */
@Service()
export class LogService extends CoreBase {
    constructor(
        @inject(LogRepository) private logRepository: LogRepository
    ) {
        super();
    }

    /**
     * Create multiple log entries from frontend
     * Adds request context to logs
     */
    async createLogs(logs: FrontendLogRequest[], req: Request) {
        try {
            this.logger.info(`[LogService] Processing ${logs.length} logs from frontend`);
            
            // Extract request info
            const ip = req.ip || req.socket.remoteAddress || '';
            const userId = (req as any).user?.id;
            
            // Process each log entry
            const processedLogs = logs.map(log => ({
                ...log,
                timestamp: new Date(log.timestamp), // Convert string timestamp to Date
                source: 'frontend' as LogSource,
                ip_address: ip,
                user_id: userId,
                request_path: req.originalUrl,
                request_method: req.method
            }));
            
            const result = await this.logRepository.createMany(processedLogs);
            
            return { 
                data: { 
                    success: true,
                    count: logs.length
                } 
            };
        } catch (error) {
            this.logger.error('[LogService] Error creating logs:', { error });
            return { 
                error: {
                    message: 'Failed to process logs',
                    code: 'LOG_PROCESSING_ERROR',
                    status: 500
                }
            };
        }
    }

    /**
     * Get logs with filtering and pagination
     */
    async getLogs(filters: {
        page: number;
        limit: number;
        level?: string;
        source?: string;
        module?: string;
        startDate?: string;
        endDate?: string;
        search?: string;
    }) {
        try {
            this.logger.info(`[LogService] Retrieving logs with filters:`, filters);
            
            const result = await this.logRepository.findMany(filters);
            
            return { 
                data: result
            };
        } catch (error) {
            this.logger.error('[LogService] Error retrieving logs:', { error });
            return { 
                error: {
                    message: 'Failed to retrieve logs',
                    code: 'LOG_RETRIEVAL_ERROR',
                    status: 500
                }
            };
        }
    }
}
