/**
 * CMS Routes Seed
 *
 * Seeds dynamic routes for CMS pages.
 * Must run AFTER cms-pages seed (006).
 *
 * Creates frontend routes that map to CMS items using ContentDisplay component.
 */

import { PrismaClient } from '../../prisma/generated/client/index.js';
import { randomUUID } from 'crypto';

export async function seedCmsRoutes(prisma: PrismaClient) {
  // Define routes to create
  const routePaths = [
    { path: '/contact', name: 'Contact' },
    { path: '/about', name: 'About' },
    { path: '/privacy-policy', name: 'Privacy Policy' },
    { path: '/terms-of-service', name: 'Terms of Service' }
  ];

  let created = 0;

  for (const route of routePaths) {
    // Find the CMS item for this path
    const cmsItem = await prisma.cmsItem.findFirst({
      where: { sitePath: route.path }
    });

    if (!cmsItem) {
      console.log(`    ⚠️  CMS item not found for path: ${route.path}`);
      continue;
    }

    // Delete existing route for this path (cleanup)
    await prisma.systemDynamicRoute.deleteMany({
      where: { path: route.path }
    });

    // Create new route
    await prisma.systemDynamicRoute.create({
      data: {
        id: randomUUID(),
        path: route.path,
        name: route.name,
        component: 'ContentDisplay',
        parentId: null,
        orderIndex: 0,
        meta: JSON.stringify({
          cmsItemId: cmsItem.id,
          layout: cmsItem.layout || null
        }),
        isActive: true,
        createdBy: 1,
        updatedBy: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    created++;
  }

  console.log(`    ℹ️  Seeded ${created} dynamic routes`);
}
