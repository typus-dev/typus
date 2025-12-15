// src/core/queue/QueueWorker.ts
import { QueueManager } from './QueueManager.js';

export class QueueWorker {
    // Initialize with manager and interval
    constructor(
        private queueManager: QueueManager,
        private interval: number = 5000
    ) {}
    
    // Start queue processing
    async start(): Promise<void> {
        global.logger.info('[QueueWorker] Starting queue processing');
        setInterval(async () => {
            try {
                await this.queueManager.processAll();
            } catch (error) {
                global.logger.error('[QueueWorker] Queue processing error', { error });
            }
        }, this.interval);
    }
}
