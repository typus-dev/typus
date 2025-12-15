import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..'); // projectRoot is /frontend directory
const siteRoot = path.resolve(projectRoot, '../..'); // siteRoot is project root
const customThemesDir = path.resolve(siteRoot, 'custom/styles/themes');
const publicThemesDir = path.resolve(siteRoot, 'public/styles/themes');
const outputFile = path.join(projectRoot, 'src', 'auto-themes.json');

// --- TypeScript Types ---
interface ThemeManifest {
  name: string;
  title: string;
  icon: string;
  type: 'light' | 'dark';
  description?: string;
  default?: boolean;
  source?: 'custom' | 'public';
}

// --- Helper Functions ---

/**
 * Check if directory exists
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Scan a directory for themes
 * A valid theme must have a 00-tokens.css file
 */
async function scanThemesInDirectory(dir: string, source: 'custom' | 'public'): Promise<ThemeManifest[]> {
  const themes: ThemeManifest[] = [];

  // Check if directory exists
  if (!(await directoryExists(dir))) {
    return themes;
  }

  // Find all directories in themes folder
  const themeDirs = await glob(`${dir}/*`, { absolute: true });

  for (const themeDir of themeDirs) {
    const themeName = path.basename(themeDir);

    // Skip if not a directory
    const stat = await fs.stat(themeDir);
    if (!stat.isDirectory()) {
      continue;
    }

    const tokensFile = path.join(themeDir, '00-tokens.css');

    // Validate theme has 00-tokens.css
    if (!(await fileExists(tokensFile))) {
      console.log(`  ⏭️  Skipping ${themeName} (missing 00-tokens.css)`);
      continue;
    }

    // Check for manifest.json
    const manifestPath = path.join(themeDir, 'manifest.json');
    let themeData: ThemeManifest;

    if (await fileExists(manifestPath)) {
      // Read custom manifest
      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const customManifest = JSON.parse(manifestContent);

        themeData = {
          name: themeName,
          title: customManifest.title || themeName.replace(/-/g, ' '),
          icon: customManifest.icon || 'ri:brush-line',
          type: customManifest.type || 'dark',
          description: customManifest.description,
          default: customManifest.default === true,
          source: source
        };

        console.log(`  ✅ ${themeName} (from manifest.json)${customManifest.default ? ' [DEFAULT]' : ''}`);
      } catch (error) {
        console.log(`  ⚠️  ${themeName} (invalid manifest.json, using defaults)`);

        themeData = {
          name: themeName,
          title: themeName.replace(/-/g, ' '),
          icon: 'ri:brush-line',
          type: 'dark',
          source: source
        };
      }
    } else {
      // Generate default manifest
      themeData = {
        name: themeName,
        title: themeName.replace(/-/g, ' '),
        icon: 'ri:brush-line',
        type: 'dark',
        source: source
      };

      console.log(`  ✅ ${themeName} (auto-generated metadata)`);
    }

    themes.push(themeData);
  }

  return themes;
}

/**
 * Scan custom/styles/themes for custom themes
 */
async function scanCustomThemes(): Promise<ThemeManifest[]> {
  console.log(`\n🔍 Scanning custom themes in: ${customThemesDir}`);
  const themes = await scanThemesInDirectory(customThemesDir, 'custom');
  console.log(`\n✨ Found ${themes.length} valid custom themes`);
  return themes;
}

/**
 * Scan public/themes for public themes (replaces hardcoded CORE_THEMES)
 */
async function scanPublicThemes(): Promise<ThemeManifest[]> {
  console.log(`\n🔍 Scanning public themes in: ${publicThemesDir}`);
  const themes = await scanThemesInDirectory(publicThemesDir, 'public');
  console.log(`\n✨ Found ${themes.length} valid public themes`);
  return themes;
}

/**
 * Generate combined themes manifest with CUSTOM themes first (highest priority)
 */
async function generateThemesManifest(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎨 Generating Themes Manifest');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 1. Scan custom themes (highest priority)
  const customThemes = await scanCustomThemes();

  // 2. Scan public themes (from public/themes/)
  const publicThemes = await scanPublicThemes();

  // 3. Combine with CUSTOM themes FIRST (priority!)
  const allThemes = [...customThemes, ...publicThemes];

  // 4. Sort: default theme first, then preserve order
  allThemes.sort((a, b) => {
    if (a.default && !b.default) return -1;
    if (!a.default && b.default) return 1;
    return 0;
  });

  console.log(`\n📊 Total themes: ${allThemes.length}`);
  console.log(`   - Custom: ${customThemes.length}`);
  console.log(`   - Public: ${publicThemes.length}`);

  // 4. Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  await fs.mkdir(outputDir, { recursive: true });

  // 5. Write themes.json (clean format without source field)
  const themesForOutput = allThemes.map(({ source, ...theme }) => theme);
  await fs.writeFile(outputFile, JSON.stringify(themesForOutput, null, 2) + '\n', 'utf-8');

  console.log(`\n✅ Themes manifest generated successfully!`);
  console.log(`   Output: ${outputFile}`);

  // 6. Display priority order
  console.log(`\n📋 Theme Priority Order (first = highest):`);
  allThemes.forEach((theme, index) => {
    const badge = theme.source === 'custom' ? '🎯 CUSTOM' : '📁 PUBLIC';
    console.log(`   ${index + 1}. ${badge} - ${theme.name}`);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// --- Main Execution ---
generateThemesManifest().catch((error) => {
  console.error('❌ Error generating themes manifest:', error);
  process.exit(1);
});
