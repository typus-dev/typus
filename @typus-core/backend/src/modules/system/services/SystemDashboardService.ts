import { Service } from '@/core/decorators/component.js';
import { BaseService } from '@/core/base/BaseService.js';
import { inject } from 'tsyringe';
import { QueueService } from '@/core/queue/QueueService.js';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

// Dashboard data interfaces
export interface ApplicationInfo {
  version: string;
  buildNumber: number;
  buildDate: string;
  releaseId: string;
  projectName: string;
  uptime: number; // seconds
  uptimeFormatted: string;
  nodeVersion: string;
  queueDriver: string;
  cacheDriver: string;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  osRelease: string;
  arch: string;
  cpuCores: number;
  cpuModel: string;
  memoryTotal: number;
  memoryFree: number;
  memoryUsed: number;
  memoryUsedPercent: number;
  loadAverage: number[];
}

export interface DatabaseStats {
  sizeBytes: number;
  sizeFormatted: string;
  tableCount: number;
  recordCounts: { table: string; count: number }[];
}

export interface StorageStats {
  database: { bytes: number; formatted: string };
  uploads: { bytes: number; formatted: string };
  cache: { bytes: number; formatted: string };
  logs: { bytes: number; formatted: string };
  total: { bytes: number; formatted: string };
}

export interface ModuleInfo {
  name: string;
  type: 'core' | 'plugin';
  status: 'active' | 'inactive';
}

export interface QueueStats {
  name: string;
  pending: number;
  running: number;
  failed: number;
  completed: number;
}

export interface SessionStats {
  active: number;
  total: number;
}

export interface SystemDashboard {
  application: ApplicationInfo;
  system: SystemInfo;
  database: DatabaseStats;
  storage: StorageStats;
  modules: ModuleInfo[];
  queues: QueueStats[];
  sessions: SessionStats;
  timestamp: string;
}

export interface QuickStats {
  version: string;
  uptime: string;
  memoryPercent: number;
  activeSessions: number;
  pendingTasks: number;
}

@Service()
export class SystemDashboardService extends BaseService {
  private startTime: Date;
  private manifestCache: any = null;

  constructor(
    @inject(QueueService) private queueService: QueueService
  ) {
    super();
    this.startTime = new Date();
  }

  /**
   * Check if running in demo mode (hides real server info)
   */
  private isDemoMode(): boolean {
    return process.env.DEMO_MODE === 'true';
  }

  /**
   * Get mock system info for demo mode
   */
  private getMockSystemInfo(): SystemInfo {
    return {
      hostname: 'demo-server',
      platform: 'linux',
      osRelease: '6.1.0-generic',
      arch: 'x64',
      cpuCores: 4,
      cpuModel: 'Intel Xeon E5-2680 v4',
      memoryTotal: 8 * 1024 * 1024 * 1024, // 8 GB
      memoryFree: 3.2 * 1024 * 1024 * 1024,
      memoryUsed: 4.8 * 1024 * 1024 * 1024,
      memoryUsedPercent: 60,
      loadAverage: [0.45, 0.52, 0.48]
    };
  }

  /**
   * Get mock storage stats for demo mode
   */
  private getMockStorageStats(): StorageStats {
    return {
      database: { bytes: 156 * 1024 * 1024, formatted: '156 MB' },
      uploads: { bytes: 89 * 1024 * 1024, formatted: '89 MB' },
      cache: { bytes: 12 * 1024 * 1024, formatted: '12 MB' },
      logs: { bytes: 34 * 1024 * 1024, formatted: '34 MB' },
      total: { bytes: 291 * 1024 * 1024, formatted: '291 MB' }
    };
  }

  /**
   * Get full system dashboard data
   */
  async getDashboard(): Promise<SystemDashboard> {
    const [
      application,
      system,
      database,
      storage,
      modules,
      queues,
      sessions
    ] = await Promise.all([
      this.getApplicationInfo(),
      this.getSystemInfo(),
      this.getDatabaseStats(),
      this.getStorageStats(),
      this.getModulesInfo(),
      this.getQueuesStatus(),
      this.getSessionsInfo()
    ]);

    return {
      application,
      system,
      database,
      storage,
      modules,
      queues,
      sessions,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get quick stats for header widget
   */
  async getQuickStats(): Promise<QuickStats> {
    const manifest = this.getManifest();
    const memInfo = this.getMemoryInfo();
    const sessions = await this.getSessionsInfo();
    const queues = await this.getQueuesStatus();

    const pendingTasks = queues.reduce((sum, q) => sum + q.pending, 0);

    return {
      version: manifest.version || 'unknown',
      uptime: this.formatUptime(this.getUptimeSeconds()),
      memoryPercent: memInfo.usedPercent,
      activeSessions: sessions.active,
      pendingTasks
    };
  }

  /**
   * Get application info from manifest and runtime
   */
  async getApplicationInfo(): Promise<ApplicationInfo> {
    const manifest = this.getManifest();
    const uptimeSeconds = this.getUptimeSeconds();

    return {
      version: manifest.version || 'unknown',
      buildNumber: manifest.build_number || 0,
      buildDate: manifest.build_date || 'unknown',
      releaseId: manifest.release_id || 'unknown',
      projectName: manifest.project_name || 'typus-lite',
      uptime: uptimeSeconds,
      uptimeFormatted: this.formatUptime(uptimeSeconds),
      nodeVersion: process.version,
      queueDriver: global.runtimeConfig?.queueDriver || 'database',
      cacheDriver: global.runtimeConfig?.cacheDriver || 'database'
    };
  }

  /**
   * Get system info using Node.js os module
   */
  getSystemInfo(): SystemInfo {
    // Return mock data in demo mode
    if (this.isDemoMode()) {
      return this.getMockSystemInfo();
    }

    const cpus = os.cpus();
    const memInfo = this.getMemoryInfo();

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      osRelease: os.release(),
      arch: os.arch(),
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model || 'unknown',
      memoryTotal: memInfo.total,
      memoryFree: memInfo.free,
      memoryUsed: memInfo.used,
      memoryUsedPercent: memInfo.usedPercent,
      loadAverage: os.loadavg()
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      // Get database size
      const sizeResult = await this.prisma.$queryRaw<{ size: bigint }[]>`
        SELECT SUM(data_length + index_length) as size
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `;
      const sizeBytes = Number(sizeResult[0]?.size || 0);

      // Get table count
      const tablesResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `;
      const tableCount = Number(tablesResult[0]?.count || 0);

      // Get record counts for key tables
      const recordCounts = await this.getRecordCounts();

      return {
        sizeBytes,
        sizeFormatted: this.formatBytes(sizeBytes),
        tableCount,
        recordCounts
      };
    } catch (error) {
      this.logger.error('[SystemDashboard] Error getting database stats:', error);
      return {
        sizeBytes: 0,
        sizeFormatted: '0 B',
        tableCount: 0,
        recordCounts: []
      };
    }
  }

  /**
   * Get storage folder sizes
   */
  async getStorageStats(): Promise<StorageStats> {
    // Return mock data in demo mode
    if (this.isDemoMode()) {
      return this.getMockStorageStats();
    }

    const storagePath = process.env.STORAGE_PATH || '/app/storage';

    // Get database size
    let dbSize = 0;
    try {
      const sizeResult = await this.prisma.$queryRaw<{ size: bigint }[]>`
        SELECT SUM(data_length + index_length) as size
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `;
      dbSize = Number(sizeResult[0]?.size || 0);
    } catch (error) {
      this.logger.debug('[SystemDashboard] Could not get DB size');
    }

    const uploads = await this.getFolderSize(path.join(storagePath, 'uploads'));
    const cache = await this.getFolderSize(path.join(storagePath, 'cache'));
    const logs = await this.getLogsFolderSize();

    const total = dbSize + uploads + cache + logs;

    return {
      database: { bytes: dbSize, formatted: this.formatBytes(dbSize) },
      uploads: { bytes: uploads, formatted: this.formatBytes(uploads) },
      cache: { bytes: cache, formatted: this.formatBytes(cache) },
      logs: { bytes: logs, formatted: this.formatBytes(logs) },
      total: { bytes: total, formatted: this.formatBytes(total) }
    };
  }

  /**
   * Get loaded modules and plugins info
   */
  async getModulesInfo(): Promise<ModuleInfo[]> {
    const modules: ModuleInfo[] = [];

    // Core modules (hardcoded list for LITE)
    const coreModules = [
      'auth', 'user', 'role', 'cms', 'dispatcher',
      'storage', 'notification', 'system', 'log', 'email'
    ];

    for (const name of coreModules) {
      modules.push({
        name,
        type: 'core',
        status: 'active'
      });
    }

    // Scan for plugins
    const pluginsPath = '/app/plugins';
    try {
      if (fs.existsSync(pluginsPath)) {
        const pluginDirs = fs.readdirSync(pluginsPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);

        for (const name of pluginDirs) {
          modules.push({
            name,
            type: 'plugin',
            status: 'active'
          });
        }
      }
    } catch (error) {
      this.logger.debug('[SystemDashboard] No plugins directory found');
    }

    return modules;
  }

  /**
   * Get queue statistics
   */
  async getQueuesStatus(): Promise<QueueStats[]> {
    try {
      const queues = await this.queueService.listQueues();

      return queues.map(q => ({
        name: q.name,
        pending: q.pending || 0,
        running: q.running || 0,
        failed: q.failed || 0,
        completed: q.completed || 0
      }));
    } catch (error) {
      this.logger.error('[SystemDashboard] Error getting queue stats:', error);
      return [];
    }
  }

  /**
   * Get session statistics
   */
  async getSessionsInfo(): Promise<SessionStats> {
    try {
      const now = new Date();

      const [active, total] = await Promise.all([
        this.prisma.authRefreshToken.count({
          where: { expiresAt: { gt: now } }
        }),
        this.prisma.authRefreshToken.count()
      ]);

      return { active, total };
    } catch (error) {
      this.logger.error('[SystemDashboard] Error getting session stats:', error);
      return { active: 0, total: 0 };
    }
  }

  // ==================== HELPER METHODS ====================

  private getManifest(): any {
    if (this.manifestCache) {
      return this.manifestCache;
    }

    try {
      const manifestPath = '/app/typus-manifest.json';
      if (fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        this.manifestCache = JSON.parse(content);
        return this.manifestCache;
      }
    } catch (error) {
      this.logger.error('[SystemDashboard] Error reading manifest:', error);
    }

    return {};
  }

  private getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  private getMemoryInfo() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const usedPercent = Math.round((used / total) * 100);

    return { total, free, used, usedPercent };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

    return parts.join(' ');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async getFolderSize(folderPath: string): Promise<number> {
    try {
      if (!fs.existsSync(folderPath)) {
        return 0;
      }

      let totalSize = 0;
      const files = fs.readdirSync(folderPath, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(folderPath, file.name);
        if (file.isDirectory()) {
          totalSize += await this.getFolderSize(filePath);
        } else {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  private async getLogsFolderSize(): Promise<number> {
    // Try multiple possible log locations
    const logPaths = [
      '/app/logs',
      '/var/log/supervisor',
      '/var/log/nginx'
    ];

    let totalSize = 0;
    for (const logPath of logPaths) {
      totalSize += await this.getFolderSize(logPath);
    }

    return totalSize;
  }

  private async getRecordCounts(): Promise<{ table: string; count: number }[]> {
    const tables = [
      { name: 'Users', model: 'authUser' },
      { name: 'Logs', model: 'systemLog' },
      { name: 'Auth History', model: 'authHistory' },
      { name: 'Sessions', model: 'authRefreshToken' },
      { name: 'Tasks', model: 'dispatcherTask' },
      { name: 'Task History', model: 'dispatcherTaskHistory' },
      { name: 'CMS Items', model: 'cmsItem' },
      { name: 'Errors', model: 'systemError' }
    ];

    const counts: { table: string; count: number }[] = [];

    for (const { name, model } of tables) {
      try {
        const count = await (this.prisma as any)[model].count();
        counts.push({ table: name, count });
      } catch {
        // Table might not exist in LITE mode
      }
    }

    return counts;
  }
}
