import { BaseService } from '../../../core/base/BaseService.js';
import { Service, inject } from '../../../core/decorators/component.js';
import { NotFoundError } from '../../../core/base/BaseError.js';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { ThemeResolverService } from './ThemeResolverService.js';
import { getThemeLinksGenerator } from '../../../core/html-generator/ThemeLinksGenerator.js';

export interface LayoutNavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface LayoutFooterLink {
  label: string;
  href: string;
}

export interface LayoutContactInfo {
  email?: string;
  phone?: string;
}

export interface LayoutRenderContext {
  title: string;
  content: string;
  siteName?: string;
  siteUrl?: string;
  language?: string;
  theme?: string;
  activeTheme?: string; // 🎯 NEW: Active theme resolved by ThemeResolverService
  bodyClass?: string;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  canonicalUrl?: string | null;
  robotsMeta?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  ogType?: string | null;
  customCSS?: string | null;
  structuredData?: string | null;
  includeJS?: boolean;
  analyticsId?: string | null;
  navItems?: LayoutNavItem[];
  footerLinks?: LayoutFooterLink[];
  contact?: LayoutContactInfo;
  user?: { name?: string } | null;
  currentYear?: number;
  currentPath?: string;
  buildVersion?: string;
}

interface CachedTemplate {
  compiled: Handlebars.TemplateDelegate;
  mtimeMs: number;
  path: string;
  source: string;
}

@Service()
export class LayoutTemplateService extends BaseService {
  private readonly projectRoot: string;
  private readonly templateCache = new Map<string, CachedTemplate>();
  private buildVersion = 'dev';

  constructor(
    @inject(ThemeResolverService) private readonly themeResolverService: ThemeResolverService
  ) {
    super();
    // Always use /app in container (templates are mounted there)
    this.projectRoot = '/app';
    this.buildVersion = this.loadBuildVersion();
    this.registerHelpers();
  }

  /**
   * Render layout with resolved template
   */
  async render(layoutName: string | null | undefined, context: LayoutRenderContext): Promise<string> {
    const normalizedName = (layoutName && layoutName.trim()) || 'public';
    const { compiled, source } = await this.getCompiledTemplate(normalizedName);

    // 🎯 Resolve active theme using ThemeResolverService
    const activeTheme = context.activeTheme || await this.themeResolverService.resolveThemeForLayout(normalizedName);

    const currentYear = context.currentYear ?? new Date().getFullYear();
    const siteName = context.siteName || global.runtimeConfig?.siteName || 'Typus';
    const siteUrl = context.siteUrl || global.runtimeConfig?.siteUrl || '';

    // Navigation comes from _header.html partial (single source of truth)
    const navItems = context.navItems?.map((item) => ({
      ...item,
      active: typeof item.active === 'boolean' ? item.active : item.href === context.currentPath
    })) ?? [];

    // Footer links come from _footer.html partial (single source of truth)
    const footerLinks = context.footerLinks ?? [];

    // Generate theme CSS links dynamically (only for active theme)
    const themeLinksGenerator = getThemeLinksGenerator(this.projectRoot);
    const themeLinks = normalizedName === 'public'
      ? themeLinksGenerator.generateAllThemeLinks()
      : themeLinksGenerator.generateSingleThemeLinks(activeTheme);

    // 🎯 Get theme data for dynamic templates
    const defaultTheme = themeLinksGenerator.getDefaultTheme();
    const availableThemes = themeLinksGenerator.getThemeNames();
    const themesManifest = themeLinksGenerator.getThemes();

    const templateContext = {
      ...context,
      currentYear,
      siteName,
      siteUrl,
      language: context.language,
      theme: context.theme,
      activeTheme, // 🎯 NEW: Resolved theme for Handlebars templates
      themeLinks, // 🎯 NEW: Dynamic theme CSS links
      defaultTheme, // 🎯 NEW: Default theme name for fallbacks
      availableThemes, // 🎯 NEW: Array of theme names
      themesManifest, // 🎯 NEW: Full theme manifest with metadata
      bodyClass: context.bodyClass,
      robotsMeta: context.robotsMeta,
      ogType: context.ogType,
      navItems,
      footerLinks,
      buildVersion: this.buildVersion,
      source
    };

    this.logger.debug('[LayoutTemplateService.render] 🔍 DEBUG template context', {
      layout: normalizedName,
      'context.bodyClass': context.bodyClass,
      'templateContext.bodyClass': templateContext.bodyClass,
      'context.language': context.language,
      'context.theme': context.theme,
      'context.robotsMeta': context.robotsMeta,
      'context.ogType': context.ogType
    });

    return compiled(templateContext);
  }

  private loadBuildVersion(): string {
    try {
      const manifestPath = path.join(this.projectRoot, 'typus-manifest.json');
      const raw = readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw);
      return manifest.version || manifest.app_version || 'dev';
    } catch (error) {
      this.logger.warn('[LayoutTemplateService] Failed to load build version from typus-manifest.json', {
        error: error instanceof Error ? error.message : error
      });
      return 'dev';
    }
  }

  /**
   * Resolve and cache layout template
   */
  private async getCompiledTemplate(layoutName: string): Promise<CachedTemplate> {
    const layoutFileName = this.normalizeLayoutFileName(layoutName);
    const resolved = await this.resolveLayoutFile(layoutFileName);
    const cacheKey = resolved.path;

    const stats = await fs.stat(resolved.path);
    const cached = this.templateCache.get(cacheKey);

    if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cached;
    }

    // Load and register partials before compiling template
    await this.registerPartials(layoutFileName.replace(/\.html$/i, ''));

    const fileContent = await fs.readFile(resolved.path, 'utf-8');
    const compiled = Handlebars.compile(fileContent);
    const entry: CachedTemplate = {
      compiled,
      mtimeMs: stats.mtimeMs,
      path: resolved.path,
      source: resolved.source
    };

    this.templateCache.set(cacheKey, entry);
    this.logger.debug('[LayoutTemplateService] Compiled layout template', {
      layout: layoutName,
      source: resolved.source,
      path: resolved.path
    });

    return entry;
  }

  /**
   * Register partials (header, footer) for Handlebars
   */
  private async registerPartials(layoutName: string): Promise<void> {
    const partialNames = ['header', 'footer'];

    for (const partialName of partialNames) {
      const content = await this.resolvePartial(layoutName, `_${partialName}.html`);
      if (content) {
        Handlebars.registerPartial(partialName, content);
        this.logger.debug('[LayoutTemplateService] Registered partial', { layout: layoutName, partial: partialName });
      }
    }
  }

  /**
   * Get partial content by name (public API for other services)
   * Resolves with cascade: custom → plugins → core
   */
  async getPartialContent(layoutName: string, partialName: string): Promise<string> {
    return this.resolvePartial(layoutName, `_${partialName}.html`);
  }

  /**
   * Resolve partial file by cascade (custom → plugins → core)
   */
  private async resolvePartial(layoutName: string, partialFileName: string): Promise<string> {
    const candidates = [
      // 1. Custom
      path.join(this.projectRoot, 'custom/frontend/layouts', layoutName, partialFileName),
      // 2. Plugins (iterate)
      ...(await this.getPluginPartialCandidates(layoutName, partialFileName)),
      // 3. Core
      path.join(this.projectRoot, '@typus-core/frontend/src/layouts', layoutName, partialFileName)
    ];

    for (const candidatePath of candidates) {
      if (await this.fileExists(candidatePath)) {
        const content = await fs.readFile(candidatePath, 'utf-8');
        this.logger.debug('[LayoutTemplateService] Resolved partial', { path: candidatePath });
        return content;
      }
    }

    this.logger.debug('[LayoutTemplateService] Partial not found', { layout: layoutName, partial: partialFileName });
    return '';
  }

  /**
   * Get plugin paths for partial
   */
  private async getPluginPartialCandidates(layoutName: string, partialFileName: string): Promise<string[]> {
    const pluginsDir = path.join(this.projectRoot, 'plugins');
    const pluginDirs = await this.safeReadDir(pluginsDir);

    return pluginDirs.map((pluginName) =>
      path.join(pluginsDir, pluginName, 'frontend/layouts', layoutName, partialFileName)
    );
  }

  /**
   * Resolve template path by cascade (custom → plugins → core)
   * Templates are now stored as template.html next to index.vue in layout directories
   */
  private async resolveLayoutFile(layoutFileName: string): Promise<{ path: string; source: string }> {
    const normalizedName = layoutFileName.replace(/\.html$/i, '')
    const candidates = [
      {
        path: path.join(this.projectRoot, 'custom/frontend/layouts', normalizedName, 'template.html'),
        source: 'custom'
      },
      ...(await this.getPluginCandidates(normalizedName)),
      {
        path: path.join(this.projectRoot, '@typus-core/frontend/src/layouts', normalizedName, 'template.html'),
        source: 'core'
      }
    ];

    for (const candidate of candidates) {
      if (await this.fileExists(candidate.path)) {
        return candidate;
      }
    }

    throw new NotFoundError(`Layout template "${normalizedName}/template.html" not found in custom, plugins, or core directories.`);
  }

  /**
   * Build plugin candidate list
   */
  private async getPluginCandidates(layoutName: string): Promise<Array<{ path: string; source: string }>> {
    const pluginsDir = path.join(this.projectRoot, 'plugins');
    const pluginDirs = await this.safeReadDir(pluginsDir);

    return pluginDirs.map((pluginName) => ({
      path: path.join(pluginsDir, pluginName, 'frontend/layouts', layoutName, 'template.html'),
      source: `plugin:${pluginName}`
    }));
  }

  /**
   * Safe readdir returning directory names only
   */
  private async safeReadDir(dirPath: string): Promise<string[]> {
    try {
      const dirents = await fs.readdir(dirPath, { withFileTypes: true });
      return dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private normalizeLayoutFileName(layoutName: string): string {
    const trimmed = layoutName.replace(/\.html$/i, '').replace(/\\/g, '/');
    const segments = trimmed.split('/').filter((segment) => segment && segment !== '..');
    const safeName = segments.join('/') || 'public';
    return `${safeName}.html`;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private registerHelpers(): void {
    Handlebars.registerHelper('eq', function eq(this: any, a: any, b: any, options: Handlebars.HelperOptions) {
      return a === b ? options.fn(this) : options.inverse(this);
    });

    // 🎯 Helper for outputting JSON in templates
    Handlebars.registerHelper('json', function(context: any) {
      return JSON.stringify(context);
    });
  }
}
