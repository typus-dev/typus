-- Default CMS Pages for LITE-SINGLE mode
-- These pages are created during installation with proper DXCE editor formatting
-- Standard pages: Contact, About, Privacy Policy, Terms of Service
-- Note: Uses INSERT ... ON DUPLICATE KEY UPDATE for idempotency (safe to run multiple times)
-- Note: site_path is UNIQUE key, so duplicate inserts will update existing records
-- Note: These are agnostic placeholders - customize for your site after installation

-- Contact Page
INSERT INTO `cms.items` (
  `title`,
  `slug`,
  `site_path`,
  `content`,
  `status`,
  `is_public`,
  `published_at`,
  `content_type`,
  `meta_title`,
  `meta_description`,
  `sitemap_priority`,
  `sitemap_changefreq`,
  `include_in_sitemap`,
  `cache_enabled`,
  `cache_ttl`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
) VALUES (
  'Contact',
  'contact',
  '/contact',
  '<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="32"><h1>Contact</h1></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Have questions or want to get in touch? We would love to hear from you.</p></div>\n<div data-dxce-type="list" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><ul>\n  <li>Email: <a href="mailto:contact@example.com">contact@example.com</a></li>\n</ul></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Fill in your contact details above after installation.</p></div>',
  'published',
  1,
  NOW(),
  'document',
  'Contact Us',
  'Get in touch with us. We are here to help with questions and support.',
  0.8,
  'monthly',
  1,
  1,
  3600,
  1,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `content` = VALUES(`content`),
  `meta_title` = VALUES(`meta_title`),
  `meta_description` = VALUES(`meta_description`),
  `updated_at` = NOW();

-- About Page
INSERT INTO `cms.items` (
  `title`,
  `slug`,
  `site_path`,
  `content`,
  `status`,
  `is_public`,
  `published_at`,
  `content_type`,
  `meta_title`,
  `meta_description`,
  `sitemap_priority`,
  `sitemap_changefreq`,
  `include_in_sitemap`,
  `cache_enabled`,
  `cache_ttl`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
) VALUES (
  'About',
  'about',
  '/about',
  '<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="32"><h1>About Us</h1></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Welcome to our website. This is a placeholder page - customize it to tell your story.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Our Mission</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Describe your mission and values here.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>What We Do</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Tell visitors about your products, services, or purpose.</p></div>',
  'published',
  1,
  NOW(),
  'document',
  'About Us',
  'Learn more about us and what we do.',
  0.9,
  'monthly',
  1,
  1,
  3600,
  1,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `content` = VALUES(`content`),
  `meta_title` = VALUES(`meta_title`),
  `meta_description` = VALUES(`meta_description`),
  `updated_at` = NOW();

-- Privacy Policy Page
INSERT INTO `cms.items` (
  `title`,
  `slug`,
  `site_path`,
  `content`,
  `status`,
  `is_public`,
  `published_at`,
  `content_type`,
  `meta_title`,
  `meta_description`,
  `sitemap_priority`,
  `sitemap_changefreq`,
  `include_in_sitemap`,
  `cache_enabled`,
  `cache_ttl`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
) VALUES (
  'Privacy Policy',
  'privacy-policy',
  '/privacy-policy',
  '<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="32"><h1>Privacy Policy</h1></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Last updated: August 5, 2025</p><p>This Privacy Policy explains how we collect, use, and protect your information when you use this website or any of our services.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>What We Collect</h2></div>\n<div data-dxce-type="list" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><ul>\n  <li>Basic analytics data (such as IP address, browser type, operating system)</li>\n  <li>Technical data about how you interact with the site (e.g. pages visited, time on page)</li>\n  <li>Information you provide manually (such as email address or form submissions)</li>\n  <li>Authentication tokens (if login or API usage is enabled)</li>\n</ul></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>How We Use Your Data</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We use the collected data to operate and improve the website, provide support, monitor system performance, and prevent abuse.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Cookies</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We may use cookies or local storage to remember your preferences or improve your experience. You can disable cookies in your browser settings.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Third-Party Services</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We may use third-party tools (such as analytics or email delivery services) that process limited technical data on our behalf. These tools do not have access to any private user content.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Data Retention</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We retain data only as long as necessary to provide services and meet legal or operational requirements. You can request deletion of your data at any time by contacting us.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Your Rights</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>You can request access to, correction of, or deletion of your personal information. To do so, email us directly.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Contact</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>If you have any questions or concerns about this policy, please contact us.</p></div>',
  'published',
  1,
  NOW(),
  'document',
  'Privacy Policy',
  'Learn about how we collect, use, and protect your information.',
  0.6,
  'yearly',
  1,
  1,
  3600,
  1,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `content` = VALUES(`content`),
  `meta_title` = VALUES(`meta_title`),
  `meta_description` = VALUES(`meta_description`),
  `updated_at` = NOW();

-- Terms of Service Page
INSERT INTO `cms.items` (
  `title`,
  `slug`,
  `site_path`,
  `content`,
  `status`,
  `is_public`,
  `published_at`,
  `content_type`,
  `meta_title`,
  `meta_description`,
  `sitemap_priority`,
  `sitemap_changefreq`,
  `include_in_sitemap`,
  `cache_enabled`,
  `cache_ttl`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
) VALUES (
  'Terms of Service',
  'terms-of-service',
  '/terms-of-service',
  '<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="32"><h1>Terms of Service</h1></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Last updated: August 5, 2025</p><p>By accessing or using this website or any services provided through it, you agree to be bound by these Terms of Service.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Use of the Service</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>You may use the service only for lawful purposes and in accordance with these terms. You are responsible for any activity under your account.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Access</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We reserve the right to suspend or terminate access to the service at any time without notice, for any reason, including violation of these terms.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Ownership</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>All code, content, and materials available on this website are the property of the site owner unless otherwise stated.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Disclaimer</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>This service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted availability or accuracy of the service.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Limitation of Liability</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We are not liable for any indirect, incidental, or consequential damages resulting from your use of the service.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Changes</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We may update these terms at any time. Continued use of the service means you accept the revised terms.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Contact</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>If you have questions about these terms, please contact us.</p></div>',
  'published',
  1,
  NOW(),
  'document',
  'Terms of Service',
  'Read the terms and conditions for using our services.',
  0.6,
  'yearly',
  1,
  1,
  3600,
  1,
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `content` = VALUES(`content`),
  `meta_title` = VALUES(`meta_title`),
  `meta_description` = VALUES(`meta_description`),
  `updated_at` = NOW();
