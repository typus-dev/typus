import { fileURLToPath } from 'url'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const outputPath = path.join(projectRoot, 'public', 'themes', 'shared', 'utilities.css')

async function buildUtilities() {
  const tmpInput = path.join(
    os.tmpdir(),
    `tailwind-shared-utilities-${Date.now()}-${Math.random().toString(36).slice(2)}.css`
  )

  await fs.writeFile(tmpInput, '@tailwind utilities;\n', 'utf8')

  const result = spawnSync(
    'pnpm',
    ['exec', 'tailwindcss', '-c', 'tailwind.config.js', '-i', tmpInput, '-o', outputPath, '--minify'],
    {
      cwd: projectRoot,
      stdio: 'inherit'
    }
  )

  await fs.unlink(tmpInput).catch(() => {})

  if (result.status !== 0) {
    throw new Error('Failed to compile shared Tailwind utilities')
  }
}

buildUtilities().catch((error) => {
  console.error(error)
  process.exit(1)
})
