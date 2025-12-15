-- Dynamic Routes for Default CMS Pages
-- This file creates dynamic routes for CMS pages created in 004_default_cms_pages.sql
-- Must run AFTER 004_default_cms_pages.sql
-- Note: Uses INSERT IGNORE for idempotency (safe to run multiple times)

-- Helper: Delete existing routes for these paths first (cleanup)
DELETE FROM `system.dynamic_routes`
WHERE path IN ('/contact', '/about', '/privacy-policy', '/terms-of-service')
  AND JSON_EXTRACT(meta, '$.cmsItemId') IN (
    SELECT id FROM `cms.items` WHERE site_path IN ('/contact', '/about', '/privacy-policy', '/terms-of-service')
  );

-- Contact Page Route
INSERT INTO `system.dynamic_routes` (
  `id`,
  `path`,
  `name`,
  `component`,
  `parent_id`,
  `order_index`,
  `meta`,
  `is_active`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  '/contact',
  'Contact',
  'ContentDisplay',
  NULL,
  0,
  JSON_OBJECT('cmsItemId', id, 'layout', layout),
  1,
  1,
  1,
  NOW(),
  NOW()
FROM `cms.items`
WHERE `site_path` = '/contact'
LIMIT 1;

-- About Page Route
INSERT INTO `system.dynamic_routes` (
  `id`,
  `path`,
  `name`,
  `component`,
  `parent_id`,
  `order_index`,
  `meta`,
  `is_active`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  '/about',
  'About',
  'ContentDisplay',
  NULL,
  0,
  JSON_OBJECT('cmsItemId', id, 'layout', layout),
  1,
  1,
  1,
  NOW(),
  NOW()
FROM `cms.items`
WHERE `site_path` = '/about'
LIMIT 1;

-- Privacy Policy Page Route
INSERT INTO `system.dynamic_routes` (
  `id`,
  `path`,
  `name`,
  `component`,
  `parent_id`,
  `order_index`,
  `meta`,
  `is_active`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  '/privacy-policy',
  'Privacy Policy',
  'ContentDisplay',
  NULL,
  0,
  JSON_OBJECT('cmsItemId', id, 'layout', layout),
  1,
  1,
  1,
  NOW(),
  NOW()
FROM `cms.items`
WHERE `site_path` = '/privacy-policy'
LIMIT 1;

-- Terms of Service Page Route
INSERT INTO `system.dynamic_routes` (
  `id`,
  `path`,
  `name`,
  `component`,
  `parent_id`,
  `order_index`,
  `meta`,
  `is_active`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
)
SELECT
  UUID(),
  '/terms-of-service',
  'Terms of Service',
  'ContentDisplay',
  NULL,
  0,
  JSON_OBJECT('cmsItemId', id, 'layout', layout),
  1,
  1,
  1,
  NOW(),
  NOW()
FROM `cms.items`
WHERE `site_path` = '/terms-of-service'
LIMIT 1;
