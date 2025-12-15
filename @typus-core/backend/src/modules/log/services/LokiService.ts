import { Service } from '@/core/decorators/component.js';
import { CoreBase } from '@/core/base/CoreBase.js';
import { inject } from 'tsyringe';
import { ConfigService } from '@/modules/system/services/ConfigService.js';

interface LokiQueryResponse {
    status: string;
    data: {
        resultType: string;
        result: Array<{
            stream: Record<string, string>;
            values: Array<[string, string]>;
        }>;
    };
}

interface ContainerLogEntry {
    timestamp: string;
    message: string;
    container: string;
    stream: string;
}

/**
 * Service for querying Loki container logs
 */
@Service()
export class LokiService extends CoreBase {
    private lokiUrl: string = '';
    private enabled: boolean = false;
    private initialized: boolean = false;

    constructor(@inject(ConfigService) private configService: ConfigService) {
        super();
        // Lazy initialization - will load config from database on first use
    }

    /**
     * Initialize Loki configuration from database
     */
    private async initializeLoki(): Promise<void> {
        if (this.initialized) {
            return;
        }

        // Priority: database → process.env → default
        const urlFromDb = await this.configService.get('logging.loki_url');
        this.lokiUrl = urlFromDb || process.env.LOKI_URL || 'http://loki:3100';

        const enabledFromDb = await this.configService.get('logging.loki_api_enabled');
        this.enabled = enabledFromDb === 'true' || enabledFromDb === true;

        this.logger.debug('[LokiService] Initialized:', {
            lokiUrl: this.lokiUrl,
            enabled: this.enabled,
            fromDatabase: urlFromDb !== undefined && enabledFromDb !== undefined
        });

        this.initialized = true;
    }

    /**
     * Query logs from Loki
     */
    async queryLogs(query: string, options: {
        limit?: number;
        start?: string;
        end?: string;
        direction?: 'forward' | 'backward';
    } = {}): Promise<ContainerLogEntry[]> {
        await this.initializeLoki();

        if (!this.enabled) {
            this.logger.warn('[LokiService] Loki API is disabled - configure via Settings → Logging → Loki API Enabled');
            return [];
        }

        try {
            const params = new URLSearchParams({
                query,
                limit: (options.limit || 100).toString(),
                direction: options.direction || 'backward'
            });

            if (options.start) params.append('start', options.start);
            if (options.end) params.append('end', options.end);

            const url = `${this.lokiUrl}/loki/api/v1/query_range?${params}`;
            
            this.logger.debug(`[LokiService] Querying Loki: ${url}`);

            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Loki API error: ${response.status} ${response.statusText}`);
            }

            const data: LokiQueryResponse = await response.json();
            
            return this.parseLokiResponse(data);
        } catch (error) {
            this.logger.error('[LokiService] Error querying Loki:', { error, query, options });
            throw error;
        }
    }

    /**
     * Get logs for all containers
     */
    async getAllContainerLogs(options: {
        limit?: number;
        timeRange?: string;
        level?: string;
    } = {}): Promise<ContainerLogEntry[]> {
        let query = '{job="docker"}';
        
        if (options.level) {
            query += ` |~ "(?i)${options.level}"`;
        }

        const queryOptions: any = {
            limit: options.limit || 100,
            direction: 'backward'
        };

        if (options.timeRange) {
            const now = new Date();
            const start = new Date(now.getTime() - this.parseTimeRange(options.timeRange));
            queryOptions.start = (start.getTime() * 1000000).toString(); // Loki expects nanoseconds
        }

        return this.queryLogs(query, queryOptions);
    }

    /**
     * Get logs for specific container
     */
    async getContainerLogs(containerName: string, options: {
        limit?: number;
        timeRange?: string;
        level?: string;
    } = {}): Promise<ContainerLogEntry[]> {
        let query = `{job="docker", container_name=~".*${containerName}.*"}`;
        
        if (options.level) {
            query += ` |~ "(?i)${options.level}"`;
        }

        const queryOptions: any = {
            limit: options.limit || 100,
            direction: 'backward'
        };

        if (options.timeRange) {
            const now = new Date();
            const start = new Date(now.getTime() - this.parseTimeRange(options.timeRange));
            queryOptions.start = (start.getTime() * 1000000).toString();
        }

        return this.queryLogs(query, queryOptions);
    }

    /**
     * Search logs across containers
     */
    async searchLogs(searchText: string, options: {
        containers?: string[];
        limit?: number;
        timeRange?: string;
    } = {}): Promise<ContainerLogEntry[]> {
        let query = '{job="docker"}';
        
        if (options.containers && options.containers.length > 0) {
            const containerPattern = options.containers.join('|');
            query = `{job="docker", container_name=~".*${containerPattern}.*"}`;
        }
        
        query += ` |~ "(?i)${this.escapeRegex(searchText)}"`;

        const queryOptions: any = {
            limit: options.limit || 100,
            direction: 'backward'
        };

        if (options.timeRange) {
            const now = new Date();
            const start = new Date(now.getTime() - this.parseTimeRange(options.timeRange));
            queryOptions.start = (start.getTime() * 1000000).toString();
        }

        return this.queryLogs(query, queryOptions);
    }

    /**
     * Parse Loki response to ContainerLogEntry array
     */
    private parseLokiResponse(response: LokiQueryResponse): ContainerLogEntry[] {
        const logs: ContainerLogEntry[] = [];

        if (response.data && response.data.result) {
            for (const stream of response.data.result) {
                const containerName = this.extractContainerName(stream.stream);
                const streamType = stream.stream.stream || 'stdout';

                for (const [timestampNs, message] of stream.values) {
                    logs.push({
                        timestamp: new Date(parseInt(timestampNs) / 1000000).toISOString(),
                        message: message.trim(),
                        container: containerName,
                        stream: streamType
                    });
                }
            }
        }

        // Sort by timestamp (newest first)
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return logs;
    }

    /**
     * Extract container name from stream labels
     */
    private extractContainerName(stream: Record<string, string>): string {
        if (stream.container_name) {
            return stream.container_name;
        }
        
        // Fallback to service label or filename
        return stream.service || stream.filename || 'unknown';
    }

    /**
     * Parse time range string to milliseconds
     */
    private parseTimeRange(timeRange: string): number {
        const match = timeRange.match(/^(\d+)([smhd])$/);
        if (!match) {
            return 3600000; // Default 1 hour
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return value * 1000;
            case 'm': return value * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'd': return value * 24 * 60 * 60 * 1000;
            default: return 3600000;
        }
    }

    /**
     * Escape regex special characters
     */
    private escapeRegex(text: string): string {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Check if Loki is available
     */
    async isAvailable(): Promise<boolean> {
        await this.initializeLoki();

        if (!this.enabled) {
            return false;
        }

        try {
            const response = await fetch(`${this.lokiUrl}/ready`, {
                method: 'GET',
                timeout: 5000
            } as any);
            return response.ok;
        } catch (error) {
            this.logger.warn('[LokiService] Loki not available:', { error });
            return false;
        }
    }
}
