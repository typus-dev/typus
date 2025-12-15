import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Theme manifest structure from themes.json
 */
export interface ThemeManifest {
  name: string;
  title: string;
  icon: string;
  type: 'light' | 'dark';
  description?: string;
  default?: boolean;
}

/**
 * CSS files that make up a complete theme
 * These are loaded in order for each theme
 */
const THEME_CSS_FILES = [
  '00-tokens.css',
  '01-base.css',
  '02-typography.css',
  '03-content.css',
  '04-colors.css',
  '05-layout.css',
  '06-components.css',
  '07-mixins.css',
  '07-effects.css',
  '99-overrides.css'
];

/**
 * Shared CSS files that apply to all themes
 */
const SHARED_CSS_FILES = [
  'content.css',
  'dxce-preview.css',
  'utilities.css',
  'tailwind.css'
];

/**
 * ThemeLinksGenerator
 *
 * Dynamically generates CSS link tags for all available themes
 * by reading from the generated themes.json manifest.
 *
 * This enables zero-config theme registration - just add a theme
 * to custom/frontend/styles/ and regenerate themes.json.
 */
export class ThemeLinksGenerator {
  private themes: ThemeManifest[] = [];
  private themesJsonPath: string;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.themesJsonPath = join(
      this.projectRoot,
      '@typus-core/frontend/src/auto-themes.json'
    );
    this.loadThemes();
  }

  /**
   * Load themes from themes.json
   */
  private loadThemes(): void {
    try {
      if (existsSync(this.themesJsonPath)) {
        const content = readFileSync(this.themesJsonPath, 'utf-8');
        this.themes = JSON.parse(content);
      } else {
        // No fallback - fail loudly if themes.json missing
        console.error('❌ Themes manifest not found! Run: npm run build:themes');
        console.error(`   Expected: ${this.themesJsonPath}`);
        this.themes = [];
      }
    } catch (error) {
      console.error('Error loading themes manifest:', error);
      this.themes = [];
    }
  }

  /**
   * Generate link tags for shared CSS files
   */
  private generateSharedLinks(): string[] {
    const version = Date.now();
    return SHARED_CSS_FILES.map(
      file => `<link rel="stylesheet" href="/styles/shared/${file}?v=${version}">`
    );
  }

  /**
   * Generate link tags for a single theme
   */
  private generateThemeLinks(themeName: string): string[] {
    const version = Date.now();
    return THEME_CSS_FILES.map(
      file => `<link rel="stylesheet" href="/styles/themes/${themeName}/${file}?v=${version}">`
    );
  }

  /**
   * Generate link tags for ALL available themes
   * Used in HTML templates for instant theme switching
   */
  generateAllThemeLinks(): string {
    const links: string[] = [];

    // Shared utilities first
    links.push(...this.generateSharedLinks());

    // All theme CSS files
    for (const theme of this.themes) {
      links.push(`<!-- Theme: ${theme.title} (${theme.name}) -->`);
      links.push(...this.generateThemeLinks(theme.name));
    }

    return links.join('\n    ');
  }

  /**
   * Generate link tags for a specific theme only
   * Used when loading only one theme (optimization)
   */
  generateSingleThemeLinks(themeName: string): string {
    const links: string[] = [];

    // Shared utilities
    links.push(...this.generateSharedLinks());

    // Single theme
    links.push(...this.generateThemeLinks(themeName));

    return links.join('\n    ');
  }

  /**
   * Get list of all available theme names
   */
  getThemeNames(): string[] {
    return this.themes.map(t => t.name);
  }

  /**
   * Get all theme manifests
   */
  getThemes(): ThemeManifest[] {
    return [...this.themes];
  }

  /**
   * Check if a theme exists
   */
  hasTheme(themeName: string): boolean {
    return this.themes.some(t => t.name === themeName);
  }

  /**
   * Get default theme name (theme with default: true, or first theme)
   */
  getDefaultTheme(): string {
    const defaultTheme = this.themes.find(t => t.default === true);
    return defaultTheme?.name || this.themes[0]?.name || 'default';
  }

  /**
   * Reload themes from disk
   * Call this after adding new themes
   */
  reload(): void {
    this.loadThemes();
  }

  /**
   * Normalize theme name
   */
  normalizeThemeName(theme?: string | null): string {
    if (!theme) {
      return this.getDefaultTheme();
    }

    // Validate theme exists
    if (this.hasTheme(theme)) {
      return theme;
    }

    // Fallback to default
    return this.getDefaultTheme();
  }
}

// Singleton instance for shared use
let instance: ThemeLinksGenerator | null = null;

/**
 * Get shared ThemeLinksGenerator instance
 */
export function getThemeLinksGenerator(projectRoot?: string): ThemeLinksGenerator {
  if (!instance) {
    instance = new ThemeLinksGenerator(projectRoot);
  }
  return instance;
}

/**
 * Reset singleton (useful for testing or reloading)
 */
export function resetThemeLinksGenerator(): void {
  instance = null;
}
