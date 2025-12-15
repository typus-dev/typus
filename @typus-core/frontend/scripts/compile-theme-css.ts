import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { glob } from 'glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const siteRoot = path.resolve(projectRoot, '../..')
const publicThemesDir = path.resolve(siteRoot, 'public/styles/themes')
const customThemesDir = path.resolve(siteRoot, 'custom/styles/themes')
const files = ['variables', 'components', 'layouts', 'utilities']
const helperUtilities = '@layer utilities { .fixed-size { @apply w-auto h-auto; } }'

// Dynamically scan themes from public/styles/themes/ and custom/styles/themes/
async function scanThemes(): Promise<string[]> {
  const publicDirs = await glob(`${publicThemesDir}/*`)
  const customDirs = await glob(`${customThemesDir}/*`)

  const allDirs = [...customDirs, ...publicDirs]
  const themes = allDirs
    .map(dir => path.basename(dir))
    .filter(name => !name.startsWith('_'))  // Skip _template, _archive
    .filter((name, index, self) => self.indexOf(name) === index)  // Remove duplicates

  return themes
}

async function compileCssSegment(theme: string, segment: string, themesDir: string) {
  const inputPath = path.join(themesDir, theme, `${segment}.css`)
  const original = await fs.readFile(inputPath, 'utf8')
  const tmpBase = path.join(
    os.tmpdir(),
    `typus-theme-${theme}-${segment}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`
  )
  const tmpInput = `${tmpBase}.in.css`
  const tmpOutput = `${tmpBase}.out.css`
  const prefixed = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n${helperUtilities}\n\n${original}`
  await fs.writeFile(tmpInput, prefixed, 'utf8')

  const tailwind = spawnSync(
    'pnpm',
    ['exec', 'tailwindcss', '-c', 'tailwind.config.js', '-i', tmpInput, '-o', tmpOutput],
    { cwd: projectRoot, stdio: 'inherit' }
  )
  if (tailwind.status !== 0) {
    throw new Error(`Tailwind build failed for ${theme}/${segment}`)
  }

  const compiled = await fs.readFile(tmpOutput, 'utf8')
  const marker = `/* Theme: ${theme} */`
  let index = compiled.indexOf(marker)
  if (index === -1) {
    index = compiled.indexOf(`[data-theme="${theme}"]`)
  }
  if (index === -1) {
    throw new Error(`Unable to locate compiled rules for ${theme}/${segment}`)
  }

  const cleaned = `${compiled.slice(index).replace(/\\s+$/u, '')}\n`
  await fs.writeFile(inputPath, cleaned, 'utf8')
  await Promise.all([
    fs.unlink(tmpInput).catch(() => {}),
    fs.unlink(tmpOutput).catch(() => {})
  ])
}

async function main() {
  const themes = await scanThemes()

  if (themes.length === 0) {
    console.warn('⚠️  No themes found in public/styles/themes/ or custom/styles/themes/')
    console.warn('   Create a theme first or check directory paths.')
    process.exit(0)
  }

  console.log(`Found ${themes.length} theme(s): ${themes.join(', ')}`)

  for (const theme of themes) {
    // Check if theme exists in custom first, then public
    let themesDir = publicThemesDir
    const customThemePath = path.join(customThemesDir, theme)
    const publicThemePath = path.join(publicThemesDir, theme)

    try {
      await fs.access(customThemePath)
      themesDir = customThemesDir
      console.log(`\nCompiling CUSTOM theme: ${theme}`)
    } catch {
      themesDir = publicThemesDir
      console.log(`\nCompiling PUBLIC theme: ${theme}`)
    }

    for (const file of files) {
      const filePath = path.join(themesDir, theme, `${file}.css`)
      try {
        await fs.access(filePath)
        console.log(`  - ${file}.css`)
        await compileCssSegment(theme, file, themesDir)
      } catch {
        console.log(`  ⏭️  Skipping ${file}.css (not found)`)
      }
    }
  }
  console.log('\n✅ Theme CSS compilation complete.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
