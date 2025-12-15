// Export module
export { DispatcherModule } from './DispatcherModule';

// Export controllers
export { DispatcherController } from './controllers/DispatcherController';
export { QueueController } from './controllers/QueueController';

// Export services
export { DispatcherService } from './services/DispatcherService';
export { DispatcherQueueService } from './services/DispatcherQueueService';

// Export types
export type {
  PaginatedTasks,
  SystemLoad,
  TaskHistoryItem
} from './services/DispatcherQueueService';

// Import for default export
import { DispatcherModule as Module } from './DispatcherModule';

// Default export for module loader
export default { DispatcherModule: Module };