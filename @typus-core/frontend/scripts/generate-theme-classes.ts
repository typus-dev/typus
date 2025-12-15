import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type TokenEntry = {
  className: string
  value: string
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const tokenMapPath = path.resolve(projectRoot, '../../../work-log/themes/theme-token-map.json')
const outputPath = path.resolve(projectRoot, 'src/styles/theme-classes.css')

if (!fs.existsSync(tokenMapPath)) {
  throw new Error(`Token map not found at ${tokenMapPath}`)
}

const raw = fs.readFileSync(tokenMapPath, 'utf-8')
const entries: TokenEntry[] = JSON.parse(raw)

const classMap = new Map<string, string>()

for (const entry of entries) {
  if (!entry?.className || !entry?.value) continue
  if (!classMap.has(entry.className)) {
    classMap.set(entry.className, entry.value.trim())
  }
}

const lines: string[] = []
lines.push('@tailwind utilities;')
lines.push('')
lines.push('@layer utilities {')
lines.push('  .fixed-size {')
lines.push('    @apply w-auto h-auto;')
lines.push('  }')
lines.push('')

for (const [className, value] of classMap) {
  lines.push(`  .${className} {`)
  lines.push(`    @apply ${value};`)
  lines.push('  }')
}

lines.push('}')

fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8')

console.log(`Generated ${classMap.size} theme classes → ${path.relative(projectRoot, outputPath)}`)
