/**
 * Newsletter Demo Data Seed
 *
 * Creates realistic demo data for the newsletter plugin:
 * - 500+ subscribers with varied statuses and sources
 * - 5 email templates
 * - 3 completed campaigns with realistic stats
 * - Email delivery logs
 */

import { PrismaClient } from '../../../prisma/generated/client/index.js';
import { randomBytes } from 'crypto';

// Helper to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Generate unsubscribe token
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// First names pool
const firstNames = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William',
  'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander',
  'Sofia', 'Michael', 'Luna', 'Daniel', 'Aria', 'Matthew', 'Scarlett', 'Jackson', 'Grace', 'Sebastian',
  'Chloe', 'David', 'Penelope', 'Joseph', 'Layla', 'Samuel', 'Riley', 'John', 'Zoey', 'Owen',
  'Nora', 'Ryan', 'Lily', 'Luke', 'Eleanor', 'Wyatt', 'Hannah', 'Nathan', 'Lillian', 'Leo'
];

// Last names pool
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'
];

// Domain pool for emails
const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'];

// Sources pool
const sources = ['website', 'website', 'website', 'import', 'api', 'manual', 'main_page', 'main_page'];

function generateEmail(firstName: string, lastName: string): string {
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const formats = [
    `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}${lastName.toLowerCase()}@${domain}`,
    `${firstName.toLowerCase()}_${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}@${domain}`,
    `${firstName[0].toLowerCase()}${lastName.toLowerCase()}@${domain}`
  ];
  return formats[Math.floor(Math.random() * formats.length)];
}

export async function seedNewsletterData(prisma: PrismaClient) {
  console.log('📧 Seeding newsletter data...');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Clear existing data
  try {
    await prisma.$executeRaw`DELETE FROM newsletter_email_logs`;
    await prisma.$executeRaw`DELETE FROM newsletter_campaigns`;
    await prisma.$executeRaw`DELETE FROM newsletter_templates`;
    await prisma.$executeRaw`DELETE FROM newsletter_subscriptions`;
  } catch (e) {
    console.log('   Tables may not exist yet, skipping cleanup');
  }

  // Generate subscribers
  const subscribers: any[] = [];
  const usedEmails = new Set<string>();

  for (let i = 0; i < 520; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    let email = generateEmail(firstName, lastName);

    // Ensure unique email
    while (usedEmails.has(email)) {
      email = generateEmail(firstName, lastName);
    }
    usedEmails.add(email);

    const createdAt = randomDate(ninetyDaysAgo, now);
    const isUnsubscribed = Math.random() < 0.08; // 8% unsubscribe rate
    const isInactive = !isUnsubscribed && Math.random() < 0.05; // 5% inactive

    subscribers.push({
      email,
      name: Math.random() > 0.2 ? `${firstName} ${lastName}` : null, // 80% have name
      status: isUnsubscribed ? 'unsubscribed' : 'active',
      isActive: !isUnsubscribed && !isInactive,
      source: sources[Math.floor(Math.random() * sources.length)],
      tags: JSON.stringify([]),
      unsubscribeToken: generateToken(),
      unsubscribedAt: isUnsubscribed ? randomDate(createdAt, now) : null,
      ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      metadata: JSON.stringify({}),
      createdAt,
      updatedAt: createdAt
    });
  }

  // Insert subscribers
  for (const sub of subscribers) {
    await prisma.$executeRaw`
      INSERT INTO newsletter_subscriptions (email, name, status, isActive, source, tags, unsubscribeToken, unsubscribedAt, ipAddress, userAgent, metadata, createdAt, updatedAt)
      VALUES (${sub.email}, ${sub.name}, ${sub.status}, ${sub.isActive}, ${sub.source}, ${sub.tags}, ${sub.unsubscribeToken}, ${sub.unsubscribedAt}, ${sub.ipAddress}, ${sub.userAgent}, ${sub.metadata}, ${sub.createdAt}, ${sub.updatedAt})
    `;
  }
  console.log(`   Created ${subscribers.length} subscribers`);

  // Create templates
  const templates = [
    {
      name: 'Welcome Email',
      subject: 'Welcome to Our Newsletter!',
      previewText: 'Thanks for subscribing - here\'s what to expect',
      category: 'welcome',
      status: 'active',
      htmlContent: getWelcomeTemplate()
    },
    {
      name: 'Monthly Newsletter',
      subject: 'Your Monthly Update - {{month}}',
      previewText: 'The latest news and updates from our team',
      category: 'newsletter',
      status: 'active',
      htmlContent: getNewsletterTemplate()
    },
    {
      name: 'Product Announcement',
      subject: 'Exciting News: New Feature Launch!',
      previewText: 'We\'ve been working on something special',
      category: 'promotional',
      status: 'active',
      htmlContent: getAnnouncementTemplate()
    },
    {
      name: 'Flash Sale',
      subject: '24-Hour Flash Sale - Don\'t Miss Out!',
      previewText: 'Limited time offer inside',
      category: 'promotional',
      status: 'active',
      htmlContent: getSaleTemplate()
    },
    {
      name: 'Re-engagement',
      subject: 'We Miss You, {{name}}!',
      previewText: 'It\'s been a while - here\'s what you\'ve missed',
      category: 'promotional',
      status: 'draft',
      htmlContent: getReengagementTemplate()
    }
  ];

  const templateIds: number[] = [];
  for (const t of templates) {
    const result = await prisma.$executeRaw`
      INSERT INTO newsletter_templates (name, subject, previewText, htmlContent, textContent, status, category, variables, createdAt, updatedAt)
      VALUES (${t.name}, ${t.subject}, ${t.previewText}, ${t.htmlContent}, ${null}, ${t.status}, ${t.category}, ${JSON.stringify(['name', 'email', 'unsubscribeUrl'])}, ${now}, ${now})
    `;
    // Get the inserted ID
    const [inserted] = await prisma.$queryRaw<any[]>`SELECT LAST_INSERT_ID() as id`;
    templateIds.push(inserted.id);
  }
  console.log(`   Created ${templates.length} templates`);

  // Create campaigns with realistic stats
  const campaigns = [
    {
      name: 'November Newsletter',
      templateId: templateIds[1],
      status: 'completed',
      totalRecipients: 485,
      sentCount: 480,
      failedCount: 5,
      openCount: 178,
      clickCount: 42,
      startedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000)
    },
    {
      name: 'Black Friday Sale',
      templateId: templateIds[3],
      status: 'completed',
      totalRecipients: 490,
      sentCount: 488,
      failedCount: 2,
      openCount: 312,
      clickCount: 89,
      startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000)
    },
    {
      name: 'December Newsletter',
      templateId: templateIds[1],
      status: 'draft',
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
      openCount: 0,
      clickCount: 0,
      startedAt: null,
      completedAt: null
    }
  ];

  for (const c of campaigns) {
    await prisma.$executeRaw`
      INSERT INTO newsletter_campaigns (name, templateId, status, recipientFilter, totalRecipients, sentCount, failedCount, openCount, clickCount, scheduledAt, startedAt, completedAt, createdAt, updatedAt)
      VALUES (${c.name}, ${c.templateId}, ${c.status}, ${JSON.stringify({ status: 'active' })}, ${c.totalRecipients}, ${c.sentCount}, ${c.failedCount}, ${c.openCount}, ${c.clickCount}, ${null}, ${c.startedAt}, ${c.completedAt}, ${now}, ${now})
    `;
  }
  console.log(`   Created ${campaigns.length} campaigns`);

  console.log('✅ Newsletter data seeded');
}

// Template HTML generators
function getWelcomeTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; padding-bottom: 30px; border-bottom: 2px solid #eee; }
    .content { padding: 30px 0; }
    .button { display: inline-block; padding: 14px 28px; background: #2563eb; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { text-align: center; padding-top: 30px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="color: #1f2937; margin: 0;">Welcome Aboard!</h1>
    </div>
    <div class="content">
      <p>Hi {{name}},</p>
      <p>Thank you for subscribing to our newsletter! We're thrilled to have you join our community.</p>
      <p>Here's what you can expect:</p>
      <ul>
        <li>Weekly tips and insights</li>
        <li>Exclusive content and offers</li>
        <li>Industry news and updates</li>
      </ul>
      <p style="text-align: center; margin: 30px 0;">
        <a href="#" class="button">Explore Our Content</a>
      </p>
    </div>
    <div class="footer">
      <p>You're receiving this because you subscribed at our website.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

function getNewsletterTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
    .header h1 { color: white; margin: 0; }
    .content { padding: 30px 20px; }
    .article { margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #eee; }
    .article h2 { color: #1f2937; margin-top: 0; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white !important; text-decoration: none; border-radius: 6px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Monthly Newsletter</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Your monthly dose of updates</p>
    </div>
    <div class="content">
      <p>Hello {{name}},</p>
      <p>Here's what's been happening this month:</p>

      <div class="article">
        <h2>Feature Highlight</h2>
        <p>We've launched some exciting new features that we think you'll love. Check out the latest updates and see how they can help streamline your workflow.</p>
        <a href="#" class="button">Learn More</a>
      </div>

      <div class="article">
        <h2>Tips & Tricks</h2>
        <p>Did you know? Here are some power-user tips to help you get the most out of our platform.</p>
      </div>

      <div class="article" style="border-bottom: none; margin-bottom: 0; padding-bottom: 0;">
        <h2>Community Spotlight</h2>
        <p>See how other users are achieving amazing results with their projects.</p>
      </div>
    </div>
    <div class="footer">
      <p>You're receiving this because you subscribed to our newsletter.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a> | <a href="#">View in browser</a></p>
    </div>
  </div>
</body>
</html>`;
}

function getAnnouncementTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
    .hero { text-align: center; padding: 40px 0; }
    .button { display: inline-block; padding: 16px 32px; background: #10b981; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .footer { text-align: center; padding: 30px 0; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <span class="badge">NEW FEATURE</span>
      <h1 style="font-size: 32px; color: #1f2937; margin: 20px 0;">Something Amazing is Here!</h1>
      <p style="font-size: 18px; color: #6b7280;">We've been working hard on this, and we can't wait to show you.</p>
      <p style="margin: 30px 0;">
        <a href="#" class="button">See What's New</a>
      </p>
    </div>
    <div class="footer">
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

function getSaleTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; }
    .hero { background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); padding: 60px 20px; text-align: center; }
    .hero h1 { color: white; font-size: 48px; margin: 0; }
    .hero p { color: rgba(255,255,255,0.9); font-size: 20px; margin: 15px 0; }
    .countdown { background: white; padding: 30px 20px; text-align: center; }
    .countdown h2 { margin: 0 0 10px; color: #ef4444; }
    .button { display: inline-block; padding: 18px 40px; background: #ef4444; color: white !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 18px; text-transform: uppercase; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>FLASH SALE</h1>
      <p>Up to 50% off everything!</p>
    </div>
    <div class="countdown">
      <h2>Limited Time Only</h2>
      <p>This offer expires in 24 hours. Don't miss your chance!</p>
      <p style="margin: 30px 0;">
        <a href="#" class="button">Shop Now</a>
      </p>
    </div>
    <div class="footer">
      <p><a href="{{unsubscribeUrl}}" style="color: #9ca3af;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

function getReengagementTemplate(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .emoji { font-size: 48px; text-align: center; margin-bottom: 20px; }
    h1 { text-align: center; color: #1f2937; }
    .button { display: inline-block; padding: 14px 28px; background: #8b5cf6; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { text-align: center; padding-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">👋</div>
    <h1>We Miss You, {{name}}!</h1>
    <p style="text-align: center; color: #6b7280;">It's been a while since we've seen you. Here's what you've been missing:</p>
    <ul>
      <li>New features and improvements</li>
      <li>Exclusive member content</li>
      <li>Special offers just for you</li>
    </ul>
    <p style="text-align: center; margin: 30px 0;">
      <a href="#" class="button">Come Back & Explore</a>
    </p>
    <div class="footer">
      <p>Not interested anymore? <a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}
