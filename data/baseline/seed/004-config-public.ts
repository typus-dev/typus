/**
 * Public Configuration Seed
 *
 * Seeds public configuration values (accessible to frontend).
 * Uses upsert to be idempotent (safe to run multiple times).
 */

import { PrismaClient } from '../../prisma/generated/client/index.js';

export async function seedConfigPublic(prisma: PrismaClient) {
  const configs = [
    // Site Settings
    { key: 'site.name', value: 'My App', category: 'site', type: 'string', description: 'The name of your website' },
    { key: 'site.description', value: 'Your application description goes here', category: 'site', type: 'string', description: 'Site meta description for SEO' },
    { key: 'site.tagline', value: 'Your tagline here', category: 'site', type: 'string', description: 'Site tagline or slogan' },
    { key: 'site.timezone', value: 'UTC', category: 'site', type: 'string', description: 'Default timezone for the application' },
    { key: 'site.language', value: 'EN', category: 'site', type: 'string', description: 'Default language (ISO 639-1)' },
    { key: 'site.logo_url', value: '/favicon/logo.png', category: 'site', type: 'string', description: 'URL to site logo' },
    { key: 'site.favicon_url', value: '/favicon/favicon.svg', category: 'site', type: 'string', description: 'URL to favicon' },
    { key: 'site.url', value: 'https://example.com', category: 'site', type: 'string', description: 'Full site URL (e.g., https://example.com). Used for SEO, sitemaps, canonical URLs, and schema.org metadata.' },
    { key: 'site.base_url', value: 'https://example.com', category: 'site', type: 'string', description: 'Base URL for the site (e.g., https://example.com). Used for API responses, webhooks, and image URLs.' },
    { key: 'site.app_version', value: '1.0.0', category: 'site', type: 'string', description: 'Application version displayed in UI' },

    // Features
    { key: 'features.registration_enabled', value: 'false', category: 'features', type: 'boolean', description: 'Allow new user registrations' },
    { key: 'features.email_verification_required', value: 'false', category: 'features', type: 'boolean', description: 'Require email verification for new users' },
    { key: 'features.two_factor_auth_enabled', value: 'false', category: 'features', type: 'boolean', description: 'Enable two-factor authentication' },
    { key: 'features.comments_enabled', value: 'false', category: 'features', type: 'boolean', description: 'Enable comments on content' },
    { key: 'features.analytics_enabled', value: 'false', category: 'features', type: 'boolean', description: 'Enable analytics tracking' },
    { key: 'features.maintenance_mode', value: 'false', category: 'features', type: 'boolean', description: 'Enable maintenance mode' },
    { key: 'features.registration_type', value: 'simplified', category: 'features', type: 'string', description: 'Registration form type: "regular" (full form) or "simplified" (minimal form)' },

    // Security
    { key: 'security.password_min_length', value: '8', category: 'security', type: 'number', description: 'Minimum password length' },
    { key: 'security.password_require_uppercase', value: 'true', category: 'security', type: 'boolean', description: 'Require uppercase letters in passwords' },
    { key: 'security.password_require_numbers', value: 'true', category: 'security', type: 'boolean', description: 'Require numbers in passwords' },
    { key: 'security.password_require_special', value: 'false', category: 'security', type: 'boolean', description: 'Require special characters in passwords' },

    // Integrations
    { key: 'integrations.google_recaptcha_site_key', value: '', category: 'integrations', type: 'string', description: 'Google reCAPTCHA site key (public)' },
    { key: 'integrations.stripe_publishable_key', value: '', category: 'integrations', type: 'string', description: 'Stripe publishable key (public)' },
    { key: 'integrations.google_analytics_id', value: '', category: 'integrations', type: 'string', description: 'Google Analytics tracking ID (G-XXXXXXXXXX)' },
    { key: 'integrations.google_client_id', value: '', category: 'integrations', type: 'string', description: 'Google OAuth 2.0 Client ID (public, used for Google Sign-In)' },
    { key: 'integrations.google_callback_url', value: 'https://example.com/auth/google/callback', category: 'integrations', type: 'string', description: 'Google OAuth 2.0 callback URL (registered in Google Console)' },
    { key: 'integrations.twitter_client_id', value: '', category: 'integrations', type: 'string', description: 'Twitter OAuth 2.0 Client ID (public, used for social media integration)' },
    { key: 'integrations.twitter_redirect_uri', value: 'https://example.com/api/social-media/auth/twitter/callback', category: 'integrations', type: 'string', description: 'Twitter OAuth 2.0 redirect URI (registered in Twitter Developer Portal)' },

    // Performance
    { key: 'performance.max_upload_size_mb', value: '10', category: 'performance', type: 'number', description: 'Maximum file upload size in MB' },

    // UI
    { key: 'ui.theme', value: 'light', category: 'ui', type: 'string', description: 'Default UI theme' },

    // Logging (Frontend)
    { key: 'logging.frontend.level', value: 'error', category: 'logging', type: 'string', description: 'Frontend log level: debug, info, warn, error' },
    { key: 'logging.frontend.mode', value: 'none', category: 'logging', type: 'string', description: 'Frontend log mode: console, api, both, none' },
    { key: 'logging.frontend.batch_size', value: '50', category: 'logging', type: 'number', description: 'Batch size for API logging' },
    { key: 'logging.frontend.flush_interval', value: '5000', category: 'logging', type: 'number', description: 'Flush interval in ms for API logging' },
  ];

  for (const config of configs) {
    await prisma.configPublic.upsert({
      where: { key: config.key },
      update: {}, // Don't update if exists
      create: {
        key: config.key,
        value: config.value,
        category: config.category,
        dataType: config.type,
        description: config.description,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  console.log(`    ℹ️  Seeded ${configs.length} public config values`);
}
