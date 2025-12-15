import fs from 'node:fs'
import path from 'node:path'
import { globSync } from 'glob'

const projectRoot = process.cwd()
const files = globSync('src/**/*.{vue,ts,tsx,js,jsx}', {
  cwd: projectRoot,
  nodir: true,
  ignore: [
    'src/core/theme/**',
    'src/themes/**',
    'src/components/ui/dxContentEditor/ARCHITECTURE-NOTES.md'
  ]
})

const offenders: string[] = []

files.forEach(file => {
  const abs = path.join(projectRoot, file)
  const content = fs.readFileSync(abs, 'utf-8')
  if (/theme\./.test(content)) {
    offenders.push(file)
  }
})

if (offenders.length) {
  console.error('[guard:theme] Forbidden "theme." access detected in:')
  offenders.forEach(file => console.error(`  - ${file}`))
  process.exit(1)
}

console.log('[guard:theme] OK — no runtime theme object access found')
