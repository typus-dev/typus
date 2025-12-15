import fs from 'node:fs'
import path from 'node:path'
import { globSync } from 'glob'

const projectRoot = path.resolve(process.cwd(), 'src')
const files = globSync('src/**/*.{vue,ts,js,tsx}', { cwd: path.resolve(process.cwd()), nodir: true })

const destructRegex = /const\s*\{([\s\S]*?)\}\s*=\s*useTheme\(\)\s*;?/g

const stripThemeFromDestruct = (match: string, group: string) => {
  const items = group
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)

  const filtered = items.filter(item => !/^theme(\s*=.*)?$/i.test(item))
  if (filtered.length === items.length) {
    return match
  }

  if (filtered.length === 0) {
    return ''
  }

  return `const { ${filtered.join(', ')} } = useTheme()`
}

let updatedCount = 0

files.forEach(file => {
  const absPath = path.resolve(process.cwd(), file)
  let content = fs.readFileSync(absPath, 'utf-8')
  const newContent = content.replace(destructRegex, stripThemeFromDestruct)

  if (newContent !== content) {
    let finalContent = newContent

    if (!finalContent.includes('useTheme(')) {
      finalContent = finalContent.replace(/\n?import\s+\{[^}]*useTheme[^}]*\}\s+from\s+['\"]@[^'\"]+useTheme['\"];?\n?/g, '\n')
    }

    fs.writeFileSync(absPath, finalContent, 'utf-8')
    updatedCount += 1
  }
})

console.log(`[cleanup-theme-destruct] Updated ${updatedCount} files`)
