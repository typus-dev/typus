/**
 * System Configuration Seed
 *
 * Seeds essential system configuration values.
 * Uses upsert to be idempotent (safe to run multiple times).
 */

// Import Prisma Client from pre-generated location (relative path from seed directory: /app/data/baseline/seed/)
import { PrismaClient } from '../../prisma/generated/client/index.js';

export async function seedSystemConfig(prisma: PrismaClient) {
  // Essential system configuration
  const configs = [
    // ===================
    // AI Settings
    // ===================
    { key: 'ai.openrouter.api_key', value: '', category: 'ai', type: 'string', description: 'OpenRouter API key for AI completions' },
    { key: 'ai.openrouter.default_model', value: 'anthropic/claude-3.5-sonnet', category: 'ai', type: 'string', description: 'Default AI model (e.g., anthropic/claude-3.5-sonnet, openai/gpt-4)' },
    { key: 'ai.openrouter.max_tokens', value: '4096', category: 'ai', type: 'string', description: 'Maximum tokens for AI responses' },
    { key: 'ai.openrouter.temperature', value: '0.7', category: 'ai', type: 'string', description: 'Temperature for AI responses (0.0 - 1.0)' },
    { key: 'ai.agent.model', value: 'x-ai/grok-4.1-fast:free', category: 'ai', type: 'string', description: 'AI model for Agent Loop (overrides default)' },
    { key: 'ai.gemini.api_key', value: '', category: 'ai', type: 'string', description: 'Google Gemini API key (encrypted)' },
    { key: 'ai.gemini.api_url', value: 'https://generativelanguage.googleapis.com/v1beta', category: 'ai', type: 'string', description: 'Google Gemini API URL' },
    { key: 'ai.together.api_key', value: '', category: 'ai', type: 'string', description: 'Together AI API key (encrypted)' },
    { key: 'ai.together.model', value: 'black-forest-labs/FLUX.1-schnell', category: 'ai', type: 'string', description: 'Together AI model name' },
    { key: 'flux.rate_per_mp_max', value: '0.08', category: 'ai', type: 'number', description: 'Pricing rate per megapixel for Flux Max model' },
    { key: 'flux.rate_per_mp_pro', value: '0.04', category: 'ai', type: 'number', description: 'Pricing rate per megapixel for Flux Pro model' },

    // ===================
    // Site Settings
    // ===================
    { key: 'site.name', value: 'My Application', category: 'site', type: 'string', description: 'Website name' },
    { key: 'site.tagline', value: 'Your tagline here', category: 'site', type: 'string', description: 'Site tagline/description' },
    { key: 'site.logo', value: '/assets/logo.png', category: 'site', type: 'string', description: 'Site logo URL' },
    { key: 'site.favicon', value: '/favicon.ico', category: 'site', type: 'string', description: 'Site favicon URL' },
    { key: 'site.url', value: 'http://localhost:3000', category: 'site', type: 'string', description: 'Base site URL' },
    { key: 'site.language', value: 'en', category: 'site', type: 'string', description: 'Default site language' },
    { key: 'site.timezone', value: 'UTC', category: 'site', type: 'string', description: 'Site timezone' },

    // ===================
    // Email Settings
    // ===================
    { key: 'email.from_name', value: 'Generic App', category: 'email', type: 'string', description: 'Default "From" name for emails' },
    { key: 'email.from_address', value: 'noreply@example.com', category: 'email', type: 'string', description: 'Default "From" email address' },
    { key: 'email.reply_to', value: 'support@example.com', category: 'email', type: 'string', description: 'Default "Reply-To" address' },
    { key: 'email.provider', value: 'smtp', category: 'email', type: 'string', description: 'Email provider type: smtp, sendgrid-api, mailgun-api' },
    { key: 'email.smtp_host', value: '', category: 'email', type: 'string', description: 'SMTP server hostname' },
    { key: 'email.smtp_port', value: '25', category: 'email', type: 'number', description: 'SMTP server port' },
    { key: 'email.smtp_secure', value: 'false', category: 'email', type: 'boolean', description: 'Use TLS/SSL for SMTP connection' },
    { key: 'email.smtp_username', value: '', category: 'email', type: 'string', description: 'SMTP username' },
    { key: 'email.smtp_password', value: '', category: 'email', type: 'string', description: 'SMTP password (encrypted)' },
    { key: 'email.api_endpoint', value: '', category: 'email', type: 'string', description: 'Custom API endpoint for API providers (optional)' },
    { key: 'email.api_key', value: '', category: 'email', type: 'string', description: 'API key for API-based email providers (encrypted)' },

    // ===================
    // Integrations (secrets - leave empty)
    // ===================
    { key: 'integrations.google_client_secret', value: '', category: 'integrations', type: 'string', description: 'Google OAuth client secret (encrypted)' },
    { key: 'integrations.google_recaptcha_secret_key', value: '', category: 'integrations', type: 'string', description: 'Google reCAPTCHA secret key (encrypted)' },
    { key: 'integrations.stripe_secret_key', value: '', category: 'integrations', type: 'string', description: 'Stripe secret key (encrypted)' },
    { key: 'integrations.telegram_admin_chat_id', value: '', category: 'integrations', type: 'string', description: 'Telegram admin chat ID' },
    { key: 'integrations.telegram_bot_token', value: '', category: 'integrations', type: 'string', description: 'Telegram bot token (encrypted)' },
    { key: 'integrations.twitter_client_secret', value: '', category: 'integrations', type: 'string', description: 'Twitter OAuth 2.0 client secret (encrypted)' },

    // ===================
    // Messaging
    // ===================
    { key: 'messaging.telegram.admin_chat_id', value: '', category: 'messaging', type: 'string', description: 'Telegram admin chat ID for notifications' },
    { key: 'messaging.telegram.bot_token', value: '', category: 'messaging', type: 'string', description: 'Telegram bot token for notifications (encrypted)' },

    // ===================
    // Setup
    // ===================
    { key: 'setup.completed', value: 'false', category: 'system', type: 'boolean', description: 'Whether initial setup wizard has been completed' },
    { key: 'setup.completed_at', value: '', category: 'system', type: 'string', description: 'Timestamp when setup was completed' },

    // ===================
    // UI Settings
    // ===================
    { key: 'ui.items_per_page', value: '20', category: 'ui', type: 'number', description: 'Default number of items per page in tables' },

    // ===================
    // SEO Settings
    // ===================
    { key: 'seo.meta_title', value: 'My Application', category: 'seo', type: 'string', description: 'Default meta title for pages' },
    { key: 'seo.meta_description', value: 'Your application description goes here', category: 'seo', type: 'string', description: 'Default meta description' },
    { key: 'seo.og_image', value: '/assets/og-image.png', category: 'seo', type: 'string', description: 'Default Open Graph image' },

    // ===================
    // Storage Settings
    // ===================
    { key: 'storage.provider', value: 'local', category: 'storage', type: 'string', description: 'Storage provider (local/s3/gcs)' },
    { key: 'storage.local.path', value: '/storage', category: 'storage', type: 'string', description: 'Local storage path' },
    { key: 'storage.s3.bucket', value: '', category: 'storage', type: 'string', description: 'S3 bucket name' },
    { key: 'storage.s3.region', value: '', category: 'storage', type: 'string', description: 'S3 region' },
    { key: 'storage.s3.access_key', value: '', category: 'storage', type: 'string', description: 'S3 access key' },
    { key: 'storage.s3.secret_key', value: '', category: 'storage', type: 'string', description: 'S3 secret key (encrypted)' },
    { key: 'storage.gcs.bucket', value: '', category: 'storage', type: 'string', description: 'GCS bucket name' },
    { key: 'storage.gcs.project_id', value: '', category: 'storage', type: 'string', description: 'GCS project ID' },
    { key: 'storage.gcs.keyfile_path', value: '', category: 'storage', type: 'string', description: 'Path to GCS keyfile.json' },

    // ===================
    // Logging Settings
    // ===================
    { key: 'logging.level', value: 'error', category: 'logging', type: 'string', description: 'Log level (debug/info/warn/error)' },
    { key: 'logging.mode', value: 'console', category: 'logging', type: 'string', description: 'Log output mode (console/database/none or combined)' },
    { key: 'logging.preset', value: 'off', category: 'logging', type: 'string', description: 'Quick logging preset: OFF (no logs), ERROR (errors only), INFO (production), DEBUG (development)' },
    { key: 'logging.debug_mode', value: 'false', category: 'logging', type: 'boolean', description: 'Enable debug mode with detailed logs' },
    { key: 'logging.cleanup_interval', value: '60', category: 'logging', type: 'number', description: 'Log cleanup interval in minutes' },
    { key: 'logging.cleanup_on_start', value: 'true', category: 'logging', type: 'boolean', description: 'Run log cleanup on application start' },
    { key: 'logging.loki_api_enabled', value: 'false', category: 'logging', type: 'boolean', description: 'Enable centralized logging via Loki API' },
    { key: 'logging.max_records', value: '10000', category: 'logging', type: 'number', description: 'Maximum log records to keep in database' },
    { key: 'logging.prisma_queries', value: 'false', category: 'logging', type: 'boolean', description: 'Enable Prisma query logging' },

    // ===================
    // Queue Settings
    // ===================
    { key: 'queue.driver', value: 'database', category: 'queue', type: 'string', description: 'Queue driver: redis or database' },
    { key: 'queue.keep_failed_jobs', value: 'false', category: 'queue', type: 'boolean', description: 'Keep failed jobs for debugging' },
    { key: 'queue.backup', value: 'backup_queue', category: 'queue', type: 'string', description: 'Backup queue name' },
    { key: 'queue.cache', value: 'cache_queue', category: 'queue', type: 'string', description: 'Cache queue name' },
    { key: 'queue.email', value: 'email_queue', category: 'queue', type: 'string', description: 'Email queue name' },
    { key: 'queue.notification', value: 'notification_queue', category: 'queue', type: 'string', description: 'Notification queue name' },
    { key: 'queue.reports', value: 'reports_queue', category: 'queue', type: 'string', description: 'Reports queue name' },
    { key: 'queue.social_media', value: 'social_media_queue', category: 'queue', type: 'string', description: 'Social media queue name' },
    { key: 'queue.system', value: 'system_queue', category: 'queue', type: 'string', description: 'System queue name' },
    { key: 'queue.telegram', value: 'telegram_queue', category: 'queue', type: 'string', description: 'Telegram queue name' },

    // ===================
    // Cache Settings
    // ===================
    { key: 'cache.driver', value: 'database', category: 'cache', type: 'string', description: 'Cache driver (database/redis)' },
    { key: 'cache.html_enabled', value: 'false', category: 'cache', type: 'boolean', description: 'Enable HTML static page caching' },
    { key: 'cache.html_ttl', value: '3600', category: 'cache', type: 'number', description: 'HTML cache TTL in seconds' },
    { key: 'cache.html_max_size_mb', value: '100', category: 'cache', type: 'number', description: 'Maximum HTML cache size in MB' },
    { key: 'cache.html_generator_url', value: '', category: 'cache', type: 'string', description: 'HTML cache generator service URL' },
    { key: 'cache.html_api_secret', value: '', category: 'cache', type: 'string', description: 'HTML cache API secret (encrypted)' },
    { key: 'cache.html_scheduled_generation', value: 'false', category: 'cache', type: 'boolean', description: 'Enable scheduled cache generation' },
    { key: 'cache.html_generation_cron', value: '0 3 * * *', category: 'cache', type: 'string', description: 'Cron expression for scheduled generation' },

    // ===================
    // Session
    // ===================
    { key: 'session.storage_driver', value: 'database', category: 'session', type: 'string', description: 'Session storage driver (database/redis)' },

    // ===================
    // Security
    // ===================
    { key: 'security.session_timeout', value: '3600', category: 'security', type: 'number', description: 'Session timeout in seconds' },
    { key: 'security.session_timeout_minutes', value: '60', category: 'security', type: 'number', description: 'Session timeout in minutes' },
    { key: 'security.max_login_attempts', value: '5', category: 'security', type: 'number', description: 'Maximum failed login attempts before lockout' },
    { key: 'security.lockout_duration', value: '900', category: 'security', type: 'number', description: 'Account lockout duration in seconds' },
    { key: 'security.lockout_duration_minutes', value: '15', category: 'security', type: 'number', description: 'Account lockout duration in minutes' },
    { key: 'security.encryption_key', value: '', category: 'security', type: 'string', description: 'Encryption key for sensitive data (auto-generated)' },

    // ===================
    // Performance
    // ===================
    { key: 'performance.cache_enabled', value: 'true', category: 'performance', type: 'boolean', description: 'Enable application caching' },
    { key: 'performance.cache_ttl', value: '3600', category: 'performance', type: 'number', description: 'Cache TTL in seconds' },
    { key: 'performance.api_rate_limit', value: '100', category: 'performance', type: 'number', description: 'API requests per minute per user' },

    // ===================
    // Notifications
    // ===================
    { key: 'notifications.tasks_enabled', value: 'true', category: 'notifications', type: 'boolean', description: 'Enable task completion notifications' },
    { key: 'notifications.tasks_success', value: 'true', category: 'notifications', type: 'boolean', description: 'Send notifications for successful tasks' },
    { key: 'notifications.tasks_error', value: 'true', category: 'notifications', type: 'boolean', description: 'Send notifications for failed tasks' },
    { key: 'notifications.admin_userId', value: '1', category: 'notifications', type: 'number', description: 'Admin user ID for fallback notifications' },
    { key: 'notifications.admin_user_id', value: '1', category: 'notifications', type: 'number', description: 'Admin user ID for fallback notifications' },

    // ===================
    // Social Media
    // ===================
    { key: 'social_media.publishing_enabled', value: 'false', category: 'social_media', type: 'boolean', description: 'Enable social media publishing' },
    { key: 'social_media.twitter_enabled', value: 'false', category: 'social_media', type: 'boolean', description: 'Enable Twitter posting' },
  ];

  let created = 0;
  let updated = 0;

  for (const config of configs) {
    const result = await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {}, // Don't update if exists
      create: {
        key: config.key,
        value: config.value,
        category: config.category,
        dataType: config.type,
        description: config.description,
        isEncrypted: false,
        requiresRestart: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Check if it was created or existed
    const existing = await prisma.systemConfig.findUnique({
      where: { key: config.key }
    });

    if (existing) {
      created++;
    }
  }

  console.log(`    ℹ️  Seeded ${configs.length} system config values`);
}
