import { Service, inject } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';
import { BadRequestError, NotFoundError } from '@/core/base/BaseError.js';
import { QueueService } from '@/core/queue/QueueService';
import { ConfigService } from '@/modules/system/services/ConfigService';
import { container } from 'tsyringe';
import https from 'https';
import http from 'http';

@Service()
export class DispatcherService extends BaseService {
  private queueService: QueueService;
  private configService: ConfigService;
  private readonly appName: string;

  constructor(
    @inject(QueueService) queueService: QueueService,
    @inject(ConfigService) configService: ConfigService
  ) {
    super();
    this.queueService = queueService;
    this.configService = configService;
    this.appName = process.env.APP_NAME;
  }

  /**
   * Get queue names from database (system.config - PRIVATE)
   */
  private async getQueueNames() {
    return {
      systemQueue: await this.configService.getFromDb('queue.redis_system', 'redis_system_queue'),
      notificationQueue: await this.configService.getFromDb('queue.redis_notification', 'redis_notification_queue'),
      cacheQueue: await this.configService.getFromDb('queue.redis_cache', 'redis_cache_queue'),
      emailQueue: await this.configService.getFromDb('queue.redis_email', 'redis_email_queue'),
      telegramQueue: await this.configService.getFromDb('queue.redis_telegram', 'redis_telegram_queue'),
      backupQueue: await this.configService.getFromDb('queue.redis_backup', 'redis_backup_queue')
    };
  }

  /**
   * Lazy resolve NotificationsService to avoid circular dependencies
   */
  private async getNotificationsService() {
    try {
      const { NotificationsService } = await import('@/modules/notification/services/NotificationsService');
      return container.resolve(NotificationsService);
    } catch (error) {
      this.logger.warn('Failed to resolve NotificationsService', { error });
      return null;
    }
  }

  async executeTask(taskId: string) {
    console.log('============ executeTask CALLED', taskId);
    this.logger.info(`!!! executeTask START`, { taskId });

    const task = await this.prisma.dispatcherTask.findUnique({
      where: { id: parseInt(taskId) }
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Get queue names from database
    const queues = await this.getQueueNames();

    // Determine queue name based on task type
    let queueName = queues.systemQueue;
    if (task.type === 'cache_generation_task') {
      queueName = queues.cacheQueue;
    } else if (task.type === 'email_notification_task') {
      queueName = queues.emailQueue;
    } else if (task.type === 'telegram_notification_task') {
      queueName = queues.telegramQueue;
    } else if (task.type === 'backup_task') {
      queueName = queues.backupQueue;
    }

    // Queue task using QueueService
    // IMPORTANT: task_id must be inside data, not in metadata
    // because DatabaseQueueAdapter only stores data in the JSON column
    const context = this.getContext();
    const userId = context?.get<string>('userId') ? parseInt(context.get<string>('userId')!) : undefined;
    await this.queueService.addTask(queueName, {
      type: task.type,
      name: task.name || `Task ${task.id}`,
      data: {
        ...task.data,  // Spread original task data
        task_id: task.id,  // Add task_id inside data
        manual: true,  // Flag that this was manually triggered
        manual_user_id: userId  // User who triggered the task
      },
      priority: 5 // manual tasks get higher priority
    });

    this.logger.info(`Task queued for execution: ${taskId} in queue: ${queueName}`, {
      taskId: task.id,
      taskType: task.type,
      taskName: task.name,
      queue: queueName
    });

    // Send notification to user
    this.logger.debug(`Checking notification sending`, { userId, hasUserId: !!userId });

    if (userId) {
      this.logger.info(`Attempting to send notification to user ${userId}`);
      try {
        const notificationsService = await this.getNotificationsService();
        this.logger.debug(`NotificationsService resolved`, { hasService: !!notificationsService });

        if (notificationsService) {
          this.logger.info(`Sending task_queued notification to user ${userId}`);
          await notificationsService.send(userId, 'task_queued', {
            title: 'Task Queued',
            message: `Task "${task.name}" has been queued for execution`,
            taskId: task.id,
            taskName: task.name,
            taskType: task.type,
            type: 'info'
          }, ['internal', 'realtime']);
          this.logger.info(`Notification sent successfully to user ${userId}`);
        } else {
          this.logger.warn(`NotificationsService is null, cannot send notification`);
        }
      } catch (error) {
        this.logger.error('Failed to send task queued notification', { error, userId, taskId });
      }
    } else {
      this.logger.warn(`No userId available, skipping notification`);
    }

    console.log('============ executeTask RETURNING');
    this.logger.info(`!!! executeTask END`, { taskId: task.id });

    return {
      success: true,
      message: 'Task queued for execution',
      taskId: task.id,
      taskName: task.name,
      queue: queueName
    };
  }

  private async processSitemapTask(task: any) {
    const { pages, baseUrl, priority = 'normal', force = false } = task.data;
    const sitemapPath = pages[0];

    this.logger.info('Processing sitemap task', {
      taskId: task.id,
      sitemapPath,
      baseUrl
    });

    // Fetch and parse sitemap
    const sitemapContent = await this.fetchSitemap(baseUrl, sitemapPath);
    const urls = this.parseSitemap(sitemapContent);

    this.logger.info('Sitemap parsed', {
      taskId: task.id,
      totalUrls: urls.length
    });

    // Get queue names from database
    const queues = await this.getQueueNames();

    // Create cache generation tasks for each URL
    let queuedCount = 0;
    for (const url of urls) {
      try {
        await this.queueService.addTask(queues.cacheQueue, {
          type: 'cache_generation_task',
          name: `Cache Generation: ${url}`,
          data: {
            action: 'generate',
            url: url,
            priority: priority,
            force: force
          },
          priority: priority === 'high' ? 8 : priority === 'low' ? 2 : 5,
          metadata: {
            source: 'sitemap_dispatcher',
            timestamp: Date.now()
          }
        });
        queuedCount++;
      } catch (error) {
        this.logger.error('Failed to queue cache task', {
          taskId: task.id,
          url,
          error: error.message
        });
      }
    }

    this.logger.info('Sitemap processing completed', {
      taskId: task.id,
      totalUrls: urls.length,
      queuedTasks: queuedCount
    });
  }

  private async fetchSitemap(baseUrl: string, sitemapPath: string): Promise<string> {
    let sitemapUrl: string;
    
    if (sitemapPath.startsWith('http')) {
      sitemapUrl = sitemapPath;
    } else {
      const base = new URL(baseUrl);
      sitemapUrl = `${base.protocol}//${base.host}/${sitemapPath.replace(/^\//, '')}`;
    }

    const response = await this.makeHttpRequest(sitemapUrl);
    
    if (response.statusCode !== 200) {
      throw new BadRequestError(`Failed to fetch sitemap: HTTP ${response.statusCode}`);
    }

    return response.data;
  }

  private parseSitemap(xmlContent: string): string[] {
    const urls: string[] = [];
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;

    while ((match = locRegex.exec(xmlContent)) !== null) {
      const url = match[1].trim();
      if (url) {
        try {
          const urlObj = new URL(url);
          urls.push(urlObj.pathname);
        } catch (error) {
          this.logger.warn('Invalid URL in sitemap:', url);
        }
      }
    }

    return urls;
  }

  private makeHttpRequest(url: string, method = 'GET'): Promise<{statusCode: number, data: string}> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        timeout: 30000
      };

      const req = httpModule.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        });
      });

      req.on('error', (error) => {
        reject(new BadRequestError(`HTTP request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new BadRequestError('Request timeout'));
      });

      req.end();
    });
  }

  async getQueueStatus() {
    try {
      // Get queue names from database
      const queues = await this.getQueueNames();

      // Use agnostic QueueService instead of Redis directly
      const systemQueueLength = await this.queueService.getQueueLength(queues.systemQueue);
      const notificationQueueLength = await this.queueService.getQueueLength(queues.notificationQueue);
      const cacheQueueLength = await this.queueService.getQueueLength(queues.cacheQueue);

      return {
        queues: {
          system: systemQueueLength,
          notifications: notificationQueueLength,
          cache: cacheQueueLength
        },
        queue_names: {
          system: queues.systemQueue,
          notifications: queues.notificationQueue,
          cache: queues.cacheQueue
        },
        driver: process.env.QUEUE_DRIVER || 'redis',
        connected: true
      };
    } catch (error) {
      this.logger.error('Failed to get queue status:', error);
      throw new BadRequestError('Failed to retrieve queue status');
    }
  }

  async getStats() {
    try {
      const taskStats = await this.prisma.dispatcherTask.aggregate({
        _count: { id: true },
        _sum: { runCount: true }
      });

      const activeTasks = await this.prisma.dispatcherTask.count({
        where: { isActive: true }
      });

      const successfulTasks = await this.prisma.dispatcherTask.count({
        where: { lastStatus: 'success' }
      });

      const failedTasks = await this.prisma.dispatcherTask.count({
        where: { lastStatus: 'error' }
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const execStats = await this.prisma.dispatcherTaskHistory.aggregate({
        where: {
          startedAt: { gte: yesterday }
        },
        _count: { id: true },
        _avg: { duration: true }
      });

      const successfulExecs = await this.prisma.dispatcherTaskHistory.count({
        where: {
          startedAt: { gte: yesterday },
          status: 'success'
        }
      });

      const failedExecs = await this.prisma.dispatcherTaskHistory.count({
        where: {
          startedAt: { gte: yesterday },
          status: 'error'
        }
      });

      return {
        tasks: {
          total_tasks: taskStats._count.id,
          active_tasks: activeTasks,
          successful_tasks: successfulTasks,
          failed_tasks: failedTasks,
          total_runs: taskStats._sum.runCount || 0
        },
        executions_24h: {
          total_executions: execStats._count.id,
          avg_duration: Math.round(execStats._avg.duration || 0),
          successful_executions: successfulExecs,
          failed_executions: failedExecs
        }
      };
    } catch (error) {
      this.logger.error('Failed to get stats:', error);
      throw new BadRequestError('Failed to retrieve statistics');
    }
  }

  async testDispatcher() {
    try {
      // Get queue names from database
      const queues = await this.getQueueNames();

      await this.queueService.addTask(queues.systemQueue, {
        type: 'test_task',
        name: 'Test Task from DSL module',
        data: {
          message: 'Test from DSL module',
          timestamp: new Date().toISOString()
        },
        priority: 5,
        metadata: {
          manual: true
        }
      });
      return { message: `Test task sent to ${queues.systemQueue}` };
    } catch (error) {
      this.logger.error('Failed to send test task:', error);
      throw new BadRequestError('Failed to send test task');
    }
  }

  async getRecentExecutions(limit: number = 10) {
    try {
      const executions = await this.prisma.dispatcherTaskHistory.findMany({
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          task: {
            select: { name: true, type: true }
          }
        }
      });

      return executions.map(exec => ({
        id: exec.id,
        taskName: exec.task?.name,
        taskType: exec.task?.type,
        status: exec.status,
        startedAt: exec.startedAt,
        finishedAt: exec.finishedAt,
        duration: exec.duration,
        error: exec.error,
        result: exec.result
      }));
    } catch (error) {
      this.logger.error('Failed to get recent executions:', error);
      throw new BadRequestError('Failed to retrieve recent executions');
    }
  }

  async updateTaskStatus(taskId: number, status: string, error?: string) {
    try {
      await this.prisma.dispatcherTask.update({
        where: { id: taskId },
        data: {
          lastStatus: status,
          lastRun: new Date(),
          lastError: error,
          runCount: { increment: 1 }
        }
      });

      this.logger.info(`Task status updated: ${taskId} -> ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update task status for ${taskId}:`, error);
      throw new BadRequestError('Failed to update task status');
    }
  }

  async scheduleTask(taskId: string, nextRun: Date) {
    try {
      await this.prisma.dispatcherTask.update({
        where: { id: parseInt(taskId) },
        data: { nextRun }
      });

      return { message: 'Task scheduled successfully' };
    } catch (error) {
      this.logger.error(`Failed to schedule task ${taskId}:`, error);
      throw new BadRequestError('Failed to schedule task');
    }
  }

  async getTasksByScheduleType(scheduleType: string) {
    try {
      return await this.prisma.dispatcherTask.findMany({
        where: {
          scheduleType,
          isActive: true
        },
        include: {
          parent: { select: { id: true, name: true } },
          children: { select: { id: true, name: true } }
        }
      });
    } catch (error) {
      this.logger.error(`Failed to get tasks by schedule type ${scheduleType}:`, error);
      throw new BadRequestError('Failed to retrieve tasks by schedule type');
    }
  }
}