/**
 * Runtime Configuration
 *
 * Loaded from database at application startup
 * Provides synchronous access to frequently used configs
 */

import { Logger } from '@/core/logger/Logger.js';

const logger = new Logger();

/**
 * Runtime configuration interface
 * These values are loaded from database and cached in memory
 */
export interface RuntimeConfig {
  // Site URLs
  siteUrl: string;
  siteName: string;

  // Queue Driver
  queueDriver: string;

  // Google OAuth (integrations)
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;

  // Twitter OAuth (integrations)
  twitterClientId: string;
  twitterClientSecret: string;
  twitterRedirectUri: string;

  // Add more as needed
  // emailFrom: string;
  // telegramBotToken: string;
  // etc.
}

/**
 * Default runtime configuration
 * Used as fallback before database is loaded
 */
const defaultRuntimeConfig: RuntimeConfig = {
  siteUrl: process.env.SITE_URL || process.env.APP_DOMAIN ? `https://${process.env.APP_DOMAIN}` : 'https://localhost:3000',
  siteName: process.env.SITE_NAME || 'Typus',

  // Queue driver fallback (from .env)
  queueDriver: process.env.QUEUE_DRIVER || 'database',

  // Google OAuth fallbacks (from .env)
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',

  // Twitter OAuth fallbacks (from .env)
  twitterClientId: process.env.TWITTER_CLIENT_ID || '',
  twitterClientSecret: process.env.TWITTER_CLIENT_SECRET || '',
  twitterRedirectUri: process.env.TWITTER_REDIRECT_URI || '/api/social-media/auth/twitter/callback'
};

/**
 * Global runtime configuration object
 */
let runtimeConfig: RuntimeConfig = { ...defaultRuntimeConfig };

/**
 * Load runtime configuration from database
 * Called during application startup
 */
export async function loadRuntimeConfig(configService: any): Promise<void> {
  try {
    logger.info('[RuntimeConfig] Loading from database...');

    // Load site URLs
    const siteUrl = await configService.get('site.url');
    if (siteUrl) {
      runtimeConfig.siteUrl = siteUrl;
      logger.debug('[RuntimeConfig] Loaded site.url from database:', siteUrl);
    }

    const siteName = await configService.get('site.name');
    if (siteName) {
      runtimeConfig.siteName = siteName;
      logger.debug('[RuntimeConfig] Loaded site.name from database:', siteName);
    }

    // Load queue driver
    const queueDriver = await configService.get('queue.driver');
    if (queueDriver) {
      runtimeConfig.queueDriver = queueDriver;
      logger.debug('[RuntimeConfig] Loaded queue.driver from database:', queueDriver);
    }

    // Load Google OAuth settings
    const googleClientId = await configService.getFromDb('integrations.google_client_id');
    if (googleClientId) {
      runtimeConfig.googleClientId = googleClientId;
      logger.debug('[RuntimeConfig] Loaded integrations.google_client_id from database');
    }

    const googleClientSecret = await configService.get('integrations.google_client_secret');
    if (googleClientSecret) {
      runtimeConfig.googleClientSecret = googleClientSecret;
      logger.debug('[RuntimeConfig] Loaded integrations.google_client_secret from database');
    }

    const googleCallbackUrl = await configService.getFromDb('integrations.google_callback_url');
    if (googleCallbackUrl) {
      runtimeConfig.googleCallbackUrl = googleCallbackUrl;
      logger.debug('[RuntimeConfig] Loaded integrations.google_callback_url from database');
    }

    // Load Twitter OAuth settings
    const twitterClientId = await configService.getFromDb('integrations.twitter_client_id');
    if (twitterClientId) {
      runtimeConfig.twitterClientId = twitterClientId;
      logger.debug('[RuntimeConfig] Loaded integrations.twitter_client_id from database');
    }

    const twitterClientSecret = await configService.get('integrations.twitter_client_secret');
    if (twitterClientSecret) {
      runtimeConfig.twitterClientSecret = twitterClientSecret;
      logger.debug('[RuntimeConfig] Loaded integrations.twitter_client_secret from database');
    }

    const twitterRedirectUri = await configService.getFromDb('integrations.twitter_redirect_uri');
    if (twitterRedirectUri) {
      runtimeConfig.twitterRedirectUri = twitterRedirectUri;
      logger.debug('[RuntimeConfig] Loaded integrations.twitter_redirect_uri from database');
    }

    logger.info('[RuntimeConfig] Loaded successfully', {
      siteUrl: runtimeConfig.siteUrl,
      siteName: runtimeConfig.siteName,
      googleOAuthConfigured: !!(runtimeConfig.googleClientId && runtimeConfig.googleClientSecret),
      twitterOAuthConfigured: !!(runtimeConfig.twitterClientId && runtimeConfig.twitterClientSecret)
    });
  } catch (error) {
    logger.warn('[RuntimeConfig] Failed to load from database, using defaults', { error });
  }
}

/**
 * Reload runtime configuration from database
 * Can be called to refresh configs without restart
 */
export async function reloadRuntimeConfig(configService: any): Promise<void> {
  await loadRuntimeConfig(configService);
  logger.info('[RuntimeConfig] Reloaded');
}

/**
 * Get current runtime configuration (synchronous)
 */
export function getRuntimeConfig(): RuntimeConfig {
  return runtimeConfig;
}

// Declare global type
declare global {
  namespace NodeJS {
    interface Global {
      runtimeConfig: RuntimeConfig;
    }
  }
}

// Set initial value
global.runtimeConfig = runtimeConfig;

export default runtimeConfig;
