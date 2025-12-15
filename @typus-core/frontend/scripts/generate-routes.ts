#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Generate routes.json from Vue files with <route> blocks
 * This script scans Vue files and includes only public routes (those with <route> blocks)
 */

interface RouteInfo {
  name: string;
  path: string;
  priority: number;
  changefreq: string;
}

interface ParsedRoute {
  name?: string;
  path: string;
  meta?: {
    layout?: string;
    title?: string;
    priority?: number;
    changefreq?: string;
    requiresAuth?: boolean | string;
  };
}

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractRoutesFromVueFiles(autoRoutesMap: Map<string, string>): Promise<RouteInfo[]> {
  const searchDirs = [
    path.join(__dirname, '../src/pages'),
    path.join(__dirname, '../src/modules'),
    path.join(__dirname, '../../../custom/frontend/pages')
  ];
  console.log('📁 Route search directories:', searchDirs);
  const routes: RouteInfo[] = [];

  for (const baseDir of searchDirs) {
    try {
      await fs.access(baseDir);
      console.log(`📂 Scanning directory: ${baseDir}`);
      await scanDirectory(baseDir);
    } catch {
      console.warn(`⚠️  Directory not found: ${baseDir}`);
    }
  }

  async function scanDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.vue')) {
        const routeInfo = await extractRouteFromVueFile(fullPath, autoRoutesMap);
        if (routeInfo) {
          routes.push(routeInfo);
        }
      }
    }
  }

  return routes;
}

function isPublicRoute(parsedRoute: ParsedRoute): boolean {
  const meta = parsedRoute.meta;
  if (!meta) return false;

  // Check for explicit public indicators
  return (
    meta.requiresAuth === false ||
    meta.requiresAuth === "false" ||
    meta.requiresAuth === "no" ||
    meta.layout === "public" || 
    meta.layout === "demo" 
  );
}

async function extractRouteFromVueFile(filePath: string, autoRoutesMap: Map<string, string>): Promise<RouteInfo | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Look for <route> block
    const routeBlockMatch = content.match(/<route[^>]*>([\s\S]*?)<\/route>/);
    
    if (!routeBlockMatch) {
      // No <route> block = private component, skip
      console.log(`❌ Skipped file without <route> block: ${filePath}`);
      return null;
    }

    const routeBlockContent = routeBlockMatch[1].trim();
    
    // Parse JSON from route block
    let parsedRoute: ParsedRoute;
    try {
      parsedRoute = JSON.parse(routeBlockContent);
    } catch (error) {
      console.warn(`⚠️  JSON error in route block ${filePath}:`, error);
      return null;
    }

    // Skip routes without path (incomplete route definitions) - try to get from auto-routes
    if (!parsedRoute.path) {
      // Try to find path from auto-routes using the route name
      const routeName = parsedRoute.name;
      if (routeName && autoRoutesMap.has(routeName)) {
        parsedRoute.path = autoRoutesMap.get(routeName)!;
     
      } else {
        console.warn(`⚠️  Route block missing 'path' field and not found in auto-routes: ${routeName || 'unnamed'} in ${filePath}, skipping`);
        return null;
      }
    }

    // Skip routes with parameters (dynamic routes)
    if (parsedRoute.path.includes(':')) {
      console.warn(`⚠️  Skipping dynamic route: ${parsedRoute.path} (${filePath})`);
      return null;
    }

    // STRICT CHECK: Only include explicitly public routes in sitemap
    if (!isPublicRoute(parsedRoute)) {
      const meta = parsedRoute.meta;
      const reasons = [];
      
      if (meta?.requiresAuth === true || meta?.requiresAuth === "true") {
        reasons.push("requiresAuth=true");
      }
      if (meta?.layout && !['public', 'demo'].includes(meta.layout)) {
        reasons.push(`layout=${meta.layout} (not public/demo)`);
      }
      if (!meta?.layout && meta?.requiresAuth === undefined) {
        reasons.push("no explicit public indicators");
      }
      if (meta?.requiresAuth !== false && meta?.requiresAuth !== "false" && meta?.requiresAuth !== "no" && 
          meta?.layout !== "public" && meta?.layout !== "demo") {
        if (reasons.length === 0) {
          reasons.push(`layout=${meta?.layout || 'undefined'}, requiresAuth=${meta?.requiresAuth || 'undefined'}`);
        }
      }
      
      console.warn(`⚠️  Skipping route: ${parsedRoute.path} --- ${reasons.join(', ')} --- ${filePath}`);
      return null;
    }

    // Extract route information
    const routeInfo: RouteInfo = {
      name: parsedRoute.name || path.basename(filePath, '.vue'),
      path: parsedRoute.path,
      priority: parsedRoute.meta?.priority || calculatePriority(parsedRoute.path, parsedRoute.name || ''),
      changefreq: parsedRoute.meta?.changefreq || calculateChangeFreq(parsedRoute.path, parsedRoute.name || '')
    };

    console.log(`✅ Found public route: ${routeInfo.name} -> ${routeInfo.path} (included)`);
    
    return routeInfo;

  } catch (error) {
    console.warn(`⚠️  Error processing ${filePath}:`, error);
    return null;
  }
}

function calculatePriority(path: string, name: string): number {
  let priority: number;
  
  // Homepage gets highest priority
  if (path === '/') priority = 1.0;
  // Important pages
  else if (path.includes('/dashboard') || path.includes('/profile')) priority = 0.9;
  else if (path.includes('/docs')) priority = 0.8;
  else if (path.includes('/cms')) priority = 0.7;
  // Demo and auth pages get lower priority
  else if (path.includes('/demo') || path.includes('/auth')) priority = 0.3;
  // Default priority
  else priority = 0.6;
  
  return priority;
}

function calculateChangeFreq(path: string, name: string): string {
  let freq: string;
  
  // Homepage and dashboard change frequently
  if (path === '/' || path.includes('/dashboard')) freq = 'daily';
  // Documentation changes weekly
  else if (path.includes('/docs')) freq = 'weekly';
  // Auth and demo pages rarely change
  else if (path.includes('/demo') || path.includes('/auth')) freq = 'monthly';
  // Default frequency
  else freq = 'weekly';
  
  return freq;
}

async function clearSitemapCache(): Promise<void> {
  try {
    // Clear sitemap cache files - use environment variable or fallback to relative path
    const cacheDir = process.env.CACHE_DIR || '';
    const sitemapFiles = ['sitemap.xml', 'sitemap.json'];
    
    console.log(`📁 Cache directory: ${cacheDir}`);
    
    for (const filename of sitemapFiles) {
      const filePath = path.join(cacheDir, filename);
      
      // Check if file exists before deletion
      let existsBefore = false;
      try {
        await fs.access(filePath);
        existsBefore = true;
        console.log(`📄 File exists before deletion: ${filePath}`);
      } catch {
        console.log(`📄 File does not exist: ${filePath}`);
        continue;
      }
      
      // Try to delete the file
      try {
        await fs.unlink(filePath);
        console.log(`🗑️  Deletion attempt: ${filePath}`);
        
        // Check if file still exists after deletion
        try {
          await fs.access(filePath);
          console.error(`❌ File still exists after deletion: ${filePath}`);
        } catch {
          console.log(`✅ File successfully deleted: ${filePath}`);
        }
        
      } catch (error) {
        if ((error as any).code !== 'ENOENT') {
          console.warn(`⚠️  Failed to delete ${filename}:`, error);
          console.warn(`⚠️  Error details:`, {
            code: (error as any).code,
            errno: (error as any).errno,
            path: (error as any).path,
            syscall: (error as any).syscall
          });
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Error clearing sitemap cache:', error);
  }
}

async function generateRoutesJson(): Promise<void> {
  try {
    // First, read the auto-routes file to show total available routes
    let autoRoutesMap = new Map<string, string>();
    try {
      const autoRoutesPath = path.join(__dirname, '../src/typed-router.d.ts');
      const autoRoutesContent = await fs.readFile(autoRoutesPath, 'utf-8');
      
      // Match RouteRecordInfo patterns and extract name->path mapping
      const routeMatches = autoRoutesContent.match(/'([^']+)':\s*RouteRecordInfo<'[^']+',\s*'([^']+)'/g) || [];
      routeMatches.forEach(match => {
        const parts = match.match(/'([^']+)':\s*RouteRecordInfo<'[^']+',\s*'([^']+)'/);
        if (parts) {
          autoRoutesMap.set(parts[1], parts[2]); // name -> path
        }
      });
      
      console.log(`📄 Processing auto-routes file: ${autoRoutesPath}`);
      console.log(`📊 Found ${autoRoutesMap.size} total routes in auto-routes`);
    } catch (error) {
      console.warn('⚠️  Could not read auto-routes file for comparison');
    }
    
    console.log('🔍 Extracting routes from Vue files with <route> blocks...');
    console.log('='.repeat(60));
    
    const allRoutes = await extractRoutesFromVueFiles(autoRoutesMap);
    
    console.log('='.repeat(60));
    console.log(`📊 SCAN RESULTS: Found ${allRoutes.length} routes`);
    
    // Deduplicate routes by path (keep the one with highest priority)
    const routeMap = new Map<string, RouteInfo>();
    
    for (const route of allRoutes) {
      const existing = routeMap.get(route.path);
      if (!existing || route.priority > existing.priority) {
        if (existing) {
          console.log(`🔄 Replacing duplicate route "${route.path}": ${existing.name} -> ${route.name} (priority: ${existing.priority} -> ${route.priority})`);
        }
        routeMap.set(route.path, route);
      } else if (route.priority === existing.priority) {
        // If same priority, prefer the newer one (custom pages are scanned last, so they override core)
        console.log(`🔄 Replacing duplicate route "${route.path}": ${existing.name} -> ${route.name} (same priority, preferring later/custom)`);
        routeMap.set(route.path, route);
      }
    }
    
    const routes = Array.from(routeMap.values());
    

    
    // Ensure dist directory exists
    const distDir = path.join(__dirname, '../dist');
    await fs.mkdir(distDir, { recursive: true });
    
    // Ensure public directory exists
    const publicDir = path.join(__dirname, '../public');
    await fs.mkdir(publicDir, { recursive: true });
    
    const routesJson = JSON.stringify(routes, null, 2);
    
    // Write routes.json to dist directory
    const distRoutesPath = path.join(distDir, 'routes.json');
    await fs.writeFile(distRoutesPath, routesJson);
    
    // Write routes.json to public directory for HTTP access
    const publicRoutesPath = path.join(publicDir, 'routes.json');
    await fs.writeFile(publicRoutesPath, routesJson);
    
    console.log('='.repeat(60));
    console.log(`✅ Generated routes.json with ${routes.length} routes`);
    console.log(`📁 Saved to dist: ${distRoutesPath}`);
    console.log(`📁 Saved to public: ${publicRoutesPath}`);
    
    // Clear sitemap cache to force regeneration with new routes
    await clearSitemapCache();
    
  } catch (error) {
    console.error('❌ Error generating routes.json:', error);
    process.exit(1);
  }
}

// Run the script
generateRoutesJson().catch(error => {
  console.error('❌ Route generation failed:', error);
  process.exit(1);
});

export { generateRoutesJson, extractRoutesFromVueFiles };
