// src/core/queue/BaseQueue.ts
export abstract class BaseQueue {
    protected jobs: QueueJob[] = [];
    
    // Add job to queue
    abstract add(data: any, options?: QueueOptions): Promise<void>;
    // Process queue jobs
    abstract process(): Promise<void>;
    
    // Get queue statistics
    getStats(): QueueStats {
        return {
            pending: this.jobs.length,
            processed: 0
        };
    }
}

interface QueueJob {
    // Job data
    data: any;
    // Job options
    options?: QueueOptions;
}

interface QueueOptions {
    // Job priority
    priority?: number;
    // Job delay
    delay?: number;
}

interface QueueStats {
    // Pending jobs count
    pending: number;
    // Processed jobs count
    processed: number;
}
