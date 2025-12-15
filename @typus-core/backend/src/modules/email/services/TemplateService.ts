import { BaseService } from '../../../core/base/BaseService.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BadRequestError } from '../../../core/base/BaseError.js';
import { Service } from '../../../core/decorators/component.js';
import { fileURLToPath } from 'url'; 
import { dirname } from 'path'

/**
 * Service for email templates
 */
@Service()
export class TemplateService extends BaseService {
    private templatesDir: string;
    private templateCache: Map<string, string> = new Map();

    constructor() {
        super();

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        // Templates directory is relative to the project root
        this.templatesDir = path.resolve(__dirname, '..', 'templates');
        this.logger.info(`[TemplateService] Templates directory: ${this.templatesDir}`);
    }

    /**
     * Load template from file
     */
    async loadTemplate(templateName: string, type: 'html' | 'text'): Promise<string> {
        const cacheKey = `${templateName}:${type}`;
        
        // Check if template is in cache
        if (this.templateCache.has(cacheKey)) {
            return this.templateCache.get(cacheKey) as string;
        }
        
        try {
            // Construct template path
            const templatePath = path.join(this.templatesDir, templateName, `${type}.tpl`);
            
            // Read template file
            const template = await fs.readFile(templatePath, 'utf-8');
            
            // Cache template
            this.templateCache.set(cacheKey, template);
            
            return template;
        } catch (error) {
            this.logger.error(`[TemplateService] Failed to load template: ${templateName}/${type}.tpl`, error);
            throw new BadRequestError(`Template not found: ${templateName}`);
        }
    }

    /**
     * Compile template with data
     */
    compileTemplate(template: string, data: Record<string, any>): string {
        // Replace variables in template
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : match;
        });
    }

    /**
     * Load and compile template
     */
    async getCompiledTemplate(templateName: string, type: 'html' | 'text', data: Record<string, any>): Promise<string> {
        // Load template
        const template = await this.loadTemplate(templateName, type);
        
        // Compile template with data
        return this.compileTemplate(template, data);
    }

    /**
     * Clear template cache
     */
    clearCache(): void {
        this.templateCache.clear();
        this.logger.info('[TemplateService] Template cache cleared');
    }
}
