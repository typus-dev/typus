import { Router } from 'express';
import { ConfigController } from './controllers/ConfigController.js';
import { ThemeController } from './controllers/ThemeController.js';
import { DashboardController } from './controllers/DashboardController.js';
import { container } from 'tsyringe';
import { Module } from '@/core/decorators/component.js';

/**
 * System Module - provides public configuration endpoints
 */
@Module({ path: 'system' })
export class SystemModule {
  private static instance: SystemModule;
  private configController: ConfigController;
  private themeController: ThemeController;
  private dashboardController: DashboardController;

  constructor() {
    // Resolve controllers from DI container
    this.configController = container.resolve(ConfigController);
    this.themeController = container.resolve(ThemeController);
    this.dashboardController = container.resolve(DashboardController);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SystemModule {
    if (!SystemModule.instance) {
      SystemModule.instance = new SystemModule();
    }
    return SystemModule.instance;
  }

  /**
   * Get router with configured routes
   */
  public getRouter(): Router {
    const router = Router();

    // GET /api/system/config - get all public configuration
    router.get('/config', this.configController.getPublicConfig.bind(this.configController));

    // GET /api/system/config/:key - get specific config by key
    router.get('/config/:key', this.configController.getConfigByKey.bind(this.configController));

    // POST /api/system/test-telegram - test Telegram Bot connection
    router.post('/test-telegram', this.configController.testTelegramConnection.bind(this.configController));

    // POST /api/system/test-email - test Email configuration
    router.post('/test-email', this.configController.testEmailConnection.bind(this.configController));

    // Theme management endpoints
    // GET /api/system/themes - list all themes
    router.get('/themes', this.themeController.listThemes.bind(this.themeController));

    // POST /api/system/themes/save - generate/update theme
    router.post('/themes/save', this.themeController.saveTheme.bind(this.themeController));

    // DELETE /api/system/themes/:name - delete theme
    router.delete('/themes/:name', this.themeController.deleteTheme.bind(this.themeController));

    // Dashboard endpoints
    // GET /api/system/dashboard - full dashboard data
    router.get('/dashboard', this.dashboardController.getDashboard.bind(this.dashboardController));

    // GET /api/system/dashboard/quick - quick stats for header
    router.get('/dashboard/quick', this.dashboardController.getQuickStats.bind(this.dashboardController));

    // GET /api/system/dashboard/application - application info
    router.get('/dashboard/application', this.dashboardController.getApplicationInfo.bind(this.dashboardController));

    // GET /api/system/dashboard/system - system info (CPU, RAM)
    router.get('/dashboard/system', this.dashboardController.getSystemInfo.bind(this.dashboardController));

    // GET /api/system/dashboard/database - database stats
    router.get('/dashboard/database', this.dashboardController.getDatabaseStats.bind(this.dashboardController));

    // GET /api/system/dashboard/storage - storage stats
    router.get('/dashboard/storage', this.dashboardController.getStorageStats.bind(this.dashboardController));

    // GET /api/system/dashboard/modules - loaded modules
    router.get('/dashboard/modules', this.dashboardController.getModulesInfo.bind(this.dashboardController));

    // GET /api/system/dashboard/queues - queue stats
    router.get('/dashboard/queues', this.dashboardController.getQueuesStatus.bind(this.dashboardController));

    // GET /api/system/dashboard/sessions - session stats
    router.get('/dashboard/sessions', this.dashboardController.getSessionsInfo.bind(this.dashboardController));

    return router;
  }

  /**
   * Get base path for module routes
   */
  public getBasePath(): string {
    return 'system';
  }
}
