import { BaseService } from '@/core/base/BaseService.js';
import { Service } from '@/core/decorators/component.js';
import fs from 'fs/promises';
import path from 'path';
import { renderDxceContentForStaticCache } from '../utils/dxceRenderer.js';

interface CacheTemplate {
  head: string;
  bodyOpenTag: string;
  wrapperStart: string;
  mainContentPlaceholder: string;
  wrapperEnd: string;
  closingTags: string;
}

interface GenerateOptions {
  title: string;
  content: string;
  sitePath: string;
  metaDescription?: string;
  metaKeywords?: string;
  theme?: string;
}

/**
 * Template Generator Service
 * Fast HTML generation using Puppeteer template approach
 */
@Service()
export class TemplateGeneratorService extends BaseService {
  private template: CacheTemplate | null = null;
  private templatePath: string;

  constructor() {
    super();
    this.templatePath = path.join(
      process.env.PROJECT_PATH || process.cwd(),
      'storage/html-cache/cache-template.json'
    );
  }

  /**
   * Load template from JSON file
   */
  private async loadTemplate(): Promise<CacheTemplate> {
    if (this.template) {
      return this.template;
    }

    try {
      const templateJson = await fs.readFile(this.templatePath, 'utf-8');
      this.template = JSON.parse(templateJson);
      this.logger.info('[TemplateGeneratorService] Template loaded successfully');
      return this.template!;
    } catch (error: any) {
      this.logger.error('[TemplateGeneratorService] Failed to load template', { error });
      throw new Error(`Failed to load template: ${error.message}`);
    }
  }

  /**
   * Generate HTML from template
   */
  async generate(options: GenerateOptions): Promise<string> {
    const template = await this.loadTemplate();

    // Customize head section
    let customHead = template.head;

    // Ensure Tailwind CSS is included (add after </title> if not present)
    if (!customHead.includes('/styles/shared/tailwind.css')) {
      customHead = customHead.replace(
        /<\/title>/,
        `</title>\n  <link rel="stylesheet" href="/styles/shared/tailwind.css">`
      );
    }

    // Replace title
    customHead = customHead.replace(
      /<title>.*?<\/title>/g,
      `<title>${this.escapeHtml(options.title)}</title>`
    );

    // Update meta description
    if (options.metaDescription) {
      customHead = customHead.replace(
        /<meta name="description" content=".*?">/g,
        `<meta name="description" content="${this.escapeHtml(options.metaDescription)}">`
      );
    }

    // Update meta keywords
    if (options.metaKeywords) {
      if (customHead.includes('<meta name="keywords"')) {
        customHead = customHead.replace(
          /<meta name="keywords" content=".*?">/g,
          `<meta name="keywords" content="${this.escapeHtml(options.metaKeywords)}">`
        );
      } else {
        // Add keywords meta tag after description
        customHead = customHead.replace(
          /(<meta name="description"[^>]*>)/,
          `$1\n  <meta name="keywords" content="${this.escapeHtml(options.metaKeywords)}">`
        );
      }
    }

    // Update theme if provided
    if (options.theme) {
      customHead = customHead.replace(
        /data-theme="[^"]*"/,
        `data-theme="${options.theme}"`
      );
      if (customHead.includes('data-reference-theme')) {
        customHead = customHead.replace(
          /data-reference-theme="[^"]*"/,
          `data-reference-theme="${options.theme}"`
        );
      }
    }

    // Update __CACHED_ROUTE__ metadata
    const cacheMetadata = `
window.__CACHED_ROUTE__ = {
  path: "${options.sitePath}",
  name: "cached-${options.sitePath.replace(/\//g, '-')}",
  meta: {
    cached: true,
    cachedAt: "${new Date().toISOString()}",
    generatedBy: "TemplateGeneratorService",
    method: "puppeteer-template-fast",
    generatedMs: 0
  }
};`;

    customHead = customHead.replace(
      /window\.__CACHED_ROUTE__\s*=\s*\{[^}]+\};/gs,
      cacheMetadata
    );

    // Normalize DXCE content and wrap it in proper CMS structure
    const dxceContent = renderDxceContentForStaticCache(options.content || '');
    const wrappedContent = `
<div data-v-25aba3b3="" class="content-container pt-8 content-width-wide overflow-hidden">
  <div data-v-1e2c1a25="" data-v-25aba3b3="" class="dx-content-renderer canvas-mode">
    <div data-v-1e2c1a25="" class="dxce-preview">
      <div data-v-1e2c1a25="" class="canvas">
        ${dxceContent}
      </div>
    </div>
  </div>
</div>
    `.trim();

    // Assemble final HTML
    const fullHtml =
      customHead +
      ' ' +
      template.bodyOpenTag +
      ' ' +
      template.wrapperStart +
      wrappedContent +
      template.wrapperEnd +
      template.closingTags;

    return fullHtml;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
