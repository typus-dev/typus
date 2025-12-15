-- Default dispatcher tasks for LITE-SINGLE mode
-- These tasks are created during installation
-- Run automatically by the embedded TaskScheduler + TaskWorker
-- Note: Uses ON DUPLICATE KEY UPDATE for idempotency (safe to run multiple times)

-- Database Backup Task
-- Runs every 12 hours, creates automatic backups with 30-day retention
-- Note: 'databases' field is omitted - handler auto-detects current database
INSERT INTO `dispatcher.tasks` (
  `name`,
  `type`,
  `data`,
  `period_sec`,
  `is_active`,
  `created_at`,
  `updated_at`
) VALUES (
  'Database Backup',
  'database_backup',
  JSON_OBJECT(
    'storage', JSON_OBJECT(
      'type', 'local'
      -- Note: 'path' omitted - handler auto-detects via process.cwd() + '/storage/backups'
      -- This makes the seed universal for all projects
    ),
    'options', JSON_OBJECT(
      'compress', TRUE,
      'includeData', TRUE,
      'includeStructure', TRUE,
      'singleTransaction', TRUE
    ),
    'retention', JSON_OBJECT(
      'days', 30,
      'maxFiles', 50
    ),
    'naming', JSON_OBJECT(
      'pattern', '{database}_{timestamp}.sql',
      'timestampFormat', 'YYYY-MM-DD_HH-mm-ss'
    )
  ),
  43200,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `data` = VALUES(`data`),
  `period_sec` = VALUES(`period_sec`),
  `is_active` = VALUES(`is_active`),
  `updated_at` = NOW();

-- CMS Scheduled Publishing Task
-- Runs every 5 minutes, publishes draft CMS items when publishAt <= NOW()
-- Production-critical: 19,919 successful executions in production (Task ID=29)
-- Uses DSL for automatic dynamic routes, cache generation, and audit trail
INSERT INTO `dispatcher.tasks` (
  `name`,
  `type`,
  `data`,
  `period_sec`,
  `is_active`,
  `created_at`,
  `updated_at`
) VALUES (
  'CMS Scheduled Publishing',
  'cms_scheduled_publishing',
  JSON_OBJECT(
    'batchSize', 50,
    'systemUserId', 1,
    'notifications', JSON_OBJECT(
      'onPublish', JSON_OBJECT(
        'emails', JSON_ARRAY(),
        'template', 'cms_item_published_dsl'
      ),
      'onError', JSON_OBJECT(
        'emails', JSON_ARRAY(),
        'template', 'cms_publishing_error_dsl'
      )
    ),
    'timeout', 30000,
    'queueName', 'system_queue'
  ),
  300,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `data` = VALUES(`data`),
  `period_sec` = VALUES(`period_sec`),
  `is_active` = VALUES(`is_active`),
  `updated_at` = NOW();

-- System Garbage Collection Task
-- Runs daily, cleans up:
--   - Deleted storage files (older than threshold)
--   - Expired storage files
--   - Old task history records (keeps last 1000)
--   - Old system logs (optional)
--   - Expired sessions (optional)
INSERT INTO `dispatcher.tasks` (
  `name`,
  `type`,
  `data`,
  `period_sec`,
  `is_active`,
  `created_at`,
  `updated_at`
) VALUES (
  'System Garbage Collection',
  'system_garbage_collection_task',
  JSON_OBJECT(
    'targets', JSON_OBJECT(
      'storage', JSON_OBJECT(
        'enabled', TRUE,
        'daysThreshold', 7,
        'batchSize', 100,
        'cleanDeleted', TRUE,
        'cleanExpired', TRUE
      ),
      'taskHistory', JSON_OBJECT(
        'enabled', TRUE,
        'keepLast', 1000,
        'excludeStatuses', JSON_ARRAY('failed', 'retry'),
        'batchSize', 1000
      ),
      'systemLogs', JSON_OBJECT(
        'enabled', FALSE,
        'keepDays', 7,
        'keepErrorsDays', 30,
        'batchSize', 1000
      ),
      'sessions', JSON_OBJECT(
        'enabled', FALSE,
        'keepDays', 7
      )
    ),
    'dryRun', FALSE
  ),
  86400,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `data` = VALUES(`data`),
  `period_sec` = VALUES(`period_sec`),
  `is_active` = VALUES(`is_active`),
  `updated_at` = NOW();

-- Note: Plugin-specific tasks (web_analytics_process_nginx_logs, nginx_log_rotation)
-- are seeded by individual plugins, not the core baseline.

-- Site Cache Warmup
-- Runs daily, warms static cache using sitemap-driven batches
INSERT INTO `dispatcher.tasks` (
  `name`,
  `type`,
  `data`,
  `period_sec`,
  `is_active`,
  `created_at`,
  `updated_at`
) VALUES (
  'Site Cache Warmup',
  'cache_generation_task',
  JSON_OBJECT(
    'force', FALSE,
    'action', 'sitemap',
    'batchSize', 3
  ),
  86400,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `data` = VALUES(`data`),
  `period_sec` = VALUES(`period_sec`),
  `is_active` = VALUES(`is_active`),
  `updated_at` = NOW();
