import { Request, Response } from 'express';
import { inject } from 'tsyringe';
import { BaseController } from '@/core/base/BaseController.js';
import { Controller } from '@/core/decorators/component.js';
import { SystemDashboardService } from '../services/SystemDashboardService.js';

/**
 * DashboardController - System monitoring dashboard endpoints
 */
@Controller()
export class DashboardController extends BaseController {
  constructor(
    @inject(SystemDashboardService) private dashboardService: SystemDashboardService
  ) {
    super();
  }

  /**
   * GET /api/system/dashboard
   * Get full system dashboard data
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const dashboard = await this.dashboardService.getDashboard();
      this.success(res, dashboard);
    } catch (error) {
      this.logger.error('[DashboardController] Error getting dashboard:', error);
      this.error(res, 'Failed to fetch dashboard data', 500);
    }
  }

  /**
   * GET /api/system/dashboard/quick
   * Get quick stats for header widget
   */
  async getQuickStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.dashboardService.getQuickStats();
      this.success(res, stats);
    } catch (error) {
      this.logger.error('[DashboardController] Error getting quick stats:', error);
      this.error(res, 'Failed to fetch quick stats', 500);
    }
  }

  /**
   * GET /api/system/dashboard/application
   * Get application info only
   */
  async getApplicationInfo(req: Request, res: Response): Promise<void> {
    try {
      const info = await this.dashboardService.getApplicationInfo();
      this.success(res, info);
    } catch (error) {
      this.logger.error('[DashboardController] Error getting application info:', error);
      this.error(res, 'Failed to fetch application info', 500);
    }
  }

  /**
   * GET /api/system/dashboard/system
   * Get system info only (CPU, RAM, etc.)
   */
  async getSystemInfo(req: Request, res: Response): Promise<void> {
    try {
      const info = this.dashboardService.getSystemInfo();
      this.success(res, info);
    } catch (error) {
      this.logger.error('[DashboardController] Error getting system info:', error);
      this.error(res, 'Failed to fetch system info', 500);
    }
  }

  /**
   * GET /api/system/dashboard/database
   * Get database statistics
   */
  async getDatabaseStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.dashboardService.getDatabaseStats();
      this.success(res, stats);
    } catch (error) {
      this.logger.error('[DashboardController] Error getting database stats:', error);
      this.error(res, 'Failed to fetch database stats', 500);
    }
  }

  /**
   * GET /api/system/dashboard/storage
   * Get storage statistics
   */
  async getStorageStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.dashboardService.getStorageStats();
      this.success(res, stats);
    } catch (error) {
      this.logger.error('[DashboardController] Error getting storage stats:', error);
      this.error(res, 'Failed to fetch storage stats', 500);
    }
  }

  /**
   * GET /api/system/dashboard/modules
   * Get loaded modules and plugins
   */
  async getModulesInfo(req: Request, res: Response): Promise<void> {
    try {
      const modules = await this.dashboardService.getModulesInfo();
      this.success(res, { modules });
    } catch (error) {
      this.logger.error('[DashboardController] Error getting modules info:', error);
      this.error(res, 'Failed to fetch modules info', 500);
    }
  }

  /**
   * GET /api/system/dashboard/queues
   * Get queue statistics
   */
  async getQueuesStatus(req: Request, res: Response): Promise<void> {
    try {
      const queues = await this.dashboardService.getQueuesStatus();
      this.success(res, { queues });
    } catch (error) {
      this.logger.error('[DashboardController] Error getting queues status:', error);
      this.error(res, 'Failed to fetch queues status', 500);
    }
  }

  /**
   * GET /api/system/dashboard/sessions
   * Get session statistics
   */
  async getSessionsInfo(req: Request, res: Response): Promise<void> {
    try {
      const sessions = await this.dashboardService.getSessionsInfo();
      this.success(res, sessions);
    } catch (error) {
      this.logger.error('[DashboardController] Error getting sessions info:', error);
      this.error(res, 'Failed to fetch sessions info', 500);
    }
  }
}
