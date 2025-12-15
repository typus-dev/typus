import { Service } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';
import { inject } from 'tsyringe';
import { DispatcherQueueService } from './DispatcherQueueService.js';

// Re-export all interfaces from DispatcherQueueUIService
export type {
  QueueInfo
} from './DispatcherQueueUIService.js';

export type {
  PaginatedTasks,
  SystemLoad,
  TaskHistoryItem
} from './DispatcherQueueService.js';

@Service()
export class QueueManagerService extends BaseService {
  constructor(
    @inject(DispatcherQueueService) private dispatcherQueueService: DispatcherQueueService
  ) {
    super();
  }

  // QUEUE OPERATIONS (delegated to DispatcherQueueService)

  async getAllQueuesInfo() {
    return this.dispatcherQueueService.getQueues(false);
  }

  async getQueueTasks(queueKey: string, limit: number = 50) {
    return this.dispatcherQueueService.getQueueTasks(queueKey, limit);
  }

  async getAllQueuesTasks(limit: number = 100) {
    return this.dispatcherQueueService.getAllQueuesTasks(limit);
  }

  async addTestTasks(queueKey: string, count: number) {
    return this.dispatcherQueueService.addTestTasks(queueKey, count);
  }

  async addCustomTestTasks(request: any) {
    return this.dispatcherQueueService.addCustomTestTasks(request);
  }

  async getTaskTemplates(queueType?: 'mail' | 'messages' | 'system') {
    return this.dispatcherQueueService.getTaskTemplates(queueType);
  }

  async getTaskHistory(limit: number = 50) {
    return this.dispatcherQueueService.getTaskHistory(limit);
  }

  async getTaskHistoryPaginated(limit: number = 50, offset: number = 0) {
    return this.dispatcherQueueService.getTaskHistoryPaginated(limit, offset);
  }

  async getAllTasks(opts: any = {}) {
    return this.dispatcherQueueService.getAllTasks(opts);
  }

  async getQueueTasksPaginated(queueKey: string, limit: number = 50, offset: number = 0) {
    return this.dispatcherQueueService.getQueueTasksPaginated(queueKey, limit, offset);
  }

  async deleteMultipleTasks(taskIds: string[]) {
    return this.dispatcherQueueService.deleteMultipleTasks(taskIds);
  }

  async retryMultipleTasks(taskIds: string[]) {
    return this.dispatcherQueueService.retryMultipleTasks(taskIds);
  }

  // Removed legacy Redis-only diagnostics helpers from manager service

  async getSystemLoad() {
    return this.dispatcherQueueService.getSystemLoad();
  }

  async clearAllQueues(confirm: boolean = false) {
    return this.dispatcherQueueService.clearAllQueues(confirm);
  }

  async isQueueKeyValid(queueKey: string) {
    return this.dispatcherQueueService.isQueueKeyValid(queueKey);
  }

  async getQueues(includeDiscovered: boolean = false) {
    return this.dispatcherQueueService.getQueues(includeDiscovered);
  }

  async getQueueStats(queueKey: string) {
    return this.dispatcherQueueService.getQueueStats(queueKey);
  }

  async isValidQueue(queueKey: string) {
    return this.dispatcherQueueService.isValidQueue(queueKey);
  }

  // QUEUE MANAGEMENT OPERATIONS

  async pauseQueue(queueKey: string): Promise<boolean> {
    return this.dispatcherQueueService.pauseQueue(queueKey);
  }

  async resumeQueue(queueKey: string): Promise<boolean> {
    return this.dispatcherQueueService.resumeQueue(queueKey);
  }

  async clearQueue(queueKey: string): Promise<boolean> {
    try {
      const result = await this.dispatcherQueueService.clearQueue(queueKey);
      return result.success;
    } catch (error) {
      this.logger.error(`Failed to clear queue ${queueKey}:`, error);
      return false;
    }
  }
}
