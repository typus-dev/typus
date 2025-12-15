/**
 * CMS Pages Seed
 *
 * Seeds essential CMS pages with DXCE editor formatting:
 * - Contact page
 * - About page
 * - Privacy Policy
 * - Terms of Service
 *
 * Uses upsert on sitePath to be idempotent (safe to run multiple times).
 */

import { PrismaClient } from '../../prisma/generated/client/index.js';

export async function seedCmsPages(prisma: PrismaClient) {
  const pages = [
    // 1. Contact Page
    {
      title: 'Contact',
      slug: 'contact',
      sitePath: '/contact',
      content: '<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="32"><h1>Contact</h1></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Have questions or want to get in touch? We would love to hear from you.</p></div>\n<div data-dxce-type="list" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><ul>\n  <li>Email: <a href="mailto:contact@example.com">contact@example.com</a></li>\n</ul></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Fill in your contact details above after installation.</p></div>',
      status: 'published',
      isPublic: true,
      publishedAt: new Date(),
      contentType: 'document',
      metaTitle: 'Contact Us',
      metaDescription: 'Get in touch with us. We are here to help with questions and support.',
      sitemapPriority: 0.8,
      sitemapChangefreq: 'monthly',
      includeInSitemap: true,
      cacheEnabled: true,
      cacheTtl: 3600,
      createdBy: 1,
      updatedBy: 1
    },

    // 2. About Page
    {
      title: 'About',
      slug: 'about',
      sitePath: '/about',
      content: '<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="32"><h1>About Us</h1></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Welcome to our website. This is a placeholder page - customize it to tell your story.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Our Mission</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Describe your mission and values here.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>What We Do</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Tell visitors about your products, services, or purpose.</p></div>',
      status: 'published',
      isPublic: true,
      publishedAt: new Date(),
      contentType: 'document',
      metaTitle: 'About Us',
      metaDescription: 'Learn more about us and what we do.',
      sitemapPriority: 0.9,
      sitemapChangefreq: 'monthly',
      includeInSitemap: true,
      cacheEnabled: true,
      cacheTtl: 3600,
      createdBy: 1,
      updatedBy: 1
    },

    // 3. Privacy Policy
    {
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      sitePath: '/privacy-policy',
      content: '<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="32"><h1>Privacy Policy</h1></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Last updated: August 5, 2025</p><p>This Privacy Policy explains how we collect, use, and protect your information when you use this website or any of our services.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>What We Collect</h2></div>\n<div data-dxce-type="list" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><ul>\n  <li>Basic analytics data (such as IP address, browser type, operating system)</li>\n  <li>Technical data about how you interact with the site (e.g. pages visited, time on page)</li>\n  <li>Information you provide manually (such as email address or form submissions)</li>\n  <li>Authentication tokens (if login or API usage is enabled)</li>\n</ul></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>How We Use Your Data</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We use the collected data to operate and improve the website, provide support, monitor system performance, and prevent abuse.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Cookies</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We may use cookies or local storage to remember your preferences or improve your experience. You can disable cookies in your browser settings.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Third-Party Services</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We may use third-party tools (such as analytics or email delivery services) that process limited technical data on our behalf. These tools do not have access to any private user content.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Data Retention</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We retain data only as long as necessary to provide services and meet legal or operational requirements. You can request deletion of your data at any time by contacting us.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Your Rights</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>You can request access to, correction of, or deletion of your personal information. To do so, email us directly.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Contact</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>If you have any questions or concerns about this policy, please contact us.</p></div>',
      status: 'published',
      isPublic: true,
      publishedAt: new Date(),
      contentType: 'document',
      metaTitle: 'Privacy Policy',
      metaDescription: 'Learn about how we collect, use, and protect your information.',
      sitemapPriority: 0.6,
      sitemapChangefreq: 'yearly',
      includeInSitemap: true,
      cacheEnabled: true,
      cacheTtl: 3600,
      createdBy: 1,
      updatedBy: 1
    },

    // 4. Terms of Service
    {
      title: 'Terms of Service',
      slug: 'terms-of-service',
      sitePath: '/terms-of-service',
      content: '<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="32"><h1>Terms of Service</h1></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>Last updated: August 5, 2025</p><p>By accessing or using this website or any services provided through it, you agree to be bound by these Terms of Service.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Use of the Service</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>You may use the service only for lawful purposes and in accordance with these terms. You are responsible for any activity under your account.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Access</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We reserve the right to suspend or terminate access to the service at any time without notice, for any reason, including violation of these terms.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Ownership</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>All code, content, and materials available on this website are the property of the site owner unless otherwise stated.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Disclaimer</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>This service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted availability or accuracy of the service.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Limitation of Liability</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We are not liable for any indirect, incidental, or consequential damages resulting from your use of the service.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Changes</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>We may update these terms at any time. Continued use of the service means you accept the revised terms.</p></div>\n<div data-dxce-type="heading" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left" data-dxce-font-size="28"><h2>Contact</h2></div>\n<div data-dxce-type="text" data-dxce-width="100" data-dxce-align-row="left" data-dxce-content-align="left"><p>If you have questions about these terms, please please contact us.</p></div>',
      status: 'published',
      isPublic: true,
      publishedAt: new Date(),
      contentType: 'document',
      metaTitle: 'Terms of Service',
      metaDescription: 'Read the terms and conditions for using our services.',
      sitemapPriority: 0.6,
      sitemapChangefreq: 'yearly',
      includeInSitemap: true,
      cacheEnabled: true,
      cacheTtl: 3600,
      createdBy: 1,
      updatedBy: 1
    }
  ];

  for (const page of pages) {
    await prisma.cmsItem.upsert({
      where: { sitePath: page.sitePath },
      update: {
        // Don't update content/title - preserve user's changes
        // Only update timestamps and ensure record exists
        updatedAt: new Date()
      },
      create: {
        title: page.title,
        slug: page.slug,
        sitePath: page.sitePath,
        content: page.content,
        status: page.status,
        isPublic: page.isPublic,
        publishedAt: page.publishedAt,
        contentType: page.contentType,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        sitemapPriority: page.sitemapPriority,
        sitemapChangefreq: page.sitemapChangefreq,
        includeInSitemap: page.includeInSitemap,
        cacheEnabled: page.cacheEnabled,
        cacheTtl: page.cacheTtl,
        createdBy: page.createdBy,
        updatedBy: page.updatedBy,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  console.log(`    ℹ️  Seeded ${pages.length} CMS pages`);
}
