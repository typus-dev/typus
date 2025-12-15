import { Request, Response } from 'express';
import { inject } from 'tsyringe';
import { BaseController } from '@/core/base/BaseController.js';
import { Controller } from '@/core/decorators/component.js';
import { ThemeGeneratorService, ThemeParams } from '../services/ThemeGeneratorService.js';

/**
 * ThemeController - Theme generation and management API
 */
@Controller()
export class ThemeController extends BaseController {
  constructor(
    @inject(ThemeGeneratorService) private themeGenerator: ThemeGeneratorService
  ) {
    super();
  }

  /**
   * POST /api/system/themes/save
   * Generate or update a theme from parameters
   */
  async saveTheme(req: Request, res: Response): Promise<void> {
    try {
      const params: ThemeParams = req.body;

      this.logger.info('[ThemeController] Saving theme:', {
        name: params.name,
        overwrite: params.overwrite,
        userId: req.user?.id
      });

      const result = await this.themeGenerator.generateTheme(params);

      if (result.success) {
        this.success(res, result);
      } else {
        this.error(res, result.message, 400);
      }
    } catch (error: any) {
      this.logger.error('[ThemeController] Error saving theme:', error);
      this.error(res, `Failed to save theme: ${error.message}`, 500);
    }
  }

  /**
   * GET /api/system/themes
   * List all available themes
   */
  async listThemes(_req: Request, res: Response): Promise<void> {
    try {
      const themes = this.themeGenerator.listThemes();
      this.success(res, { themes });
    } catch (error: any) {
      this.logger.error('[ThemeController] Error listing themes:', error);
      this.error(res, `Failed to list themes: ${error.message}`, 500);
    }
  }

  /**
   * DELETE /api/system/themes/:name
   * Delete a theme
   */
  async deleteTheme(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      this.logger.info('[ThemeController] Deleting theme:', {
        name,
        userId: req.user?.id
      });

      const result = await this.themeGenerator.deleteTheme(name);

      if (result.success) {
        this.success(res, result);
      } else {
        this.error(res, result.message, 400);
      }
    } catch (error: any) {
      this.logger.error('[ThemeController] Error deleting theme:', error);
      this.error(res, `Failed to delete theme: ${error.message}`, 500);
    }
  }
}
