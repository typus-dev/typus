import { Request, Response } from 'express';
import { BaseController } from '@/core/base/BaseController.js';
import { LogService } from '../services/LogService.js';
import { LokiService } from '../services/LokiService.js';
import { inject } from 'tsyringe';
import { Controller } from '@/core/decorators/component.js';
import { BatchLogRequest, FrontendLogRequest } from '@/types/log.js';

/**
 * Controller for log operations
 */
@Controller({ path: 'logs' })
export class LogController extends BaseController {
    constructor(
        @inject(LogService) private logService: LogService,
        @inject(LokiService) private lokiService: LokiService
    ) {
        super();
    }

    /**
     * Create logs from frontend
     * Handles batch log creation
     */
    async createLogs(req: Request, res: Response) {
        const { logs } = req.body as BatchLogRequest;
        
        if (!Array.isArray(logs)) {
            return {
                error: {
                    message: 'Invalid logs format. Expected array.',
                    code: 'BAD_REQUEST',
                    status: 400
                }
            };
        }
        
        this.logger.info(`[LogController] Received ${logs.length} logs from frontend`);
        
        return await this.logService.createLogs(logs, req);
    }

    /**
     * Get logs for interface
     * Supports filtering and pagination
     */
    async getLogs(req: Request, res: Response) {
        const {
            page = 1,
            limit = 50,
            level,
            source,
            module,
            startDate,
            endDate,
            search
        } = req.query;

        this.logger.info(`[LogController] Retrieving logs with filters`, {
            page,
            limit,
            level,
            source,
            module,
            startDate,
            endDate,
            search
        });

        return await this.logService.getLogs({
            page: Number(page),
            limit: Number(limit),
            level: level as string,
            source: source as string,
            module: module as string,
            startDate: startDate as string,
            endDate: endDate as string,
            search: search as string
        });
    }

    /**
     * Get all container logs
     */
    async getContainerLogs(req: Request, res: Response) {
        const {
            limit = 100,
            timeRange = '1h',
            level
        } = req.query;

        this.logger.info(`[LogController] Retrieving container logs`, {
            limit,
            timeRange,
            level
        });

        try {
            const logs = await this.lokiService.getAllContainerLogs({
                limit: Number(limit),
                timeRange: timeRange as string,
                level: level as string
            });

            return {
                data: {
                    logs,
                    count: logs.length,
                    source: 'containers'
                }
            };
        } catch (error) {
            this.logger.error('[LogController] Error retrieving container logs:', { error });
            return {
                error: {
                    message: 'Failed to retrieve container logs',
                    code: 'CONTAINER_LOGS_ERROR',
                    status: 500
                }
            };
        }
    }

    /**
     * Get logs for specific container
     */
    async getContainerLogsByName(req: Request, res: Response) {
        const { containerName } = req.params;
        const {
            limit = 100,
            timeRange = '1h',
            level
        } = req.query;

        this.logger.info(`[LogController] Retrieving logs for container: ${containerName}`, {
            limit,
            timeRange,
            level
        });

        try {
            const logs = await this.lokiService.getContainerLogs(containerName, {
                limit: Number(limit),
                timeRange: timeRange as string,
                level: level as string
            });

            return {
                data: {
                    logs,
                    count: logs.length,
                    container: containerName,
                    source: 'containers'
                }
            };
        } catch (error) {
            this.logger.error(`[LogController] Error retrieving logs for container ${containerName}:`, { error });
            return {
                error: {
                    message: `Failed to retrieve logs for container ${containerName}`,
                    code: 'CONTAINER_LOGS_ERROR',
                    status: 500
                }
            };
        }
    }

    /**
     * Search container logs
     */
    async searchContainerLogs(req: Request, res: Response) {
        const {
            q,
            containers,
            limit = 100,
            timeRange = '1h'
        } = req.query;

        if (!q) {
            return {
                error: {
                    message: 'Search query is required',
                    code: 'BAD_REQUEST',
                    status: 400
                }
            };
        }

        this.logger.info(`[LogController] Searching container logs`, {
            query: q,
            containers,
            limit,
            timeRange
        });

        try {
            const containerList = containers ? (containers as string).split(',') : undefined;
            
            const logs = await this.lokiService.searchLogs(q as string, {
                containers: containerList,
                limit: Number(limit),
                timeRange: timeRange as string
            });

            return {
                data: {
                    logs,
                    count: logs.length,
                    query: q,
                    containers: containerList,
                    source: 'containers'
                }
            };
        } catch (error) {
            this.logger.error('[LogController] Error searching container logs:', { error });
            return {
                error: {
                    message: 'Failed to search container logs',
                    code: 'CONTAINER_LOGS_SEARCH_ERROR',
                    status: 500
                }
            };
        }
    }
}
