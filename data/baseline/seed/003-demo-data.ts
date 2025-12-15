/**
 * Demo Data Seed
 *
 * Seeds comprehensive demo data for a realistic-looking installation:
 * - Additional roles (manager, editor, user, guest)
 * - 9 demo users (all password: demo123)
 * - Categories and tags
 *
 * Note: Plugin-specific data (CRM, Newsletter, Web Analytics) is seeded
 * by individual plugins, not the core seed.
 *
 * This data makes the site look alive and working after installation.
 * Safe to skip in production by setting SKIP_DEMO_DATA=true.
 */

// Import Prisma Client from pre-generated location (relative path from seed directory: /app/data/baseline/seed/)
import { PrismaClient } from '../../prisma/generated/client/index.js';

export async function seedDemoData(prisma: PrismaClient) {
  let totalCreated = 0;

  // 1. Additional Roles
  console.log('    📋 Creating roles...');
  const roles = [
    { id: 2, name: 'manager', description: 'Manager', abilityRules: '[{"action": "manage", "subject": "CRM"}]' },
    { id: 3, name: 'editor', description: 'Editor', abilityRules: '[{"action": "manage", "subject": "CMS"}]' },
    { id: 4, name: 'user', description: 'User', abilityRules: '[{"action": "read", "subject": "all"}]' },
    { id: 5, name: 'guest', description: 'Guest', abilityRules: '[{"action": "read", "subject": "public"}]' },
  ];

  for (const role of roles) {
    const existing = await prisma.authRole.findFirst({ where: { name: role.name } });
    if (!existing) {
      await prisma.authRole.create({
        data: {
          name: role.name,
          description: role.description,
          deleted: false,
          abilityRules: role.abilityRules,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      totalCreated++;
    }
  }
  console.log(`       ✅ ${roles.length} roles`);

  // 2. Demo Users (password: demo123)
  // Hash: $2b$10$rZ7zV3qX.vfYc4wQXt9tUeK3MxE9BYx5m6vN8wR2kL4pS7tA9uC0W
  console.log('    👥 Creating demo users...');
  const demoPasswordHash = '$2b$10$rZ7zV3qX.vfYc4wQXt9tUeK3MxE9BYx5m6vN8wR2kL4pS7tA9uC0W';

  // First/Last name pools for generating 50 users
  const firstNames = [
    'John', 'Sarah', 'Mike', 'Emma', 'Alex', 'Lisa', 'David', 'Jennifer', 'Robert', 'Maria',
    'James', 'Patricia', 'Michael', 'Linda', 'William', 'Elizabeth', 'Richard', 'Barbara', 'Joseph', 'Susan',
    'Thomas', 'Jessica', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Betty', 'Matthew', 'Helen',
    'Anthony', 'Sandra', 'Mark', 'Donna', 'Donald', 'Carol', 'Steven', 'Ruth', 'Paul', 'Sharon',
    'Andrew', 'Michelle', 'Joshua', 'Laura', 'Kenneth', 'Sarah', 'Kevin', 'Kimberly', 'Brian', 'Deborah'
  ];
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Martinez', 'Wilson', 'Garcia', 'Anderson', 'Taylor',
    'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Lopez', 'Lee', 'Gonzalez',
    'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall', 'Young', 'Allen', 'Sanchez',
    'Wright', 'King', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Ramirez', 'Campbell',
    'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards'
  ];

  // Generate 50 demo users
  const demoUsers: Array<{id: number, email: string, firstName: string, lastName: string, role: string, isAdmin: boolean, phone: string, daysAgo: number}> = [];

  // 2 admins
  demoUsers.push({ id: 2, email: 'john.admin@example.com', firstName: 'John', lastName: 'Smith', role: 'admin', isAdmin: true, phone: '+1-555-0101', daysAgo: 180 });
  demoUsers.push({ id: 3, email: 'sarah.admin@example.com', firstName: 'Sarah', lastName: 'Johnson', role: 'admin', isAdmin: true, phone: '+1-555-0102', daysAgo: 175 });

  // 8 managers
  for (let i = 0; i < 8; i++) {
    const id = 4 + i;
    const fn = firstNames[2 + i];
    const ln = lastNames[2 + i];
    demoUsers.push({
      id,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      firstName: fn,
      lastName: ln,
      role: 'manager',
      isAdmin: false,
      phone: `+1-555-01${(id).toString().padStart(2, '0')}`,
      daysAgo: 150 - (i * 10)
    });
  }

  // 15 editors
  for (let i = 0; i < 15; i++) {
    const id = 12 + i;
    const fn = firstNames[10 + i];
    const ln = lastNames[10 + i];
    demoUsers.push({
      id,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      firstName: fn,
      lastName: ln,
      role: 'editor',
      isAdmin: false,
      phone: `+1-555-01${(id).toString().padStart(2, '0')}`,
      daysAgo: 120 - (i * 5)
    });
  }

  // 25 regular users
  for (let i = 0; i < 25; i++) {
    const id = 27 + i;
    const fn = firstNames[25 + i] || firstNames[i];
    const ln = lastNames[25 + i] || lastNames[i];
    demoUsers.push({
      id,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i > 0 ? i : ''}@example.com`,
      firstName: fn,
      lastName: ln,
      role: 'user',
      isAdmin: false,
      phone: `+1-555-01${(id).toString().padStart(2, '0')}`,
      daysAgo: Math.floor(Math.random() * 90) + 1
    });
  }

  let usersCreated = 0;
  for (const user of demoUsers) {
    const existing = await prisma.authUser.findUnique({ where: { email: user.email } });
    if (!existing) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - user.daysAgo);

      await prisma.authUser.create({
        data: {
          email: user.email,
          password: demoPasswordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isAdmin: user.isAdmin,
          isApproved: true,
          isEmailVerified: true,
          phoneNumber: user.phone,
          createdAt: createdAt,
          updatedAt: new Date()
        }
      });
      usersCreated++;
      totalCreated++;
    }
  }
  console.log(`       ✅ ${usersCreated} demo users (password: demo123)`);

  // Link users to roles (generated from demoUsers array)
  const userRoleMappings: Array<{userId: number, roleId: number}> = [];

  // Map roles to roleIds: admin=1, manager=2, editor=3, user=4
  const roleNameToId: Record<string, number> = {
    'admin': 1,
    'manager': 2,
    'editor': 3,
    'user': 4
  };

  for (const user of demoUsers) {
    const roleId = roleNameToId[user.role];
    if (roleId) {
      userRoleMappings.push({ userId: user.id, roleId });
    }
  }

  for (const mapping of userRoleMappings) {
    const existing = await prisma.authUserRole.findFirst({
      where: { userId: mapping.userId, roleId: mapping.roleId }
    });
    if (!existing) {
      // Check if user exists first
      const userExists = await prisma.authUser.findUnique({ where: { id: mapping.userId } });
      const roleExists = await prisma.authRole.findUnique({ where: { id: mapping.roleId } });

      if (userExists && roleExists) {
        await prisma.authUserRole.create({
          data: {
            userId: mapping.userId,
            roleId: mapping.roleId,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
    }
  }

  // 3. CMS Categories
  console.log('    📁 Creating categories...');
  const categories = [
    { id: 1, name: 'Technology', slug: 'technology', description: 'Tech news and tutorials', parentId: null },
    { id: 2, name: 'Business', slug: 'business', description: 'Business insights and strategies', parentId: null },
    { id: 3, name: 'Lifestyle', slug: 'lifestyle', description: 'Life, health, and wellness', parentId: null },
    { id: 4, name: 'News', slug: 'news', description: 'Latest news and updates', parentId: null },
    { id: 5, name: 'Tutorials', slug: 'tutorials', description: 'How-to guides and tutorials', parentId: null },
    { id: 6, name: 'Programming', slug: 'programming', description: 'Coding tutorials', parentId: 5 },
    { id: 7, name: 'Design', slug: 'design', description: 'Design tips and tricks', parentId: 5 },
  ];

  let categoriesCreated = 0;
  for (const category of categories) {
    const existing = await prisma.cmsCategory.findFirst({ where: { slug: category.slug } });
    if (!existing) {
      await prisma.cmsCategory.create({
        data: {
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      categoriesCreated++;
      totalCreated++;
    }
  }
  console.log(`       ✅ ${categoriesCreated} categories`);

  // 4. CMS Tags
  console.log('    🏷️  Creating tags...');
  const tags = [
    'javascript', 'typescript', 'react', 'nodejs', 'python',
    'seo', 'content-marketing', 'social-media', 'travel', 'photography',
    'food', 'fitness', 'tutorial', 'beginner', 'advanced'
  ];

  let tagsCreated = 0;
  for (const tagName of tags) {
    const slug = tagName.toLowerCase();
    const existing = await prisma.cmsTag.findFirst({ where: { slug } });
    if (!existing) {
      await prisma.cmsTag.create({
        data: {
          name: tagName,
          slug: slug,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      tagsCreated++;
      totalCreated++;
    }
  }
  console.log(`       ✅ ${tagsCreated} tags`);

  // Note: Plugin-specific demo data (Newsletter, CRM, Web Analytics) should be
  // seeded by individual plugins, not the core seed.

  console.log(`    📊 Total demo records created: ${totalCreated}`);
}
