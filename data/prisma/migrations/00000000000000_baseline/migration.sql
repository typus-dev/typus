-- CreateTable
CREATE TABLE `auth.email_verifications` (
    `id` VARCHAR(36) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `auth.email_verifications_id_key`(`id`),
    UNIQUE INDEX `auth.email_verifications_token_key`(`token`),
    INDEX `idx_email_verifications_token`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth.history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `login` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `password` VARCHAR(255) NULL,
    `device_data` JSON NULL,
    `isp_data` JSON NULL,
    `result` VARCHAR(255) NULL,
    `user_id` INTEGER NULL,
    `user_name` VARCHAR(255) NULL,
    `google_id` VARCHAR(255) NULL,
    `avatar` VARCHAR(255) NULL,
    `token` VARCHAR(512) NOT NULL,
    `attempt_time` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `auth.history_id_key`(`id`),
    INDEX `idx_history_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth.password_resets` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `user_id` INTEGER NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `auth.password_resets_id_key`(`id`),
    UNIQUE INDEX `auth.password_resets_token_key`(`token`),
    INDEX `idx_password_resets_token`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth.refresh_tokens` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `token` VARCHAR(512) NOT NULL,
    `access_token_jti` VARCHAR(255) NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `auth.refresh_tokens_id_key`(`id`),
    INDEX `idx_refresh_tokens_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth.roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `deleted` BOOLEAN NULL DEFAULT false,
    `ability_rules` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `auth.roles_id_key`(`id`),
    UNIQUE INDEX `auth.roles_name_key`(`name`),
    INDEX `idx_roles_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth.user_roles` (
    `user_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    INDEX `idx_user_roles_user_id`(`user_id`),
    INDEX `idx_user_roles_role_id`(`role_id`),
    PRIMARY KEY (`user_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth.users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `is_approved` BOOLEAN NULL DEFAULT false,
    `is_deleted` BOOLEAN NULL DEFAULT false,
    `user_name` VARCHAR(255) NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(255) NULL,
    `avatar_url` VARCHAR(2048) NULL,
    `notes` VARCHAR(255) NULL,
    `otp` VARCHAR(255) NULL,
    `role` VARCHAR(255) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `is_admin` BOOLEAN NULL DEFAULT false,
    `verification_token` VARCHAR(255) NULL,
    `is_email_verified` BOOLEAN NULL DEFAULT false,
    `last_name` VARCHAR(255) NULL,
    `middle_name` VARCHAR(255) NULL,
    `first_name` VARCHAR(255) NULL,
    `google_id` VARCHAR(255) NULL,
    `last_login_attempt` DATETIME(3) NULL,
    `last_login` DATETIME(3) NULL,
    `last_activity` DATETIME(3) NULL,
    `card_number` VARCHAR(255) NULL,
    `two_factor_secret` VARCHAR(255) NULL,
    `is_two_factor_enabled` BOOLEAN NULL DEFAULT false,
    `two_factor_method` VARCHAR(255) NULL DEFAULT 'email',
    `two_factor_temp_secret` VARCHAR(255) NULL,
    `two_factor_temp_method` VARCHAR(255) NULL,
    `two_factor_temp_expiry` DATETIME(3) NULL,
    `email_notifications` BOOLEAN NULL DEFAULT true,
    `push_notifications` BOOLEAN NULL DEFAULT false,
    `telegram_notifications` BOOLEAN NULL DEFAULT false,
    `telegram_chat_id` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `auth.users_id_key`(`id`),
    UNIQUE INDEX `auth.users_email_key`(`email`),
    INDEX `idx_users_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth.verification_codes` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `email` VARCHAR(255) NOT NULL,
    `code` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `auth.verification_codes_id_key`(`id`),
    UNIQUE INDEX `auth.verification_codes_email_key`(`email`),
    INDEX `idx_verification_codes_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms.categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `parent_id` INTEGER NULL,
    `layout` VARCHAR(255) NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `cms.categories_id_key`(`id`),
    UNIQUE INDEX `cms.categories_slug_key`(`slug`),
    INDEX `idx_categories_slug`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms.item_categories` (
    `item_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    INDEX `idx_item_categories_item_id`(`item_id`),
    INDEX `idx_item_categories_category_id`(`category_id`),
    PRIMARY KEY (`item_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms.item_media` (
    `item_id` INTEGER NOT NULL,
    `media_id` INTEGER NOT NULL,
    `relationship` VARCHAR(255) NOT NULL,
    `order_index` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    INDEX `idx_item_media_item_id`(`item_id`),
    INDEX `idx_item_media_media_id`(`media_id`),
    PRIMARY KEY (`item_id`, `media_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms.item_tags` (
    `item_id` INTEGER NOT NULL,
    `tag_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    INDEX `idx_item_tags_item_id`(`item_id`),
    INDEX `idx_item_tags_tag_id`(`tag_id`),
    PRIMARY KEY (`item_id`, `tag_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms.item_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `schema` JSON NULL,
    `icon` VARCHAR(50) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `cms.item_types_id_key`(`id`),
    UNIQUE INDEX `cms.item_types_name_key`(`name`),
    INDEX `idx_item_types_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms.items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `content_type` VARCHAR(50) NOT NULL DEFAULT 'document',
    `content` TEXT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
    `layout` VARCHAR(100) NULL,
    `site_path` VARCHAR(255) NOT NULL,
    `metadata` JSON NULL,
    `meta_title` VARCHAR(255) NULL,
    `meta_description` VARCHAR(255) NULL,
    `meta_keywords` VARCHAR(255) NULL,
    `canonical_url` VARCHAR(512) NULL,
    `robots_meta` VARCHAR(255) NULL DEFAULT 'index,follow',
    `og_title` VARCHAR(95) NULL,
    `og_description` VARCHAR(200) NULL,
    `og_image_id` INTEGER NULL,
    `schema_type` VARCHAR(255) NULL DEFAULT 'WebPage',
    `structured_data` JSON NULL,
    `sitemap_priority` DECIMAL(10, 2) NULL DEFAULT 0.5,
    `sitemap_changefreq` VARCHAR(255) NULL DEFAULT 'monthly',
    `include_in_sitemap` BOOLEAN NULL DEFAULT true,
    `cache_enabled` BOOLEAN NULL DEFAULT true,
    `cache_ttl` INTEGER NULL DEFAULT 3600,
    `cache_info` JSON NULL,
    `published_at` DATETIME(3) NULL,
    `publish_at` DATETIME(3) NULL,
    `scheduled_by` INTEGER NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `cms.items_id_key`(`id`),
    UNIQUE INDEX `cms.items_site_path_key`(`site_path`),
    INDEX `idx_items_site_path`(`site_path`),
    INDEX `idx_items_og_image_id`(`og_image_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms.media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `filename` VARCHAR(255) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `path` VARCHAR(512) NOT NULL,
    `alt_text` VARCHAR(255) NULL,
    `title` VARCHAR(255) NULL,
    `description` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `cms.media_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms.tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `slug` VARCHAR(50) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `cms.tags_id_key`(`id`),
    UNIQUE INDEX `cms.tags_name_key`(`name`),
    UNIQUE INDEX `cms.tags_slug_key`(`slug`),
    INDEX `idx_tags_name`(`name`),
    INDEX `idx_tags_slug`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispatcher.queue_tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `queue` VARCHAR(100) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `data` JSON NOT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'pending',
    `priority` INTEGER NOT NULL DEFAULT 0,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 3,
    `error` VARCHAR(255) NULL,
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `dispatcher.queue_tasks_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispatcher.task_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER NULL,
    `parent_id` INTEGER NULL,
    `task_name` VARCHAR(255) NULL,
    `task_type` VARCHAR(255) NULL,
    `queue_name` VARCHAR(255) NULL,
    `status` VARCHAR(255) NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `duration` INTEGER NULL,
    `error` VARCHAR(255) NULL,
    `result` JSON NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `dispatcher.task_history_id_key`(`id`),
    INDEX `idx_task_history_task_id`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dispatcher.tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `data` JSON NULL,
    `period_sec` INTEGER NULL,
    `parent_id` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_run` DATETIME(3) NULL,
    `last_status` VARCHAR(255) NULL,
    `last_error` VARCHAR(255) NULL,
    `max_runs` INTEGER NULL,
    `run_count` INTEGER NULL DEFAULT 0,
    `next_run` DATETIME(3) NULL,
    `schedule_type` VARCHAR(255) NULL,
    `cron_expr` VARCHAR(255) NULL,
    `timeout` INTEGER NULL,
    `retry_count` INTEGER NULL DEFAULT 0,
    `retry_delay` INTEGER NULL DEFAULT 300,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `dispatcher.tasks_id_key`(`id`),
    INDEX `idx_tasks_parent_id`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications.history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `type` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'pending',
    `metadata` JSON NULL,
    `template_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `notifications.history_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications.telegram_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(20) NOT NULL,
    `chat_id` VARCHAR(20) NOT NULL,
    `username` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `notifications.telegram_users_id_key`(`id`),
    UNIQUE INDEX `notifications.telegram_users_phone_key`(`phone`),
    INDEX `idx_telegram_users_phone`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications.templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `notification_type` VARCHAR(255) NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `notifications.templates_id_key`(`id`),
    UNIQUE INDEX `notifications.templates_name_key`(`name`),
    INDEX `idx_templates_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storage.files` (
    `id` VARCHAR(36) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(255) NOT NULL,
    `size` INTEGER NOT NULL,
    `storage_provider` VARCHAR(255) NOT NULL DEFAULT 'LOCAL',
    `storage_path` VARCHAR(255) NOT NULL,
    `public_url` VARCHAR(2048) NULL,
    `visibility` VARCHAR(255) NOT NULL DEFAULT 'PRIVATE',
    `user_id` INTEGER NOT NULL,
    `module_context` VARCHAR(255) NULL,
    `context_id` VARCHAR(255) NULL,
    `tags` JSON NULL,
    `description` VARCHAR(500) NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'ACTIVE',
    `expires_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `storage.files_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.config_public` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `category` VARCHAR(100) NULL,
    `data_type` VARCHAR(20) NULL DEFAULT 'string',
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.config_public_id_key`(`id`),
    UNIQUE INDEX `system.config_public_key_key`(`key`),
    INDEX `idx_config_public_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.containers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `project_id` INTEGER NOT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'stopped',
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.containers_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'active',
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.projects_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.cache` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `namespace` VARCHAR(100) NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.cache_id_key`(`id`),
    UNIQUE INDEX `system.cache_key_key`(`key`),
    INDEX `idx_cache_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.config_audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `config_key` VARCHAR(255) NOT NULL,
    `old_value` TEXT NULL,
    `new_value` TEXT NULL,
    `changed_by` INTEGER NULL,
    `change_source` VARCHAR(50) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.config_audit_log_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `category` VARCHAR(100) NULL,
    `data_type` VARCHAR(20) NULL DEFAULT 'string',
    `is_encrypted` BOOLEAN NULL DEFAULT false,
    `requires_restart` BOOLEAN NULL DEFAULT false,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.config_id_key`(`id`),
    UNIQUE INDEX `system.config_key_key`(`key`),
    INDEX `idx_config_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.dynamic_routes` (
    `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
    `path` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `component` VARCHAR(255) NULL,
    `parent_id` VARCHAR(36) NULL,
    `order_index` INTEGER NOT NULL DEFAULT 0,
    `meta` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.dynamic_routes_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.errors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `log_id` INTEGER NOT NULL,
    `error_type` VARCHAR(100) NOT NULL,
    `error_message` TEXT NOT NULL,
    `stack_trace` TEXT NULL,
    `additional_data` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.errors_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.log_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `hour` INTEGER NOT NULL,
    `source` VARCHAR(50) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.log_stats_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timestamp` DATETIME(3) NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `source` VARCHAR(50) NOT NULL,
    `component` VARCHAR(100) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `message` TEXT NOT NULL,
    `metadata` JSON NULL,
    `context_id` VARCHAR(36) NULL,
    `user_id` VARCHAR(36) NULL,
    `ip_address` VARCHAR(45) NULL,
    `request_path` VARCHAR(255) NULL,
    `request_method` VARCHAR(10) NULL,
    `execution_time` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.logs_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system.session_storage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `system.session_storage_id_key`(`id`),
    UNIQUE INDEX `system.session_storage_key_key`(`key`),
    INDEX `idx_session_storage_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `image_lab.uploads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `file_name` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `image_lab.uploads_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments.subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `tier` VARCHAR(255) NOT NULL DEFAULT 'free',
    `token_balance` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(255) NOT NULL DEFAULT 'active',
    `expires_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `stripe_customer_id` VARCHAR(255) NULL,
    `stripe_subscription_id` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `payments.subscriptions_user_id_key`(`user_id`),
    INDEX `idx_subscriptions_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments.token_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `subscription_id` INTEGER NULL,
    `amount` INTEGER NOT NULL,
    `balance_after` INTEGER NOT NULL,
    `type` VARCHAR(255) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `reference_id` VARCHAR(255) NULL,
    `idempotency_key` VARCHAR(255) NULL,
    `stripe_payment_intent_id` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `payments.token_transactions_idempotency_key_key`(`idempotency_key`),
    INDEX `idx_token_transactions_idempotency_key`(`idempotency_key`),
    INDEX `idx_token_transactions_subscription_id`(`subscription_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photoshoot.images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `style_config` JSON NOT NULL,
    `storage_file_id` VARCHAR(255) NULL,
    `task_history_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `photoshoot.images_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photoshoot.sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `package_config` JSON NOT NULL,
    `uploaded_photo_ids` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `total_images` INTEGER NOT NULL,
    `completed_images` INTEGER NOT NULL DEFAULT 0,
    `task_ids` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `photoshoot.sessions_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm.activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `task_id` INTEGER NULL,
    `entity_type` VARCHAR(255) NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `field` VARCHAR(255) NULL,
    `old_value` TEXT NULL,
    `new_value` TEXT NULL,
    `description` TEXT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `pm.activities_id_key`(`id`),
    INDEX `idx_activities_project_id`(`project_id`),
    INDEX `idx_activities_task_id`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm.tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `parent_task_id` INTEGER NULL,
    `title` VARCHAR(500) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'todo',
    `priority` VARCHAR(255) NOT NULL DEFAULT 'medium',
    `assignee_id` INTEGER NULL,
    `deadline` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `estimated_hours` DECIMAL(10, 2) NULL,
    `actual_hours` DECIMAL(10, 2) NULL DEFAULT 0,
    `position` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `pm.tasks_id_key`(`id`),
    INDEX `idx_tasks_project_id`(`project_id`),
    INDEX `idx_tasks_parent_task_id`(`parent_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pm.projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'active',
    `priority` VARCHAR(255) NULL DEFAULT 'medium',
    `start_date` DATETIME(3) NULL,
    `deadline` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `color` VARCHAR(255) NULL DEFAULT '#3b82f6',
    `owner_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `pm.projects_id_key`(`id`),
    UNIQUE INDEX `pm.projects_slug_key`(`slug`),
    INDEX `idx_projects_slug`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social.accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platform_id` VARCHAR(50) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `account_name` VARCHAR(255) NOT NULL,
    `account_handle` VARCHAR(255) NOT NULL,
    `account_id` VARCHAR(255) NOT NULL,
    `access_token` VARCHAR(255) NOT NULL,
    `refresh_token` VARCHAR(255) NULL,
    `token_expires_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_sync` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `social.accounts_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social.platforms` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL,
    `icon` VARCHAR(100) NULL,
    `max_text_length` INTEGER NULL DEFAULT 280,
    `supported_media_types` JSON NULL,
    `features` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `social.platforms_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social.post_analytics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `post_id` INTEGER NOT NULL,
    `platform_id` VARCHAR(50) NOT NULL,
    `likes` INTEGER NULL DEFAULT 0,
    `shares` INTEGER NULL DEFAULT 0,
    `comments` INTEGER NULL DEFAULT 0,
    `views` INTEGER NULL DEFAULT 0,
    `clicks` INTEGER NULL DEFAULT 0,
    `metadata` JSON NULL,
    `last_updated` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `social.post_analytics_id_key`(`id`),
    UNIQUE INDEX `social.post_analytics_post_id_key`(`post_id`),
    INDEX `idx_post_analytics_post_id`(`post_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social.post_media` (
    `post_id` INTEGER NOT NULL,
    `media_id` INTEGER NOT NULL,
    `order_index` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`post_id`, `media_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social.post_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` VARCHAR(255) NULL,
    `platform_id` VARCHAR(50) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `content` VARCHAR(255) NOT NULL,
    `hashtags` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `social.post_templates_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social.posts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platform_id` VARCHAR(50) NOT NULL,
    `account_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `content` VARCHAR(255) NOT NULL,
    `media_ids` JSON NULL,
    `hashtags` JSON NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'draft',
    `scheduled_at` DATETIME(3) NULL,
    `published_at` DATETIME(3) NULL,
    `external_post_id` VARCHAR(255) NULL,
    `external_url` VARCHAR(255) NULL,
    `metadata` JSON NULL,
    `error_message` VARCHAR(255) NULL,
    `retry_count` INTEGER NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `social.posts_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `waitlist.referrals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referrer_id` INTEGER NOT NULL,
    `referred_email` VARCHAR(255) NOT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'clicked',
    `clicked_at` DATETIME(3) NOT NULL,
    `signed_up_at` DATETIME(3) NULL,
    `verified_at` DATETIME(3) NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `waitlist.signups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'pending',
    `position` INTEGER NOT NULL,
    `referral_code` VARCHAR(255) NOT NULL,
    `referred_by_id` INTEGER NULL,
    `referral_count` INTEGER NOT NULL DEFAULT 0,
    `position_boost` INTEGER NOT NULL DEFAULT 0,
    `verification_token` VARCHAR(255) NULL,
    `verification_token_expiry` DATETIME(3) NULL,
    `newsletter_consent` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `verified_at` DATETIME(3) NULL,
    `invited_at` DATETIME(3) NULL,
    `unsubscribed_at` DATETIME(3) NULL,
    `user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `waitlist.signups_id_key`(`id`),
    UNIQUE INDEX `waitlist.signups_email_key`(`email`),
    UNIQUE INDEX `waitlist.signups_referral_code_key`(`referral_code`),
    UNIQUE INDEX `waitlist.signups_verification_token_key`(`verification_token`),
    INDEX `idx_signups_email`(`email`),
    INDEX `idx_signups_referral_code`(`referral_code`),
    INDEX `idx_signups_verification_token`(`verification_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `web_analytics.page_views` (
    `id` VARCHAR(36) NOT NULL,
    `visit_id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(64) NOT NULL,
    `user_id` INTEGER NULL,
    `source` VARCHAR(10) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `query_params` JSON NULL,
    `referrer_url` VARCHAR(2000) NULL,
    `referrer_path` VARCHAR(500) NULL,
    `viewed_at` DATETIME(3) NOT NULL,
    `user_agent` VARCHAR(500) NOT NULL,
    `ip_address_hash` VARCHAR(64) NOT NULL,
    `http_status` INTEGER NULL,
    `request_time_ms` INTEGER NULL,
    `screen_resolution` VARCHAR(20) NULL,
    `page_title` VARCHAR(500) NULL,
    `time_on_page_seconds` INTEGER NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `web_analytics.page_views_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `web_analytics.referrers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referrer_url` VARCHAR(2000) NOT NULL,
    `referrer_domain` VARCHAR(255) NOT NULL,
    `channel` VARCHAR(50) NOT NULL,
    `visits` INTEGER NOT NULL DEFAULT 0,
    `unique_visitors` INTEGER NOT NULL DEFAULT 0,
    `page_views` INTEGER NOT NULL DEFAULT 0,
    `avg_session_duration` INTEGER NOT NULL DEFAULT 0,
    `bounce_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `avg_pages_per_visit` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `first_seen_at` DATETIME(3) NOT NULL,
    `last_seen_at` DATETIME(3) NOT NULL,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `web_analytics.referrers_id_key`(`id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `web_analytics.visits` (
    `id` VARCHAR(36) NOT NULL,
    `session_id` VARCHAR(64) NOT NULL,
    `user_id` INTEGER NULL,
    `ip_address_hash` VARCHAR(64) NOT NULL,
    `user_agent` VARCHAR(500) NOT NULL,
    `device_type` VARCHAR(20) NOT NULL,
    `browser_name` VARCHAR(50) NULL,
    `browser_version` VARCHAR(20) NULL,
    `os_name` VARCHAR(50) NULL,
    `os_version` VARCHAR(20) NULL,
    `first_visit_at` DATETIME(3) NOT NULL,
    `last_activity_at` DATETIME(3) NOT NULL,
    `duration_seconds` INTEGER NOT NULL DEFAULT 0,
    `entry_page` VARCHAR(500) NOT NULL,
    `exit_page` VARCHAR(500) NULL,
    `page_views_count` INTEGER NOT NULL DEFAULT 0,
    `referrer_url` VARCHAR(2000) NULL,
    `referrer_domain` VARCHAR(255) NULL,
    `channel` VARCHAR(50) NULL,
    `utm_source` VARCHAR(255) NULL,
    `utm_medium` VARCHAR(255) NULL,
    `utm_campaign` VARCHAR(255) NULL,
    `utm_term` VARCHAR(255) NULL,
    `utm_content` VARCHAR(255) NULL,
    `is_bounce` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NULL,
    `updated_by` INTEGER NULL,

    UNIQUE INDEX `web_analytics.visits_id_key`(`id`),
    UNIQUE INDEX `web_analytics.visits_session_id_key`(`session_id`),
    INDEX `idx_visits_session_id`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `auth.history` ADD CONSTRAINT `auth.history_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth.users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth.refresh_tokens` ADD CONSTRAINT `auth.refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth.users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth.user_roles` ADD CONSTRAINT `auth.user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `auth.users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth.user_roles` ADD CONSTRAINT `auth.user_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `auth.roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cms.item_categories` ADD CONSTRAINT `cms.item_categories_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `cms.items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cms.item_categories` ADD CONSTRAINT `cms.item_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `cms.categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cms.item_media` ADD CONSTRAINT `cms.item_media_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `cms.items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cms.item_media` ADD CONSTRAINT `cms.item_media_media_id_fkey` FOREIGN KEY (`media_id`) REFERENCES `cms.media`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cms.item_tags` ADD CONSTRAINT `cms.item_tags_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `cms.items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cms.item_tags` ADD CONSTRAINT `cms.item_tags_tag_id_fkey` FOREIGN KEY (`tag_id`) REFERENCES `cms.tags`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cms.items` ADD CONSTRAINT `cms.items_og_image_id_fkey` FOREIGN KEY (`og_image_id`) REFERENCES `cms.media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatcher.task_history` ADD CONSTRAINT `dispatcher.task_history_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `dispatcher.tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatcher.tasks` ADD CONSTRAINT `dispatcher.tasks_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `dispatcher.tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments.token_transactions` ADD CONSTRAINT `payments.token_transactions_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `payments.subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm.activities` ADD CONSTRAINT `pm.activities_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `pm.projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm.activities` ADD CONSTRAINT `pm.activities_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `pm.tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm.tasks` ADD CONSTRAINT `pm.tasks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `pm.projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pm.tasks` ADD CONSTRAINT `pm.tasks_parent_task_id_fkey` FOREIGN KEY (`parent_task_id`) REFERENCES `pm.tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

