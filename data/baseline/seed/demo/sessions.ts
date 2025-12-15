/**
 * Demo Sessions Seed
 *
 * Generates demo active sessions (refresh tokens) for users
 */

import { PrismaClient } from '../../../prisma/generated/client/index.js';

// Demo users (matching 003-demo-data.ts)
// User IDs: 1=system admin, 2-3=admins, 4-11=managers, 12-26=editors, 27-51=users
const demoUsers = [
  { id: 1, email: 'admin@typus' },
  { id: 2, email: 'john.smith@example.com' },
  { id: 3, email: 'sarah.johnson@example.com' },
  { id: 4, email: 'mike.williams@example.com' },
  { id: 5, email: 'emma.brown@example.com' },
  { id: 6, email: 'alex.davis@example.com' },
  { id: 7, email: 'lisa.martinez@example.com' },
  { id: 8, email: 'david.wilson@example.com' },
  { id: 9, email: 'jennifer.garcia@example.com' },
  { id: 10, email: 'robert.anderson@example.com' },
];

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateToken(): string {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    Buffer.from(JSON.stringify({ sub: Math.random().toString(36), iat: Date.now() })).toString('base64') +
    '.' + Math.random().toString(36).substring(2, 15);
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export async function seedSessions(prisma: PrismaClient) {
  console.log('  📝 Generating demo sessions...');

  // Check if sessions already exist
  const existingCount = await prisma.authRefreshToken.count();
  if (existingCount > 5) {
    console.log(`       ⏭️  Skipping - ${existingCount} sessions already exist`);
    return;
  }

  const sessions: any[] = [];

  // Create active sessions for various users
  // Admin - multiple devices
  sessions.push({
    id: generateUUID(),
    userId: 1,
    token: generateToken(),
    accessTokenJti: generateUUID(),
    expiresAt: hoursFromNow(24 * 7), // 7 days
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  });
  sessions.push({
    id: generateUUID(),
    userId: 1,
    token: generateToken(),
    accessTokenJti: generateUUID(),
    expiresAt: hoursFromNow(24 * 5), // 5 days
    createdAt: hoursAgo(48),
    updatedAt: hoursAgo(48),
  });

  // John Admin
  sessions.push({
    id: generateUUID(),
    userId: 2,
    token: generateToken(),
    accessTokenJti: generateUUID(),
    expiresAt: hoursFromNow(24 * 6),
    createdAt: hoursAgo(24),
    updatedAt: hoursAgo(24),
  });

  // Sarah Manager
  sessions.push({
    id: generateUUID(),
    userId: 3,
    token: generateToken(),
    accessTokenJti: generateUUID(),
    expiresAt: hoursFromNow(24 * 4),
    createdAt: hoursAgo(72),
    updatedAt: hoursAgo(72),
  });

  // Mike Manager
  sessions.push({
    id: generateUUID(),
    userId: 4,
    token: generateToken(),
    accessTokenJti: generateUUID(),
    expiresAt: hoursFromNow(12), // expires soon
    createdAt: hoursAgo(156),
    updatedAt: hoursAgo(156),
  });

  // Emma Editor
  sessions.push({
    id: generateUUID(),
    userId: 5,
    token: generateToken(),
    accessTokenJti: generateUUID(),
    expiresAt: hoursFromNow(24 * 3),
    createdAt: hoursAgo(96),
    updatedAt: hoursAgo(96),
  });

  // Alex Editor - mobile session
  sessions.push({
    id: generateUUID(),
    userId: 6,
    token: generateToken(),
    accessTokenJti: generateUUID(),
    expiresAt: hoursFromNow(24 * 2),
    createdAt: hoursAgo(120),
    updatedAt: hoursAgo(120),
  });

  // David User
  sessions.push({
    id: generateUUID(),
    userId: 8,
    token: generateToken(),
    accessTokenJti: generateUUID(),
    expiresAt: hoursFromNow(6), // expires very soon
    createdAt: hoursAgo(162),
    updatedAt: hoursAgo(162),
  });

  // Insert sessions
  await prisma.authRefreshToken.createMany({
    data: sessions,
    skipDuplicates: true,
  });

  console.log(`  ✅ Created ${sessions.length} demo sessions`);
}
