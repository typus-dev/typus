#!/usr/bin/env npx tsx
/**
 * Build Themes System
 *
 * Single command to update all theme-related files:
 * 1. Generate themes.json manifest (discovers custom themes)
 * 2. Generate index.html (Vite entry point)
 *
 * Usage:
 *   npx tsx scripts/build-themes.ts
 *
 * Run this after:
 *   - Adding a new theme to custom/frontend/styles/
 *   - Removing a theme
 *   - Changing theme manifest.json
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('╔════════════════════════════════════════╗');
console.log('║     TYPUS THEME BUILD SYSTEM           ║');
console.log('╚════════════════════════════════════════╝\n');

try {
  // Step 1: Generate themes.json
  console.log('📋 Step 1/2: Generating themes manifest...\n');
  execSync(`npx tsx ${join(__dirname, 'generate-themes-manifest.ts')}`, {
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });

  console.log('\n');

  // Step 2: Generate index.html
  console.log('🔧 Step 2/2: Generating index.html...\n');
  execSync(`npx tsx ${join(__dirname, 'generate-index-html.ts')}`, {
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });

  console.log('\n');
  console.log('╔════════════════════════════════════════╗');
  console.log('║     ✅ THEME BUILD COMPLETE            ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('Next steps:');
  console.log('  1. Restart Docker: docker compose restart');
  console.log('  2. Clear browser cache if needed');
  console.log('  3. New themes available in theme switcher\n');

} catch (error) {
  console.error('\n❌ Theme build failed:', error);
  process.exit(1);
}
