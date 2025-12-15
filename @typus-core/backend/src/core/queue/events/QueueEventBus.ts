import { Service } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';
import { inject } from 'tsyringe';
import { RedisService } from '@/core/redis/RedisService';
import { WebSocketService } from '@/core/websocket/WebSocketService';
import {
  EVT_QUEUE_UPDATE,
  EVT_QUEUE_TASKS_ADDED,
  EVT_TASK_HISTORY_UPDATE,
  EVT_QUEUES_CLEARED,
  EVT_WORKFLOW_EXECUTION_UPDATE,
  EVT_WORKFLOW_CREATION_STARTED,
  EVT_WORKFLOW_CREATION_BLOCK_ADDED,
  EVT_WORKFLOW_CREATION_COMPLETED,
  QueueEventName
} from './constants';

type QueueDriver = 'database' | 'redis';

@Service()
export class QueueEventBus extends BaseService {
  private driver: QueueDriver;

  constructor(
    @inject(RedisService) private redisService: RedisService,
    @inject(WebSocketService) private ws: WebSocketService
  ) {
    super();
    this.driver = (process.env.QUEUE_DRIVER as QueueDriver) || 'database';
  }

  private async publish(eventType: QueueEventName, data: any) {
    const payload = { type: eventType, data };

    this.logger.debug('[QueueEventBus] Publishing event', {
      eventType,
      payload: JSON.stringify(payload).substring(0, 200)
    });

    try {
      // Try Redis Pub/Sub first (FULL profile)
      const redis = await this.redisService.getRedis().catch(() => null as any);
      if (redis) {
        this.logger.debug('[QueueEventBus] Using Redis pub/sub');
        await redis.publish('websocket:broadcast', JSON.stringify(payload));
        return;
      }
    } catch (e) {
      this.logger.debug('[QueueEventBus] Redis publish failed, falling back to in-process broadcast', {
        error: e instanceof Error ? e.message : e
      });
    }

    // STARTER profile (no Redis): broadcast directly to WebSocket connections
    try {
      this.logger.info('[QueueEventBus] Broadcasting via WebSocket', {
        eventType,
        dataKeys: Object.keys(data)
      });
      this.ws.broadcast(payload);
    } catch (e) {
      this.logger.warn('[QueueEventBus] WebSocket broadcast failed', {
        error: e instanceof Error ? e.message : e
      });
    }
  }

  async emitQueueUpdate(queues: any[]) {
    await this.publish(EVT_QUEUE_UPDATE, {
      queues,
      driver: this.driver,
      timestamp: new Date().toISOString()
    });
  }

  async emitTasksAdded(queue: string, tasks: any[], added: number) {
    await this.publish(EVT_QUEUE_TASKS_ADDED, {
      queue,
      tasks,
      added,
      timestamp: new Date().toISOString()
    });
  }

  async emitTaskHistoryUpdate(items: any[], delta: number = items.length) {
    this.logger.info('[QueueEventBus] Emitting task history update', {
      items,
      delta,
      event: EVT_TASK_HISTORY_UPDATE
    });

    await this.publish(EVT_TASK_HISTORY_UPDATE, {
      items,
      delta,
      timestamp: new Date().toISOString()
    });
  }

  async emitQueuesCleared(cleared: number) {
    await this.publish(EVT_QUEUES_CLEARED, {
      cleared,
      driver: this.driver,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================
  // Workflow Execution Events
  // ============================================

  async emitWorkflowExecutionUpdate(data: {
    executionId: number;
    workflowId: number;
    status: string;
    progress: number;
    duration?: number;
    estimatedTimeRemaining?: number | null;
    startedAt?: string;
    completedAt?: string;
    blocks?: {
      total: number;
      completed: number;
      failed: number;
      completedBlocks: string[];
      failedBlocks: string[];
    };
    error?: string;
  }) {
    await this.publish(EVT_WORKFLOW_EXECUTION_UPDATE, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================
  // Workflow Creation Events (Master Workflow)
  // ============================================

  async emitWorkflowCreationStarted(data: {
    executionId: number;
    taskDescription: string;
  }) {
    await this.publish(EVT_WORKFLOW_CREATION_STARTED, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  async emitWorkflowCreationBlockAdded(data: {
    executionId: number;
    blockId: string;
    blockName: string;
    blockIndex: number;
    totalBlocks: number;
  }) {
    await this.publish(EVT_WORKFLOW_CREATION_BLOCK_ADDED, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  async emitWorkflowCreationCompleted(data: {
    executionId: number;
    workflowId: number;
    workflowName: string;
    blocksCount: number;
  }) {
    await this.publish(EVT_WORKFLOW_CREATION_COMPLETED, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}
