#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Check for route conflicts between different layers (core, modules, plugins, custom)
 * Helps identify which routes are overridden by custom pages
 */

interface RouteInfo {
  name: string;
  path: string;
  file: string;
  layer: 'core' | 'module' | 'plugin' | 'custom';
  priority: number;
}

interface RouteConflict {
  path: string;
  routes: RouteInfo[];
  winner: RouteInfo;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractRouteFromFile(filePath: string): Promise<RouteInfo | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Look for <route> block
    const routeBlockMatch = content.match(/<route[^>]*>([\s\S]*?)<\/route>/);

    if (!routeBlockMatch) {
      return null;
    }

    const routeBlockContent = routeBlockMatch[1].trim();

    // Parse JSON from route block
    let parsedRoute;
    try {
      parsedRoute = JSON.parse(routeBlockContent);
    } catch (error) {
      console.warn(`⚠️  JSON parse error in ${filePath}:`, error);
      return null;
    }

    if (!parsedRoute.path) {
      return null;
    }

    return {
      name: parsedRoute.name || path.basename(filePath, '.vue'),
      path: parsedRoute.path,
      file: filePath,
      layer: 'core', // Will be set by caller
      priority: 0 // Will be set by caller
    };

  } catch (error) {
    console.warn(`⚠️  Error processing ${filePath}:`, error);
    return null;
  }
}

async function scanDirectory(dir: string, layer: 'core' | 'module' | 'plugin' | 'custom', priority: number): Promise<RouteInfo[]> {
  const routes: RouteInfo[] = [];

  async function scan(currentDir: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.vue')) {
          const routeInfo = await extractRouteFromFile(fullPath);
          if (routeInfo) {
            routeInfo.layer = layer;
            routeInfo.priority = priority;
            routes.push(routeInfo);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist - that's ok for optional directories
    }
  }

  await scan(dir);
  return routes;
}

async function checkRouteConflicts(): Promise<void> {
  console.log('🔍 [Route Conflict Checker] Starting analysis...\n');

  const baseDir = path.join(__dirname, '..');

  // Scan all layers
  const coreRoutes = await scanDirectory(
    path.join(baseDir, 'src/pages'),
    'core',
    1
  );

  const moduleRoutes = await scanDirectory(
    path.join(baseDir, 'src/modules'),
    'module',
    2
  );

  const pluginRoutes = await scanDirectory(
    path.join(baseDir, '../../plugins'),
    'plugin',
    3
  );

  const customRoutes = await scanDirectory(
    path.join(baseDir, '../../custom/frontend/pages'),
    'custom',
    4
  );

  const allRoutes = [
    ...coreRoutes,
    ...moduleRoutes,
    ...pluginRoutes,
    ...customRoutes
  ];

  console.log('📊 [Scan Results]');
  console.log(`   Core routes:   ${coreRoutes.length}`);
  console.log(`   Module routes: ${moduleRoutes.length}`);
  console.log(`   Plugin routes: ${pluginRoutes.length}`);
  console.log(`   Custom routes: ${customRoutes.length}`);
  console.log(`   Total:         ${allRoutes.length}\n`);

  // Group by path to find conflicts
  const routesByPath = new Map<string, RouteInfo[]>();

  for (const route of allRoutes) {
    if (!routesByPath.has(route.path)) {
      routesByPath.set(route.path, []);
    }
    routesByPath.get(route.path)!.push(route);
  }

  // Find conflicts
  const conflicts: RouteConflict[] = [];

  for (const [routePath, routes] of routesByPath) {
    if (routes.length > 1) {
      // Sort by priority (higher priority wins)
      routes.sort((a, b) => b.priority - a.priority);

      conflicts.push({
        path: routePath,
        routes,
        winner: routes[0]
      });
    }
  }

  // Display conflicts
  if (conflicts.length === 0) {
    console.log('✅ No route conflicts detected\n');
    return;
  }

  console.log(`⚠️  [Route Overrides Detected: ${conflicts.length}]\n`);

  for (const conflict of conflicts) {
    console.log(`⚠️  Path: ${conflict.path}`);

    // Show all conflicting routes
    for (let i = conflict.routes.length - 1; i >= 0; i--) {
      const route = conflict.routes[i];
      const isWinner = route === conflict.winner;
      const icon = isWinner ? '✅' : '  ';
      const status = isWinner ? 'WINS' : 'overridden';

      const relativeFile = route.file.replace(baseDir, '').replace('../../', '');

      console.log(`   ${icon} [${route.layer.toUpperCase().padEnd(6)}] ${route.name} (${status})`);
      console.log(`      File: ${relativeFile}`);
    }

    console.log('');
  }

  console.log(`📊 Summary: ${allRoutes.length} total routes, ${conflicts.length} overrides\n`);
}

// Run the script
checkRouteConflicts().catch(error => {
  console.error('❌ Route conflict check failed:', error);
  process.exit(1);
});
