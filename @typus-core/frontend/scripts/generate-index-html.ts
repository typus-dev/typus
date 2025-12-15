#!/usr/bin/env npx tsx
/**
 * Generate index.html from themes.json
 *
 * This script generates the Vite entry point (index.html) with all
 * available themes from themes.json, ensuring custom themes take priority.
 *
 * Usage:
 *   npx tsx scripts/generate-index-html.ts
 *
 * Run after:
 *   npx tsx scripts/generate-themes-manifest.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ThemeManifest {
  name: string;
  title: string;
  icon: string;
  type: 'light' | 'dark';
  description?: string;
}

// Standard CSS files for each theme
const THEME_CSS_FILES = [
  '00-tokens.css',
  '01-base.css',
  '02-typography.css',
  '03-content.css',
  '04-colors.css',
  '05-layout.css',
  '06-components.css',
  '07-mixins.css',
  '07-effects.css',
  '99-overrides.css'
];

// Additional files for specific themes (optional)
const THEME_EXTRA_FILES: Record<string, string[]> = {
  // Add theme-specific extra files here if needed
};

function generateThemeLinks(themes: ThemeManifest[]): string {
  const lines: string[] = [];

  // Cache buster timestamp
  const cacheBuster = Date.now();

  // Shared theme assets
  lines.push('    <!-- Shared theme assets -->');
  lines.push(`    <link rel="stylesheet" href="/styles/shared/content.css?v=${cacheBuster}">`);
  lines.push(`    <link rel="stylesheet" href="/styles/shared/dxce-preview.css?v=${cacheBuster}">`);
  lines.push(`    <link rel="stylesheet" href="/styles/shared/utilities.css?v=${cacheBuster}">`);
  lines.push(`    <link rel="stylesheet" href="/styles/shared/tailwind.css?v=${cacheBuster}">`);
  lines.push('');

  // All themes in order from manifest
  for (const theme of themes) {
    lines.push(`    <!-- Theme: ${theme.title} (${theme.name}) -->`);

    // Standard files
    for (const file of THEME_CSS_FILES) {
      lines.push(`    <link rel="stylesheet" href="/styles/themes/${theme.name}/${file}?v=${cacheBuster}">`);
    }

    // Extra files for this theme
    const extraFiles = THEME_EXTRA_FILES[theme.name] || [];
    for (const file of extraFiles) {
      lines.push(`    <link rel="stylesheet" href="/styles/themes/${theme.name}/${file}?v=${cacheBuster}">`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 Generating index.html from themes.json');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Paths
  const frontendRoot = join(__dirname, '..');
  const themesJsonPath = join(frontendRoot, 'src/auto-themes.json');
  const indexHtmlPath = join(frontendRoot, 'index.html');

  // Load themes
  if (!existsSync(themesJsonPath)) {
    console.error('❌ themes.json not found. Run generate-themes-manifest.ts first.');
    process.exit(1);
  }

  const themes: ThemeManifest[] = JSON.parse(readFileSync(themesJsonPath, 'utf-8'));
  console.log(`📋 Found ${themes.length} themes in manifest\n`);

  // Determine default theme (first theme from manifest)
  if (themes.length === 0) {
    console.error('❌ No themes found! Cannot generate index.html without themes.');
    process.exit(1);
  }
  const defaultTheme = themes[0].name;

  console.log(`🎨 Default theme: ${defaultTheme}\n`);

  // Generate theme links
  const themeLinks = generateThemeLinks(themes);

  // Generate index.html
  const indexHtml = `<!doctype html>
<html lang="en" data-theme="${defaultTheme}">
  <head>
    <meta charset="UTF-8" />
    <!-- Favicon -->
    <link rel="icon" href="/favicon/favicon.svg" type="image/png">
    <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png">
    <link rel="manifest" href="/favicon/manifest.webmanifest">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Orbitron:wght@400;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600&family=JetBrains+Mono&family=Sora:wght@400;500;600&display=swap" rel="stylesheet">

${themeLinks}
    <title>Loading...</title>

    <!-- Cache buster for theme CSS in dev mode -->
    <script>
      if (location.hostname === 'localhost' || location.hostname.includes('dev.')) {
        document.querySelectorAll('link[rel="stylesheet"][href*="/styles/"]').forEach(link => {
          link.href = link.href.split('?')[0] + '?v=' + Date.now();
        });
      }
    </script>
  </head>
  <body class="app font-jetbrains theme-colors-text-primary min-h-screen">

    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`;

  // Write index.html
  writeFileSync(indexHtmlPath, indexHtml, 'utf-8');

  console.log('✅ Generated index.html successfully!');
  console.log(`   Output: ${indexHtmlPath}\n`);

  // Summary
  console.log('📊 Theme Order (CSS cascade):');
  themes.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.name}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main();
