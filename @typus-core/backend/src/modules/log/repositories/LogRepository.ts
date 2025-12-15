import { Repository } from '@/core/decorators/component.js';
import { CoreBase } from '@/core/base/CoreBase.js';
import type { LogEntry } from '@/types/log.js';

/**
 * Repository for log operations
 */
@Repository()
export class LogRepository extends CoreBase {
    constructor() {
        super();
    }

    /**
     * Create multiple log entries
     * Process in batches for efficiency
     */
    async createMany(logs: LogEntry[]) {
        try {
            // Process logs in batches to avoid large transactions
            const batchSize = 100;
            
            for (let i = 0; i < logs.length; i += batchSize) {
                const batch = logs.slice(i, i + batchSize);
                
                await global.prisma.$transaction(
                    batch.map(log => 
                        global.prisma.systemLog.create({ // Corrected model name
                            data: {
                                timestamp: new Date(log.timestamp),
                                level: log.level,
                                source: log.source || 'frontend',
                                component: log.component || 'unknown',
                                module: log.module || 'frontend',
                                message: log.message,
                                metadata: log.metadata || {},
                                contextId: log.context_id, // Corrected field name
                                userId: log.user_id,       // Corrected field name
                                ipAddress: log.ip_address,   // Corrected field name
                                requestPath: log.request_path, // Corrected field name
                                requestMethod: log.request_method, // Corrected field name
                                executionTime: log.execution_time // Corrected field name
                            }
                        })
                    )
                );
            }
            
            return { success: true };
        } catch (error) {
            this.logger.error('[LogRepository] Error creating logs:', { error });
            throw error;
        }
    }

    /**
     * Find logs with filtering and pagination
     */
    async findMany(filters: {
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
            const { page, limit, level, source, module, startDate, endDate, search } = filters;
            
            // Build where clause
            const where: any = {};
            
            if (level) {
                where.level = level;
            }
            
            if (source) {
                where.source = source;
            }
            
            if (module) {
                where.module = module;
            }
            
            if (startDate || endDate) {
                where.timestamp = {};
                if (startDate) {
                    where.timestamp.gte = new Date(startDate);
                }
                if (endDate) {
                    where.timestamp.lte = new Date(endDate);
                }
            }
            
            if (search) {
                where.message = {
                    contains: search
                };
            }
            
            // Calculate pagination
            const skip = (page - 1) * limit;
            
            // Get total count
            const total = await global.prisma.systemLog.count({ where });
            
            // Get logs
            const logs = await global.prisma.systemLog.findMany({
                where,
                orderBy: {
                    timestamp: 'desc'
                },
                skip,
                take: limit
            });
            
            return {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            this.logger.error('[LogRepository] Error finding logs:', { error });
            throw error;
        }
    }
}
