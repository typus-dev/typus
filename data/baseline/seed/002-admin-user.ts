/**
 * Roles and admin user seed.
 *
 * Creates the roles the engine itself refers to, then the admin account.
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

  const ensureRole = async (name: string, description: string, abilityRules: unknown[]) => {
    const existing = await prisma.authRole.findFirst({ where: { name } });
    if (existing) {
      console.log(`    ℹ️  Role '${name}' already exists`);
      return existing;
    }
    const created = await prisma.authRole.create({
      data: {
        name,
        description,
        deleted: false,
        abilityRules: JSON.stringify(abilityRules),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    console.log(`    ✅ Role '${name}' created`);
    return created;
  };

  // ROLES ARE SEEDED BEFORE, AND INDEPENDENTLY OF, THE ADMIN ACCOUNT.
  //
  // WHY 'user' has to exist: registration writes role: 'user' on every new account, and the engine
  // reads that role BY NAME to build the caller's ability rules. A clean install seeded only 'admin',
  // so every registered person pointed at a row that was not there: their abilityRules came back
  // empty, the router guard denied every private page, and an upload died with "File not found"
  // while the file was fine. Nobody noticed because nobody had installed the engine from scratch in
  // months.
  //
  // WHY these two subjects and not 'all': the guard asks can('manage', route.meta.subject), and in
  // the core the only subjects a signed-in person owns are their own profile and their own files.
  // Everything else in the core -- auth, system, cms, dynamic-routes -- is an operator surface.
  // 'manage' on 'all' would hand a customer the admin console. A product that adds user-facing
  // pages adds its own subjects here.
  await ensureRole('user', 'Registered user', [
    { action: 'manage', subject: 'profile', inverted: false },
    { action: 'manage', subject: 'storage', inverted: false }
  ]);

  const adminRole = await ensureRole('admin', 'Admin', [
    { action: 'manage', subject: 'all', inverted: false }
  ]);

  // Check if admin user already exists
  const existingUser = await prisma.authUser.findFirst({
    where: { email: adminEmail }
  });

  if (existingUser) {
    console.log('    ℹ️  Admin user already exists, skipping');
    return;
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
