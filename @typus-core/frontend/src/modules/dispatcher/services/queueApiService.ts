import { useApi } from '@/shared/composables/useApi';

/**
 * Simple logger that always stringifies payloads.
 * No try/catch — if payload has circular refs, JSON.stringify will throw.
 */
const logger = {
  debug: (operation: string, data?: any) => {
    const payload =
      data === undefined
        ? ''
        : (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    console.log(`[QueueApiService] ${operation}${payload ? ': ' + payload : ''}`);
  }
};

// ----------------------------- Types ----------------------------------------

export interface QueueInfo {
  name: string;
  key: string;
  type: 'mail' | 'messages' | 'system';
  color: string;
  depth: number;
  running: number;
  failed: number;
  paused: boolean;
}

export interface QueueTask {
  id: string;
  type: string;
  title: string;
  createdAt: string;
  priority: number;
  status: 'queued' | 'running' | 'delayed' | 'failed';
  retries: number;
  queue: string;
  payload: any;
}

export interface QueueStats {
  totalTasks: number;
  runningTasks: number;
  failedTasks: number;
  lastActivity: string | null;
}

export interface QueueHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalQueues: number;
  totalTasks: number;
  totalErrors: number;
  pausedQueues: number;
  queues: Array<{
    name: string;
    key: string;
    status: 'active' | 'paused';
    tasks: number;
    errors: number;
  }>;
}

export interface TaskTemplate {
  type: string;
  title: string;
  data: any;
  priority?: number;
  delay?: number;
}

export interface TestTasksRequest {
  queueKey: string;
  count: number;
  template: TaskTemplate;
}

export interface TaskHistoryItem {
  id: number;
  task_id: number;
  status: 'success' | 'failed';
  started_at: string;
  finished_at: string;
  duration: number;
  result?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface SystemLoad {
  totalQueues: number;
  totalTasks: number;
  totalFailedTasks: number;
  redisMemory: string;
  discoveredQueues: string[];
  knownQueues: number;
  unknownQueues: number;
}

export interface RedisQueueInfo extends QueueInfo {
  isKnown: boolean;
  discoveredAt: string;
}

export interface ClearAllRedisResult {
  cleared: number;
  failed: number;
  clearedKeys: string[];
}

type ContextName = string; // e.g., 'simple', 'production', or any custom key

// ----------------------- Service Implementation -----------------------------

class QueueApiService {
  // --- Queues overview ------------------------------------------------------

  async getAllQueues(options: { includeDiscovered?: boolean } = {}): Promise<{ queues: QueueInfo[]; timestamp: string }> {
    const startTime = performance.now();
    logger.debug('getAllQueues', { endpoint: 'dispatcher/queues', includeDiscovered: options.includeDiscovered });

    const query = options.includeDiscovered === undefined ? undefined : { includeDiscovered: String(options.includeDiscovered) };
    const { data, error } = await useApi('dispatcher/queues').get(query);

    if (error) {
      logger.debug('getAllQueues', { error });
      throw new Error(error);
    }

    logger.debug('getAllQueues', {
      response: data,
      queuesCount: data?.queues?.length,
      ms: performance.now() - startTime
    });
    return data;
  }

  // --- Queue tasks & stats --------------------------------------------------

  async getQueueTasks(
    queueKey: string,
    params: {
      limit?: number;
      offset?: number;
      status?: string;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
      includeDiscovered?: boolean;
    } = {}
  ): Promise<{ queue: string; tasks: QueueTask[]; total: number; limit: number; offset: number; hasMore: boolean; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('getQueueTasks', { queueKey, params, endpoint: `dispatcher/queues/${queueKey}/tasks` });

    const query: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      status: params.status,
      type: params.type,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      includeDiscovered: params.includeDiscovered === undefined ? undefined : String(params.includeDiscovered)
    }

    Object.keys(query).forEach((key) => {
      if (query[key] === undefined) {
        delete query[key]
      }
    })

    const { data, error } = await useApi(`dispatcher/queues/${queueKey}/tasks`).get(query);

    if (error) {
      logger.debug('getQueueTasks', { error });
      throw new Error(error);
    }

    logger.debug('getQueueTasks', {
      response: data,
      tasksCount: data?.tasks?.length,
      ms: performance.now() - startTime
    });
    return data;
  }

  async getQueueStats(queueKey: string): Promise<{ queue: string; stats: QueueStats; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('getQueueStats', { queueKey, endpoint: `dispatcher/queues/${queueKey}/stats` });

    const { data, error } = await useApi(`dispatcher/queues/${queueKey}/stats`).get();

    if (error) {
      logger.debug('getQueueStats', { error });
      throw new Error(error);
    }

    logger.debug('getQueueStats', { response: data, ms: performance.now() - startTime });
    return data;
  }

  // --- Batch ops on tasks ---------------------------------------------------

  async deleteTasksBatch(taskIds: string[]): Promise<{
    success: number;
    failed: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
    timestamp: string;
  }> {
    const startTime = performance.now();
    logger.debug('deleteTasksBatch', { taskIds, count: taskIds.length, endpoint: 'dispatcher/queues/tasks/batch' });

    const { data, error } = await useApi('dispatcher/queues/tasks/batch').del({
      data: { taskIds }
    });

    if (error) {
      logger.debug('deleteTasksBatch', { error });
      throw new Error(error);
    }

    logger.debug('deleteTasksBatch', {
      response: data,
      successCount: data?.success,
      ms: performance.now() - startTime
    });
    return data;
  }

  async retryTasksBatch(taskIds: string[]): Promise<{
    success: number;
    failed: number;
    results: Array<{ id: string; success: boolean; error?: string }>;
    timestamp: string;
  }> {
    const startTime = performance.now();
    logger.debug('retryTasksBatch', { taskIds, count: taskIds.length, endpoint: 'dispatcher/queues/tasks/batch/retry' });

    const { data, error } = await useApi('dispatcher/queues/tasks/batch/retry').post({
      taskIds
    });

    if (error) {
      logger.debug('retryTasksBatch', { error });
      throw new Error(error);
    }

    logger.debug('retryTasksBatch', {
      response: data,
      successCount: data?.success,
      ms: performance.now() - startTime
    });
    return data;
  }

  // --- Queue controls -------------------------------------------------------

  async pauseQueue(queueKey: string): Promise<{ queue: string; action: string; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('pauseQueue', { queueKey, endpoint: `dispatcher/queues/${queueKey}/pause` });

    const { data, error } = await useApi(`dispatcher/queues/${queueKey}/pause`).post();

    if (error) {
      logger.debug('pauseQueue', { error });
      throw new Error(error);
    }

    logger.debug('pauseQueue', { response: data, ms: performance.now() - startTime });
    return data;
  }

  async resumeQueue(queueKey: string): Promise<{ queue: string; action: string; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('resumeQueue', { queueKey, endpoint: `dispatcher/queues/${queueKey}/resume` });

    const { data, error } = await useApi(`dispatcher/queues/${queueKey}/resume`).post();

    if (error) {
      logger.debug('resumeQueue', { error });
      throw new Error(error);
    }

    logger.debug('resumeQueue', { response: data, ms: performance.now() - startTime });
    return data;
  }

  async clearQueue(queueKey: string): Promise<{ queue: string; action: string; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('clearQueue', { queueKey, endpoint: `dispatcher/queues/${queueKey}/clear`, payload: { confirm: true } });

    const { data, error } = await useApi(`dispatcher/queues/${queueKey}/clear`).del({
      data: { confirm: true }
    });

    if (error) {
      logger.debug('clearQueue', { error });
      throw new Error(error);
    }

    logger.debug('clearQueue', { response: data, ms: performance.now() - startTime });
    return data;
  }

  // --- Health, load, discovery ---------------------------------------------

  async getQueueHealth(): Promise<{ health: QueueHealth; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('getQueueHealth', { endpoint: 'dispatcher/queues/health' });

    const { data, error } = await useApi('dispatcher/queues/health').get();

    if (error) {
      logger.debug('getQueueHealth', { error });
      throw new Error(error);
    }

    logger.debug('getQueueHealth', { response: data, ms: performance.now() - startTime });
    return data;
  }

  async getAllQueuesTasks(params: {
    limit?: number;
    offset?: number;
    queue?: string;
    status?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    includeDiscovered?: boolean;
  } = {}): Promise<{ tasks: QueueTask[]; total: number; limit: number; offset: number; hasMore: boolean; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('getAllQueuesTasks', { params, endpoint: 'dispatcher/queues/all/tasks' });

    const query: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      queue: params.queue,
      status: params.status,
      type: params.type,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      includeDiscovered: params.includeDiscovered === undefined ? undefined : String(params.includeDiscovered)
    }

    Object.keys(query).forEach((key) => {
      if (query[key] === undefined) {
        delete query[key]
      }
    })

    const { data, error } = await useApi('dispatcher/queues/all/tasks').get(query);

    if (error) {
      logger.debug('getAllQueuesTasks', { error });
      throw new Error(error);
    }

    logger.debug('getAllQueuesTasks', {
      response: data,
      tasksCount: data?.tasks?.length,
      ms: performance.now() - startTime
    });
    return data;
  }

  async addTestTasks(queueKey: string, count: number): Promise<{ queue: string; added: number; queueInfo: QueueInfo; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('addTestTasks', { queueKey, count, endpoint: `dispatcher/queues/${queueKey}/test-tasks` });

    const { data, error } = await useApi(`dispatcher/queues/${queueKey}/test-tasks`).post({ count });

    if (error) {
      logger.debug('addTestTasks', { error });
      throw new Error(error);
    }

    logger.debug('addTestTasks', { response: data, ms: performance.now() - startTime });
    return data;
  }

async getTaskHistory(params: { limit?: number; offset?: number } = {}): Promise<{ history: TaskHistoryItem[]; total: number; timestamp: string; }> {
   const startTime = performance.now();
   logger.debug('getTaskHistory', { params, endpoint: 'dispatcher/queues/task-history' });

   const query: Record<string, any> = {
     limit: params.limit || 20,
     offset: params.offset || 0
   }

   const { data, error } = await useApi('dispatcher/queues/task-history').get(query);

   if (error) {
     logger.debug('getTaskHistory', { error });
     throw new Error(error);
   }

   logger.debug('getTaskHistory', {
     response: data,
     historyCount: data?.tasks?.length,
     total: data?.total,
     ms: performance.now() - startTime
   });


   return {
     history: data.tasks || [],
     total: data.total || 0,
     timestamp: data.timestamp || new Date().toISOString()
   };
}

  // Removed legacy Redis diagnostics methods from UI service.

  async getSystemLoad(): Promise<{ systemLoad: SystemLoad; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('getSystemLoad', { endpoint: 'dispatcher/queues/system-load' });

    const { data, error } = await useApi('dispatcher/queues/system-load').get();

    if (error) {
      logger.debug('getSystemLoad', { error });
      throw new Error(error);
    }

    logger.debug('getSystemLoad', {
      response: data,
      totalQueues: data?.systemLoad?.totalQueues,
      totalTasks: data?.systemLoad?.totalTasks,
      ms: performance.now() - startTime
    });
    return data;
  }

  // --- Convenience wrappers / transforms -----------------------------------

  // Removed legacy convenience wrapper for Redis-only tasks.

  async clearAllQueues(
    confirm: string,
    doubleConfirm: string
  ): Promise<{ cleared: number; failed: number; clearedKeys: string[]; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('clearAllQueues', { confirm, doubleConfirm, endpoint: 'dispatcher/queues/clear-all' });

    const { data, error } = await useApi('dispatcher/queues/clear-all').del({
      data: { confirm, doubleConfirm }
    });

    if (error) {
      logger.debug('clearAllQueues', { error });
      throw new Error(error);
    }

    logger.debug('clearAllQueues', { response: data, clearedCount: data?.cleared, ms: performance.now() - startTime });
    return data;
  }

  // --- Templates & schemas --------------------------------------------------

  async addCustomTestTasks(
    request: TestTasksRequest
  ): Promise<{ queue: string; added: number; queueInfo: QueueInfo; template: TaskTemplate; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('addCustomTestTasks', { request, endpoint: 'dispatcher/queues/custom-test-tasks' });

    const { data, error } = await useApi('dispatcher/queues/custom-test-tasks').post(request);

    if (error) {
      logger.debug('addCustomTestTasks', { error });
      throw new Error(error);
    }

    logger.debug('addCustomTestTasks', { response: data, ms: performance.now() - startTime });
    return data;
  }

  async getTaskTemplates(
    queueType?: 'mail' | 'messages' | 'system'
  ): Promise<{ templates: TaskTemplate[]; queueType: string; total: number; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('getTaskTemplates', { queueType, endpoint: 'dispatcher/queues/templates' });

    const params = queueType ? { queueType } : {};
    const { data, error } = await useApi('dispatcher/queues/templates').get(params);

    if (error) {
      logger.debug('getTaskTemplates', { error });
      throw new Error(error);
    }

    logger.debug('getTaskTemplates', {
      response: data,
      templatesCount: data?.templates?.length,
      ms: performance.now() - startTime
    });
    return data;
  }

  /**
   * Create a task using simple field-based data
   */
  async createTask(
    taskType: string,
    userData: any,
    queueKey: string
  ): Promise<{ queue: string; added: number; queueInfo: QueueInfo; template: TaskTemplate; timestamp: string; }> {
    const startTime = performance.now();
    logger.debug('createTask', { taskType, userData, queueKey });

    const result = await this.addCustomTestTasks({
      queueKey,
      count: 1,
      template: {
        type: taskType,
        title: userData.title || taskType,
        data: userData,
        priority: userData.priority ?? 3
      }
    });

    logger.debug('createTask', { finalResult: result, ms: performance.now() - startTime });
    return result;
  }

  async getPluginSchema(taskType: string): Promise<any> {
    logger.debug('getPluginSchema', { taskType });

    const { data, error } = await useApi(`dispatcher/schemas/${taskType}`).get();

    if (error) {
      logger.debug('getPluginSchema', { error });
      throw new Error(error);
    }

    logger.debug('getPluginSchema', { loadedSchema: data });
    return data;
  }

  async getAllPluginSchemas(): Promise<{ schemas: Array<{ name: string; schema: any }>; total: number; timestamp: string; }> {
    logger.debug('getAllPluginSchemas');

    const { data, error } = await useApi('dispatcher/schemas').get();

    if (error) {
      logger.debug('getAllPluginSchemas', { error });
      throw new Error(error);
    }

    logger.debug('getAllPluginSchemas', { loadedSchemas: data, count: data?.schemas?.length });
    return data;
  }

  // --- Template helpers -----------------------------------------------------
  // Deep clone + placeholder substitution that preserves static values
  // Supports {{key}} and dot-paths like {{user.email}}

  private getByPath(src: Record<string, any>, path: string) {
    return String(path)
      .split('.')
      .reduce<any>((acc, key) => (acc != null ? acc[key] : undefined), src);
  }

  private replaceInString(str: string, data: Record<string, any>): string {
    return str.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, rawKey) => {
      const key = String(rawKey).trim();
      const val = this.getByPath(data, key);
      if (val === undefined || val === null) return `{{${key}}}`; // keep unresolved placeholders
      return typeof val === 'string' ? val : JSON.stringify(val);
    });
  }

  private replaceTemplateVariables<T = any>(obj: T, data: Record<string, any>): T {
    logger.debug('replaceTemplateVariables', {
      template: JSON.stringify(obj),
      data: JSON.stringify(data)
    });

    // Primitives
    if (obj === null || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return this.replaceInString(obj, data) as unknown as T;
      }
      return obj; // number | boolean | null | undefined
    }

    // Arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceTemplateVariables(item, data)) as unknown as T;
    }

    // Dates & special objects as-is
    if (obj instanceof Date) return obj as T;

    // Plain objects
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = this.replaceTemplateVariables(v as any, data);
    }
    return out as T;
  }

  /**
   * Legacy whole-string templating helper.
   * Performs naive string replacement over JSON-stringified template.
   * Kept for compatibility; prefer `replaceTemplateVariables`.
   */
  private applyTemplate(templateData: any, userData: any): any {
    logger.debug('applyTemplate', { templateData, userData });

    const base = templateData || {};
    const cloned = JSON.parse(JSON.stringify(base));

    let templateString = JSON.stringify(cloned);
    for (const [key, value] of Object.entries(userData)) {
      if (value !== undefined && value !== null) {
        const placeholder = `{{${key}}}`;
        const replacement = typeof value === 'string' ? value : JSON.stringify(value);
        templateString = templateString.split(placeholder).join(replacement);
        logger.debug('applyTemplate', { replacedPlaceholder: placeholder, withValue: replacement });
      }
    }

    const appliedResult = JSON.parse(templateString);
    logger.debug('applyTemplate', { appliedResult });
    return appliedResult;
  }
}

export const queueApiService = new QueueApiService();
