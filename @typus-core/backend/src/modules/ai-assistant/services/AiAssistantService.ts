import { Service, inject } from '@/core/decorators/component';
import { BaseService } from '@/core/base/BaseService';
import { NotFoundError, BadRequestError } from '@/core/base/BaseError.js';
import { ConfigService } from '@/modules/system/services/ConfigService';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { SeoGenerationResponse, CmsItemData } from '../types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * AI Assistant Service for SEO generation using OpenRouter
 * Configuration loaded from database (ai.openrouter.*) with fallback to .env
 * OpenRouter supports multiple models: Claude, GPT, Gemini, etc.
 */
@Service()
export class AiAssistantService extends BaseService {
  private readonly openRouterApiKeyFallback: string;
  private readonly openRouterModelFallback: string;
  private readonly OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(
    @inject(ConfigService) private readonly configService: ConfigService
  ) {
    super();
    // Fallback to env variables (will be overridden by ConfigService if available)
    this.openRouterApiKeyFallback = process.env.AI_OPENROUTER_API_KEY || '';
    this.openRouterModelFallback = process.env.AI_OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

    if (!this.openRouterApiKeyFallback) {
      this.logger.warn('[AiAssistantService] AI_OPENROUTER_API_KEY not found in environment variables - will check database');
    }
  }

  async generateSeoFromContent(cmsItemId: number): Promise<SeoGenerationResponse> {
    this.logger.info(`[AiAssistantService] Generating SEO for CMS item ${cmsItemId}`);

    // Get CMS item data
    const cmsItem = await this.getCmsItemData(cmsItemId);
    
    // Load prompt template
    const promptTemplate = await this.loadPromptTemplate('seo-generation.txt');
    
    // Generate prompt with data
    const prompt = this.generatePrompt(promptTemplate, cmsItem);
    
    // Call OpenRouter API
    const seoData = await this.callOpenRouterApi(prompt);
    
    this.logger.info(`[AiAssistantService] SEO generated successfully for CMS item ${cmsItemId}`);
    return seoData;
  }

  private async getCmsItemData(id: number): Promise<CmsItemData> {
    const cmsItem = await this.prisma.cmsItem.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        sitePath: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true
      }
    });

    if (!cmsItem) {
      throw new NotFoundError(`CMS item with ID ${id} not found`);
    }

    return cmsItem;
  }

  
  private static isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

private async loadPromptTemplate(templateName: string): Promise<string> {
  try {
    const isProduction = AiAssistantService.isProductionEnvironment();
    const basePath = isProduction 
      ? join(process.cwd(), 'dist', 'backend', 'src') 
      : join(process.cwd(), 'src');
    
    const templatePath = join(basePath, 'modules/ai-assistant/templates', templateName);
    const template = await readFile(templatePath, 'utf-8');
    return template;
  } catch (error) {
    this.logger.error(`[AiAssistantService] Failed to load template ${templateName}:`, error);
    throw new BadRequestError(`Template ${templateName} not found`);
  }
}


  private generatePrompt(template: string, data: CmsItemData): string {
    // Strip HTML tags from content for cleaner analysis
    const cleanContent = this.stripHtmlTags(data.content || '');
    
    return template
      .replace('{title}', data.title || '')
      .replace('{content}', cleanContent.substring(0, 2000)) // Limit content length
      .replace('{sitePath}', data.sitePath || '');
  }

  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
  }

private async callOpenRouterApi(prompt: string): Promise<SeoGenerationResponse> {
  // Get config from database with fallback to env
  const apiKey = await this.configService.get('ai.openrouter.api_key') || this.openRouterApiKeyFallback;
  const model = await this.configService.get('ai.openrouter.model') || this.openRouterModelFallback;

  if (!apiKey) {
    this.logger.warn('[AiAssistantService] OpenRouter API key not configured - AI features disabled');
    throw new BadRequestError('OpenRouter API key not configured. Set AI_OPENROUTER_API_KEY in .env or ai.openrouter.api_key in config.');
  }

  const configSource = apiKey === this.openRouterApiKeyFallback ? 'env' : 'database';

  try {
    this.logger.info('[AiAssistantService] Sending request to OpenRouter:', {
      prompt: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),
      promptLength: prompt.length,
      model,
      configSource
    });

    const requestBody = {
      model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2048
    };

    const response = await fetch(this.OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.SITE_URL,
        'X-Title': 'Typus CMS'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`[AiAssistantService] OpenRouter API error: ${response.status} - ${errorText}`);
      throw new BadRequestError(`AI service error: ${response.status}`);
    }

    const result = await response.json();

    this.logger.info('[AiAssistantService] OpenRouter API response:', {
      status: response.status,
      model: result.model,
      usage: result.usage,
      hasChoices: !!result.choices?.length
    });

    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      this.logger.error('[AiAssistantService] Invalid response structure from OpenRouter');
      throw new BadRequestError('Invalid response from AI service');
    }

    const generatedText = result.choices[0].message.content;

    if (!generatedText) {
      this.logger.error('[AiAssistantService] Empty response from OpenRouter');
      throw new BadRequestError('AI service returned empty response');
    }
    
    // LOG RAW GENERATED TEXT
    this.logger.info('[AiAssistantService] Raw generated text:', {
      text: generatedText,
      length: generatedText?.length,
      hasCodeBlocks: generatedText?.includes('```'),
      hasJsonBlock: generatedText?.includes('```json'),
      finishReason: result.choices[0].finish_reason
    });
    
    // Parse JSON response - handle markdown code blocks
    let jsonText = generatedText;
    try {
      // Remove markdown code blocks if present
      if (jsonText.includes('```json')) {
        const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonText = match[1];
          this.logger.info('[AiAssistantService] Extracted JSON from ```json block:', jsonText);
        }
      } else if (jsonText.includes('```')) {
        const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
          jsonText = match[1];
          this.logger.info('[AiAssistantService] Extracted JSON from ``` block:', jsonText);
        }
      }

      // Clean up the JSON text
      jsonText = jsonText.trim();
      
      this.logger.info('[AiAssistantService] Final JSON text to parse:', {
        text: jsonText,
        length: jsonText.length
      });
      
      const seoData = JSON.parse(jsonText);
      
      this.logger.info('[AiAssistantService] Successfully parsed JSON:', seoData);
      
      // Validate required fields
      if (!seoData.metaTitle || !seoData.metaDescription) {
        this.logger.error('[AiAssistantService] Missing required fields:', {
          hasMetaTitle: !!seoData.metaTitle,
          hasMetaDescription: !!seoData.metaDescription,
          receivedData: seoData
        });
        throw new BadRequestError('AI service returned incomplete SEO data');
      }

      const response = {
        metaTitle: seoData.metaTitle,
        metaDescription: seoData.metaDescription,
        metaKeywords: seoData.metaKeywords || '',
        ogTitle: seoData.ogTitle || seoData.metaTitle,
        ogDescription: seoData.ogDescription || seoData.metaDescription
      };

      this.logger.info('[AiAssistantService] Final response:', response);
      
      return response;
      
    } catch (parseError) {
      this.logger.error(`[AiAssistantService] Failed to parse AI response:`, {
        error: parseError.message,
        stack: parseError.stack,
        rawText: generatedText,
        attemptedJsonText: jsonText || 'N/A'
      });
      throw new BadRequestError('AI service returned invalid JSON');
    }
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    
    this.logger.error(`[AiAssistantService] OpenRouter API call failed:`, {
      error: error.message,
      stack: error.stack
    });
    throw new BadRequestError('Failed to generate SEO data');
  }
}


}
