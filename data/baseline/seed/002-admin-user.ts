/**
 * Admin User Seed
 *
 * Creates default admin role and admin user account.
 * Password is taken from ADMIN_PASSWORD environment variable.
 * If not set, generates a random password and logs it.
 */

// Import Prisma Client from pre-generated location (relative path from seed directory: /app/data/baseline/seed/)
import { PrismaClient } from '../../prisma/generated/client/index.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function seedAdminUser(prisma: PrismaClient) {
  // Get admin email from env or use default
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@typus';

  // Check if admin user already exists
  const existingUser = await prisma.authUser.findFirst({
    where: { email: adminEmail }
  });

  if (existingUser) {
    console.log('    ℹ️  Admin user already exists, skipping');
    return;
  }

  // Create admin role (if not exists)
  const existingRole = await prisma.authRole.findFirst({
    where: { name: 'admin' }
  });

  let adminRole;
  if (existingRole) {
    adminRole = existingRole;
    console.log('    ℹ️  Admin role already exists');
  } else {
    adminRole = await prisma.authRole.create({
      data: {
        name: 'admin',
        description: 'Admin',
        deleted: false,
        abilityRules: JSON.stringify([{ action: 'manage', subject: 'all', inverted: false }]),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log('    ✅ Admin role created');
  }

  // Get password from env or generate random
  let adminPassword = process.env.ADMIN_PASSWORD;
  let passwordGenerated = false;

  if (!adminPassword) {
    adminPassword = crypto.randomBytes(9).toString('base64').slice(0, 12);
    passwordGenerated = true;
  }

  // Hash password with bcrypt (10 rounds) - bcryptjs is compatible with bcrypt
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  // Create admin user
  const adminUser = await prisma.authUser.create({
    data: {
      email: adminEmail,
      password: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isAdmin: true,
      isApproved: true,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // Link admin user to admin role
  await prisma.authUserRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  if (passwordGenerated) {
    console.log('    ✅ Admin user created');
    console.log('    ╔═══════════════════════════════════════════════════╗');
    console.log('    ║  🔐 GENERATED ADMIN CREDENTIALS                   ║');
    console.log('    ╠═══════════════════════════════════════════════════╣');
    console.log(`    ║  Email:    ${adminEmail.padEnd(38)} ║`);
    console.log(`    ║  Password: ${adminPassword.padEnd(38)} ║`);
    console.log('    ╚═══════════════════════════════════════════════════╝');
    console.log('    ⚠️  SAVE THIS PASSWORD! It won\'t be shown again.');
  } else {
    console.log(`    ✅ Admin user created (${adminEmail})`);
  }
}
