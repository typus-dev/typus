import { BaseModule } from '../../core/base/BaseModule.js';
import { LogController } from './controllers/LogController.js';
import { LogService } from './services/LogService.js';

/**
 * Module for handling logs from frontend
 */
export class LogModule extends BaseModule<LogController, LogService> {
  constructor() {
    super('logs', LogController, LogService);
  }

  /**
   * Initialize module specific logic
   */
  protected initialize(): void {
    this.logger.info(`[${this.moduleName}] module initialized`);
  }

  /**
   * Initialize routes for log module
   */
  protected initializeRoutes(): void {
    this.logger.info(`[${this.moduleName}] routes initializing...`);

    // POST /api/logs - receive logs from frontend
    this.router.post('/', this.controller.createLogs.bind(this.controller));

    // GET /api/logs - retrieve logs for interface
    this.router.get('/', this.controller.getLogs.bind(this.controller));

    // GET /api/logs/containers - retrieve all container logs
    this.router.get('/containers', this.controller.getContainerLogs.bind(this.controller));

    // GET /api/logs/containers/:containerName - retrieve logs for specific container
    this.router.get('/containers/:containerName', this.controller.getContainerLogsByName.bind(this.controller));

    // GET /api/logs/search - search container logs
    this.router.get('/search', this.controller.searchContainerLogs.bind(this.controller));

    this.logger.info(`[${this.moduleName}] routes initialized`);
  }
}
