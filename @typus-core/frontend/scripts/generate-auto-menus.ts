import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const modulesDir = path.join(projectRoot, 'src', 'modules');
const pluginsDir = path.join(projectRoot, '..', '..', 'plugins');
const outputDir = path.join(projectRoot, 'src');
const layoutsDir = path.join(projectRoot, 'src', 'layouts');
const menuFilePattern = path.join(modulesDir, '**', '*.menu.ts').replace(/\\/g, '/');
// Exactly one level down, like every other scanner in the engine: a plugin is plugins/<name>/,
// and its menu is plugins/<name>/frontend/*.menu.ts. This pattern used to be '**', which reached
// INTO plugins, so the example plugin's TEMPLATE -- a directory that exists to be copied, not to
// run -- was collected as a real menu entry of the running application. It stayed invisible only
// because the template was missing the `layout` the collector requires: one defect was hiding
// another, and fixing the template alone would have put 'Example Template' in everyone's menu.
const pluginMenuFilePattern = path.join(pluginsDir, '*', 'frontend', '*.menu.ts').replace(/\\/g, '/');
const generatedFilePrefix = 'auto-menu.';
const generatedFileSuffix = '';
const generatedExportName = 'autoNavigationItems';

// Interfaces
interface MenuItem {
  id?: string;
  title: string;
  path?: string;
  icon?: string;
  layout?: string;
  injectAfter?: string;
  ability?: {
    action: string;
    subject: string;
  };
  items?: MenuItem[];
  [key: string]: any;
}

// Find all menu files from enabled modules and plugins
async function findMenuFiles(): Promise<string[]> {
  console.log(`Searching for menu files in: ${menuFilePattern}`);
  console.log(`Searching for plugin menu files in: ${pluginMenuFilePattern}`);

  const moduleFiles = await glob(menuFilePattern, { absolute: true });
  const pluginFiles = await glob(pluginMenuFilePattern, { absolute: true });

  console.log(`Found ${moduleFiles.length} module menu files`);
  console.log(`Found ${pluginFiles.length} plugin menu files`);

  const enabledFiles: string[] = [];

  // Process module files (check for .disable)
  for (const file of moduleFiles) {
    const modulePath = path.dirname(file);
    const disableFilePath = path.join(modulePath, '.disable');

    try {
      await fs.access(disableFilePath);
      const moduleName = path.basename(modulePath);
      console.log(`Module ${moduleName} is disabled (found .disable file)`);
    } catch {
      enabledFiles.push(file);
    }
  }

  // Process plugin files (check for .disable in plugin root)
  for (const file of pluginFiles) {
    // Plugin structure: plugins/plugin-name/frontend/menu.ts
    const frontendDir = path.dirname(file);
    const pluginDir = path.dirname(frontendDir);
    const disableFilePath = path.join(pluginDir, '.disable');

    try {
      await fs.access(disableFilePath);
      const pluginName = path.basename(pluginDir);
      console.log(`Plugin ${pluginName} is disabled (found .disable file)`);
    } catch {
      enabledFiles.push(file);
      console.log(`Plugin menu enabled: ${path.basename(file)}`);
    }
  }

  console.log(`Total: ${moduleFiles.length + pluginFiles.length} menu files, ${enabledFiles.length} enabled`);
  return enabledFiles;
}

/**
 * Anything a person plausibly meant as a menu entry.
 *
 * WHY THIS EXISTS: the collector below keeps only exports that have `layout`, and everything else
 * was dropped without a word. So the single most common mistake -- writing a menu entry and
 * forgetting `layout` -- produced no file, no warning and no menu, and the author had nothing to
 * read. An export that carries a title, a path or child items was clearly intended as one, and if
 * it cannot be used we say so, by name.
 */
function looksLikeMenuItem(exp: any): boolean {
  return exp !== null
    && typeof exp === 'object'
    && !Array.isArray(exp)
    && ('title' in exp || 'label' in exp || 'path' in exp || 'items' in exp || 'children' in exp);
}

// Collected while importing, reported together at the end so one run lists every broken entry.
const menuProblems: string[] = [];

// Import menu items from a file
async function importMenuModule(filePath: string): Promise<MenuItem[]> {
  try {
    const mod = await import(filePath);
    const usable: MenuItem[] = [];

    for (const [exportName, exp] of Object.entries(mod)) {
      if (exp !== null && typeof exp === 'object' && 'layout' in (exp as any)) {
        usable.push(exp as MenuItem);
        continue;
      }
      if (looksLikeMenuItem(exp)) {
        const named = (exp as any).title ?? (exp as any).label ?? exportName;
        menuProblems.push(
          `${filePath}: export '${exportName}' ("${named}") has no layout, so it cannot be placed in ` +
          `any menu. Add layout: 'private' (or another directory name under src/layouts). ` +
          `Note the label field is 'title'.`
        );
      }
    }

    return usable;
  } catch (error) {
    console.error(`Error importing menu module ${filePath}:`, error);
    throw error;
  }
}

// Generate TypeScript content from menu items
function generateTsContent(items: MenuItem[]): string {
  const itemsString = JSON.stringify(items, null, 2)
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"/g, "'");

  return `// This file is auto-generated by scripts/generate-auto-menus.ts
// Do not edit this file directly.

export const ${generatedExportName} = ${itemsString};
`;
}

// Write the menu file to disk
async function writeMenuFile(layoutName: string, items: MenuItem[]): Promise<void> {
  const outputFilePath = path.join(outputDir, `${generatedFilePrefix}${layoutName}${generatedFileSuffix}.ts`);

  try {
    const tsContent = generateTsContent(items);
    await fs.writeFile(outputFilePath, tsContent, 'utf-8');
    console.log(`Successfully generated menu file: ${outputFilePath}`);
  } catch (error) {
    console.error(`Error writing menu file for layout ${layoutName}:`, error);
  }
}

// Process menu items to apply injectAfter rules
function processMenuItems(allItems: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = [];
  const indexById = new Map<string, MenuItem>();
  const queue = [...allItems];

  // Create flat map for ID access
  for (const item of queue) {
    if (item.id) indexById.set(item.id, item);
  }

  // Recursive insert
  function insertItem(targetList: MenuItem[], item: MenuItem): boolean {
    for (let i = 0; i < targetList.length; i++) {
      const target = targetList[i];

      // Match by ID or title
      const match = target.id === item.injectAfter || target.title === item.injectAfter;
      if (match) {
        targetList.splice(i + 1, 0, item);
        return true;
      }

      if (target.items && insertItem(target.items, item)) {
        return true;
      }
    }
    return false;
  }

  // First pass: place items without injectAfter
  const deferred: MenuItem[] = [];
  for (const item of queue) {
    if (!item.injectAfter) {
      result.push(item);
    } else {
      deferred.push(item);
    }
  }

  let pass = 0;
  while (deferred.length > 0 && pass < 10) {
    const stillDeferred: MenuItem[] = [];

    for (const item of deferred) {
      const inserted = insertItem(result, item);
      if (!inserted) stillDeferred.push(item);
    }

    if (stillDeferred.length === deferred.length) {
      // No progress
      break;
    }

    deferred.length = 0;
    deferred.push(...stillDeferred);
    pass++;
  }

  // Any remaining items couldn't be inserted
  // An injectAfter that names nothing is a placement nobody will notice is wrong: the entry lands
  // at the end of the menu, next to whatever happens to be last, and looks deliberate. Two entries
  // in this tree were in that state -- one of them anchored on its OWN child, which can never
  // resolve. Collected as a problem, which stops generation, so the author fixes the anchor rather
  // than discovering the menu is subtly wrong months later.
  if (deferred.length > 0) {
    for (const item of deferred) {
      menuProblems.push(
        `menu entry "${item.title}" has injectAfter: "${item.injectAfter}", and no entry with that ` +
        `id or title exists. Anchor it on an entry that is really there, or drop injectAfter to ` +
        `place it at the end deliberately.`
      );
      result.push(item);
    }
  }

  return result;
}

// Clean up properties not needed in output
function cleanupMenuItems(items: MenuItem[]): MenuItem[] {
  return items.map(item => {
    const newItem = { ...item };
    delete newItem.layout;
    delete newItem.injectAfter;
    
    if (newItem.items && Array.isArray(newItem.items)) {
      newItem.items = cleanupMenuItems(newItem.items);
    }
    
    return newItem;
  });
}

// Get all available layouts by scanning layouts directory
async function getAvailableLayouts(): Promise<string[]> {
  try {
    const layoutDirs = await fs.readdir(layoutsDir, { withFileTypes: true });
    return layoutDirs
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (error) {
    console.warn('Could not read layouts directory:', error);
    return [];
  }
}

// Main function to generate menus
async function generateMenus(): Promise<void> {
  console.log('Starting menu generation...');
  
  try {
    // Find all menu files from modules and plugins
    const menuFiles = await findMenuFiles();
    
    // Group menu items by layout
    const menusByLayout: Record<string, MenuItem[]> = {};
    
    for (const file of menuFiles) {
      const menuItems = await importMenuModule(file);
      
      for (const item of menuItems) {
        if (!item.layout) {
          // Unreachable now that the collector reports these; kept so a future change to the
          // collector cannot quietly restore the old silence.
          menuProblems.push(`menu item "${item.title}" reached generation without a layout`);
          continue;
        }
        
        if (!menusByLayout[item.layout]) {
          menusByLayout[item.layout] = [];
        }
        
        menusByLayout[item.layout].push(item);
      }
    }
    
    // Get all available layouts
    const availableLayouts = await getAvailableLayouts();
    
    // Process each layout (both those with dynamic menus and those with only static menus)
    const allLayouts = new Set([...Object.keys(menusByLayout), ...availableLayouts]);
    
    for (const layoutName of allLayouts) {
      // Load static menu for this layout if it exists
      let staticMenu: MenuItem[] = [];
      
      try {
        const staticMenuPath = path.join(layoutsDir, layoutName, `${layoutName}.menu.ts`);
        const staticMenuModule = await import(`file://${staticMenuPath}`);
        staticMenu = staticMenuModule.navigationItems || [];
        
        console.log(`Loaded static menu for layout "${layoutName}" with ${staticMenu.length} items`);
      } catch (error) {
        console.warn(`Static menu not found for layout "${layoutName}". Using empty base.`);
      }
      
      // Get dynamic items for this layout
      const dynamicItems = menusByLayout[layoutName] || [];
      
      // Only generate if we have either static or dynamic items
      if (staticMenu.length > 0 || dynamicItems.length > 0) {
        // Deep clone objects to avoid modifying originals
        const baseMenu = JSON.parse(JSON.stringify(staticMenu));
        const clonedDynamicItems = JSON.parse(JSON.stringify(dynamicItems));
        
        // Combine static and dynamic menus and apply injectAfter rules
        const combinedItems = [...baseMenu, ...clonedDynamicItems];
        const processedItems = processMenuItems(combinedItems);
        
        // Clean up special properties
        const finalMenu = cleanupMenuItems(processedItems);
        
        // Write to file
        await writeMenuFile(layoutName, finalMenu);
      } else {
        console.log(`Skipping layout "${layoutName}" - no menu items found`);
      }
    }
    
    if (menuProblems.length > 0) {
      console.error('');
      console.error(`Menu generation refused: ${menuProblems.length} export(s) look like menu entries but cannot be used.`);
      for (const problem of menuProblems) {
        console.error(`  - ${problem}`);
      }
      console.error('');
      process.exit(1);
    }

    console.log('Menu generation completed successfully.');
  } catch (error) {
    console.error('Menu generation failed:', error);
    process.exit(1);
  }
}

// Run the menu generator
generateMenus();