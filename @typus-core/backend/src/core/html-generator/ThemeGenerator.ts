import * as fs from 'fs';
import * as path from 'path';

export interface ThemeConfig {
  name: string;
  title: string;
  type: 'light' | 'dark';
}

export class ThemeGenerator {
  private themesDir: string;
  private availableThemes: ThemeConfig[];

  constructor(frontendPublicDir: string) {
    this.themesDir = path.join(frontendPublicDir, 'themes');
    this.availableThemes = this.loadThemesFromManifest(frontendPublicDir);
  }

  /**
   * Load themes from themes.json manifest
   */
  private loadThemesFromManifest(frontendPublicDir: string): ThemeConfig[] {
    const manifestPath = path.join(
      frontendPublicDir,
      '../src/auto-themes.json'
    );

    if (!fs.existsSync(manifestPath)) {
      console.warn(`Themes manifest not found: ${manifestPath}`);
      return [];
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      return manifest.map((theme: any) => ({
        name: theme.name,
        title: theme.title,
        type: theme.type
      }));
    } catch (error) {
      console.error('Error loading themes manifest:', error);
      return [];
    }
  }

  /**
   * Get all available themes
   */
  getAvailableThemes(): ThemeConfig[] {
    return this.availableThemes;
  }

  /**
   * Read CSS variables file for a theme
   */
  getThemeCSS(themeName: string): string | null {
    const cssPath = path.join(this.themesDir, themeName, 'variables.css');

    if (!fs.existsSync(cssPath)) {
      console.warn(`Theme CSS not found: ${cssPath}`);
      return null;
    }

    return fs.readFileSync(cssPath, 'utf-8');
  }

  /**
   * Generate <link> tags for all themes
   * Use this in <head> section
   */
  generateThemeLinkTags(): string {
    return this.availableThemes
      .map(theme => `<link rel="stylesheet" href="/themes/${theme.name}/variables.css">`)
      .join('\n    ');
  }

  /**
   * Generate inline <style> with all themes
   * Use this for fully self-contained HTML
   */
  generateInlineThemeStyles(): string {
    const allCSS = this.availableThemes
      .map(theme => this.getThemeCSS(theme.name))
      .filter(css => css !== null)
      .join('\n\n');

    return `<style>\n${allCSS}\n</style>`;
  }

  /**
   * Wrap HTML content with theme attributes
   */
  wrapWithTheme(htmlContent: string, themeName?: string): string {
    const theme = themeName || this.availableThemes[0]?.name || 'default';

    // Add data-theme attribute to <html> tag
    const htmlWithTheme = htmlContent.replace(
      /<html([^>]*)>/i,
      `<html$1 data-theme="${theme}">`
    );

    return htmlWithTheme;
  }

  /**
   * Generate complete HTML page with theme support
   */
  generateThemedPage(options: {
    title: string;
    content: string;
    theme?: string;
    inlineCSS?: boolean;
  }): string {
    const defaultTheme = this.availableThemes[0]?.name || 'default';
    const { title, content, theme = defaultTheme, inlineCSS = false } = options;

    const themeStyles = inlineCSS
      ? this.generateInlineThemeStyles()
      : this.generateThemeLinkTags();

    return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>

  ${themeStyles}

  <style>
    /* Base styles using theme variables */
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: var(--color-bg-primary);
      color: var(--color-text-primary);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  }
}

/**
 * Example usage:
 *
 * const generator = new ThemeGenerator('/app/@typus-core/frontend/public');
 *
 * // Method 1: External CSS files
 * const linkTags = generator.generateThemeLinkTags();
 * // Generates link tags for all themes from themes.json
 *
 * // Method 2: Inline styles (self-contained HTML)
 * const inlineStyles = generator.generateInlineThemeStyles();
 * // <style>... all theme CSS ...</style>
 *
 * // Method 3: Full page generation
 * const html = generator.generateThemedPage({
 *   title: 'My Page',
 *   content: '<h1 class="text-primary">Hello World</h1>',
 *   theme: 'custom-theme',
 *   inlineCSS: true
 * });
 */
