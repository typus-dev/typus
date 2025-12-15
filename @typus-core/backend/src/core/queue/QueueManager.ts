// src/core/queue/QueueManager.ts
import { BaseQueue } from './BaseQueue.js';

export class QueueManager {
    private static instance: QueueManager;
    private queues: Map<string, BaseQueue> = new Map();
    
    // Get singleton instance
    static getInstance(): QueueManager {
        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }
    
    // Register a new queue
    registerQueue(name: string, queue: BaseQueue): void {
        this.queues.set(name, queue);
        global.logger.info(`[QueueManager] Registered queue: ${name}`);
    }
    
    // Get a queue by name
    getQueue(name: string): BaseQueue {
        const queue = this.queues.get(name);
        if (!queue) {
            throw new Error(`Queue ${name} not found`);
        }
        return queue;
    }
    
    // Process all registered queues
    async processAll(): Promise<void> {
        for (const [name, queue] of this.queues) {
            await queue.process();
        }
    }
}
