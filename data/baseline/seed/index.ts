/**
 * Typus CMS - Database-Agnostic Seed Script
 *
 * This script seeds baseline data into any database (MySQL, SQLite, PostgreSQL)
 * using Prisma Client for database abstraction.
 *
 * Environment Variables:
 * - SKIP_DEMO_DATA: Set to 'true' to skip demo data (only seed admin user and system config)
 * - LOAD_EXTENDED_DEMO: Set to 'true' to load extended demo data (logs, history, etc.)
 * - DATABASE_URL: Prisma database connection string
 */

// Import Prisma Client from pre-generated location (relative path from seed directory: /app/data/baseline/seed/)
import { PrismaClient } from '../../prisma/generated/client/index.js';
import { seedSystemConfig } from './001-system-config.js';
import { seedAdminUser } from './002-admin-user.js';
import { seedDemoData } from './003-demo-data.js';
import { seedConfigPublic } from './004-config-public.js';
import { seedDispatcherTasks } from './005-dispatcher-tasks.js';
import { seedCmsPages } from './006-cms-pages.js';
import { seedCmsRoutes } from './007-cms-routes.js';
import { seedExtendedDemo } from './demo/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Typus CMS database seed...');
  console.log('');

  // By default skip demo data for clean installation
  // Set LOAD_DEMO_DATA=true to load demo users/categories/tags
  const skipDemo = process.env.LOAD_DEMO_DATA !== 'true';

  try {
    // Step 1: System Configuration
    console.log('📋 [1/7] Seeding system configuration...');
    await seedSystemConfig(prisma);
    console.log('  ✅ System config applied');
    console.log('');

    // Step 2: Public Configuration
    console.log('🌐 [2/7] Seeding public configuration...');
    await seedConfigPublic(prisma);
    console.log('  ✅ Public config applied');
    console.log('');

    // Step 3: Admin User
    console.log('👤 [3/7] Seeding admin user...');
    await seedAdminUser(prisma);
    console.log('  ✅ Admin user created');
    console.log('');

    // Step 4: Dispatcher Tasks
    console.log('⚙️  [4/7] Seeding dispatcher tasks...');
    await seedDispatcherTasks(prisma);
    console.log('  ✅ Dispatcher tasks created');
    console.log('');

    // Step 5: CMS Pages
    console.log('📄 [5/7] Seeding CMS pages...');
    await seedCmsPages(prisma);
    console.log('  ✅ CMS pages created');
    console.log('');

    // Step 6: CMS Routes
    console.log('🛣️  [6/7] Seeding CMS routes...');
    await seedCmsRoutes(prisma);
    console.log('  ✅ CMS routes created');
    console.log('');

    // Step 7: Demo Data (optional)
    if (!skipDemo) {
      console.log('🎭 [7/7] Seeding demo data...');
      await seedDemoData(prisma);
      console.log('  ✅ Demo data applied');
      console.log('');
    } else {
      console.log('⏭️  [7/7] Skipping demo data (set LOAD_DEMO_DATA=true to enable)');
      console.log('');
    }

    // Step 8: Extended Demo Data (optional)
    const loadExtendedDemo = process.env.LOAD_EXTENDED_DEMO === 'true';
    if (loadExtendedDemo && !skipDemo) {
      console.log('🎯 [8/8] Seeding extended demo data...');
      await seedExtendedDemo(prisma);
      console.log('  ✅ Extended demo data applied');
      console.log('');
    }

    console.log('✅ Seed completed successfully');
    console.log('');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
