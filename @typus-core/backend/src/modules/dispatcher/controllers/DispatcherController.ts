import { Request, Response } from 'express';
import { BaseController } from '@/core/base/BaseController.js';
import { DispatcherService } from '../services/DispatcherService';
import { inject } from 'tsyringe';
import { Controller } from '@/core/decorators/component.js';

@Controller({ path: 'dispatcher' })
export class DispatcherController extends BaseController {
  constructor(
    @inject(DispatcherService) private dispatcherService: DispatcherService
  ) {
    super();
  }

  async executeTask(req: Request, res: Response) {
    const { id } = req.params;
    return await this.dispatcherService.executeTask(id);
  }

  async getQueueStatus(req: Request, res: Response) {
    return await this.dispatcherService.getQueueStatus();
  }

  async getStats(req: Request, res: Response) {
    return await this.dispatcherService.getStats();
  }

  async testDispatcher(req: Request, res: Response) {
    return await this.dispatcherService.testDispatcher();
  }

  async getRecentExecutions(req: Request, res: Response) {
    const { limit } = req.query;
    return await this.dispatcherService.getRecentExecutions(
      limit ? parseInt(limit as string) : 10
    );
  }

  async scheduleTask(req: Request, res: Response) {
    const { id } = req.params;
    const { nextRun } = this.getValidatedData(req).body;
    return await this.dispatcherService.scheduleTask(id, new Date(nextRun));
  }

  async getTasksByScheduleType(req: Request, res: Response) {
    const { scheduleType } = req.params;
    return await this.dispatcherService.getTasksByScheduleType(scheduleType);
  }
}