import { BaseService } from '@/core/base/BaseService.js';
import { Service } from '@/core/decorators/component.js';
import { getThemeLinksGenerator } from '@/core/html-generator/ThemeLinksGenerator.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Theme configuration from theme.json
 */
export interface ThemeConfig {
  theme: string;
  title?: string;
  description?: string;
}

/**
 * Service for resolving active theme for layouts
 *
 * Priority order:
 * 1. custom/frontend/layouts/{layoutName}/theme.json → "theme" field
 * 2. custom/styles/themes/{layoutName}/ → directory exists
 * 3. Fallback: default (first theme from manifest)
 */
@Service()
export class ThemeResolverService extends BaseService {
  private readonly projectRoot: string;

  constructor() {
    super();
    this.projectRoot = process.env.TEMPLATES_BASE_PATH || process.env.PROJECT_PATH || process.cwd();
  }

  /**
   * Get default theme from ThemeLinksGenerator (first theme in auto-themes.json)
   */
  private getDefaultTheme(): string {
    const themeLinksGenerator = getThemeLinksGenerator('/app');
    return themeLinksGenerator.getDefaultTheme();
  }

  /**
   * Resolve active theme for a given layout
   *
   * @param layoutName - Layout name (e.g., 'public', 'private')
   * @returns Theme name from themes.json manifest
   */
  async resolveThemeForLayout(layoutName: string): Promise<string> {
    const normalizedLayoutName = this.normalizeLayoutName(layoutName);

    this.logger.debug('[ThemeResolverService] Resolving theme for layout', {
      layoutName,
      normalizedLayoutName
    });

    // Priority 1: Check custom/frontend/layouts/{layoutName}/theme.json
    const themeFromConfig = await this.getThemeFromConfig(normalizedLayoutName);
    if (themeFromConfig) {
      this.logger.info('[ThemeResolverService] Theme resolved from theme.json', {
        layout: normalizedLayoutName,
        theme: themeFromConfig,
        source: 'theme.json'
      });
      return themeFromConfig;
    }

    // Priority 2: Check custom/styles/themes/{layoutName}/
    const themeFromStylesDir = await this.getThemeFromStylesDirectory(normalizedLayoutName);
    if (themeFromStylesDir) {
      this.logger.info('[ThemeResolverService] Theme resolved from styles directory', {
        layout: normalizedLayoutName,
        theme: themeFromStylesDir,
        source: 'styles-directory'
      });
      return themeFromStylesDir;
    }

    // Priority 3: Fallback to default theme from auto-themes.json
    const defaultTheme = this.getDefaultTheme();
    this.logger.info('[ThemeResolverService] Using default theme', {
      layout: normalizedLayoutName,
      theme: defaultTheme,
      source: 'fallback'
    });
    return defaultTheme;
  }

  /**
   * Priority 1: Read theme from custom/frontend/layouts/{layoutName}/theme.json
   */
  private async getThemeFromConfig(layoutName: string): Promise<string | null> {
    const themeConfigPath = path.join(
      this.projectRoot,
      'custom/frontend/layouts',
      layoutName,
      'theme.json'
    );

    if (!(await this.fileExists(themeConfigPath))) {
      this.logger.debug('[ThemeResolverService] theme.json not found', {
        path: themeConfigPath
      });
      return null;
    }

    try {
      const configContent = await fs.readFile(themeConfigPath, 'utf-8');
      const config: ThemeConfig = JSON.parse(configContent);

      if (config.theme && typeof config.theme === 'string') {
        this.logger.debug('[ThemeResolverService] theme.json parsed successfully', {
          theme: config.theme,
          path: themeConfigPath
        });
        return config.theme;
      }

      this.logger.warn('[ThemeResolverService] theme.json missing "theme" field', {
        path: themeConfigPath
      });
      return null;
    } catch (error) {
      this.logger.error('[ThemeResolverService] Failed to parse theme.json', {
        path: themeConfigPath,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Priority 2: Check if custom/frontend/styles/themes/{layoutName}/ exists
   */
  private async getThemeFromStylesDirectory(layoutName: string): Promise<string | null> {
    const themeName = layoutName;
    const stylesDir = path.join(
      this.projectRoot,
      'custom/styles/themes',
      themeName
    );

    const tokensFile = path.join(stylesDir, '00-tokens.css');

    // Validate theme directory exists and has 00-tokens.css
    const dirExists = await this.directoryExists(stylesDir);
    const tokensExists = await this.fileExists(tokensFile);

    if (dirExists && tokensExists) {
      this.logger.debug('[ThemeResolverService] Custom theme directory found', {
        themeName,
        stylesDir
      });
      return themeName;
    }

    this.logger.debug('[ThemeResolverService] Custom theme directory not found', {
      themeName,
      stylesDir,
      dirExists,
      tokensExists
    });
    return null;
  }

  /**
   * Normalize layout name (remove .html, slashes, etc.)
   */
  private normalizeLayoutName(layoutName: string | null | undefined): string {
    if (!layoutName || !layoutName.trim()) {
      return 'public';
    }

    return layoutName
      .replace(/\.html$/i, '')
      .replace(/\\/g, '/')
      .split('/')
      .filter(segment => segment && segment !== '..')
      .join('/') || 'public';
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      await fs.access(dirPath);
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
