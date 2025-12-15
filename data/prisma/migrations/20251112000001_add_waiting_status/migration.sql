-- Add waiting status and metadata fields to dispatcher.queue_tasks
-- Migration: 20251112000001_add_waiting_status
-- Date: 2025-11-12

-- Add new columns for waiting status support
ALTER TABLE `dispatcher`.`queue_tasks`
  ADD COLUMN `waiting_for` VARCHAR(255) NULL AFTER `processed_at`,
  ADD COLUMN `external_job_id` VARCHAR(200) NULL AFTER `waiting_for`,
  ADD COLUMN `waiting_since` DATETIME(3) NULL AFTER `external_job_id`,
  ADD COLUMN `waiting_timeout` DATETIME(3) NULL AFTER `waiting_since`;

-- Update status enum to include 'waiting' (MySQL doesn't enforce ENUM in VARCHAR columns, so this is a comment)
-- status column already VARCHAR(255), can accept 'waiting' value without schema change
