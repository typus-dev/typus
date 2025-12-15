import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import { globSync } from 'glob'
import MagicString from 'magic-string'
import { parseForESLint } from 'vue-eslint-parser'
import { KEYS } from 'eslint-visitor-keys'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tsParser = require('@typescript-eslint/parser')

interface ThemeEntry {
  path: string
  className: string
}

interface Replacement {
  start: number
  end: number
  className: string
}

const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/
const ignoredKeys = new Set(['parent'])

const themeMapPath = path.resolve(__dirname, '../../../../work-log/themes/theme-token-map.json')
if (!fs.existsSync(themeMapPath)) {
  throw new Error(`Theme token map not found: ${themeMapPath}`)
}

const rawEntries: ThemeEntry[] = JSON.parse(fs.readFileSync(themeMapPath, 'utf-8'))
const tokenMap = new Map<string, string>()

const isStaticPath = (pathExpression: string) => {
  const bracketMatches = pathExpression.match(/\[[^\]]+\]/g)
  if (!bracketMatches) {
    return true
  }

  return bracketMatches.every(segment => {
    const inner = segment.slice(1, -1) // remove surrounding [ ]
    return /^'[A-Za-z0-9_-]+'$/.test(inner)
  })
}

rawEntries.forEach(entry => {
  if (isStaticPath(entry.path)) {
    tokenMap.set(entry.path, entry.className)
  }
})

const dryRun = process.argv.includes('--dry-run')

const files = globSync('src/**/*.vue', {
  cwd: path.resolve(__dirname, '..'),
  absolute: true
})

const summary: Record<string, number> = {}

for (const file of files) {
  const source = fs.readFileSync(file, 'utf-8')
  const replacements = collectReplacements(source, file)

  if (!replacements.length) {
    continue
  }

  const ms = new MagicString(source)
  replacements
    .sort((a, b) => b.start - a.start)
    .forEach(({ start, end, className }) => {
      ms.update(start, end, `'${className}'`)
    })

  if (!dryRun) {
    fs.writeFileSync(file, ms.toString(), 'utf-8')
  }
  summary[path.relative(process.cwd(), file)] = replacements.length
}

if (Object.keys(summary).length === 0) {
  console.log('No replacements applied.')
} else {
  console.log(dryRun ? 'Planned replacements (dry run):' : 'Applied replacements:')
  Object.entries(summary).forEach(([file, count]) => {
    console.log(`  ${file}: ${count}`)
  })
}

function collectReplacements(source: string, filePath: string): Replacement[] {
  const parserOptions = {
    ecmaVersion: 2022,
    sourceType: 'module' as const,
    range: true,
    loc: false,
    parser: {
      ts: tsParser,
      js: tsParser
    },
    filePath,
    extraFileExtensions: ['.vue']
  }

  let parsed
  try {
    parsed = parseForESLint(source, parserOptions)
  } catch (error) {
    console.warn(`⚠️  Failed to parse ${filePath}: ${(error as Error).message}`)
    return []
  }

  const { ast } = parsed
  const replacements: Replacement[] = []
  const visited = new Set<any>()

  const visit = (node: any) => {
    if (!node || visited.has(node) || typeof node.type !== 'string') {
      return
    }
    visited.add(node)

    if ((node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') && node.range) {
      const pathExpression = extractThemePath(node)
      if (pathExpression) {
        const className = tokenMap.get(pathExpression)
        if (className) {
          replacements.push({
            start: node.range[0],
            end: node.range[1],
            className
          })
          return
        }
      }
    }

    const keys = KEYS[node.type] || Object.keys(node)
    keys.forEach(key => {
      if (ignoredKeys.has(key)) {
        return
      }
      const value = (node as any)[key]
      if (Array.isArray(value)) {
        value.forEach(child => visit(child))
      } else {
        visit(value)
      }
    })
  }

  visit(ast)
  if (ast.templateBody) {
    visit(ast.templateBody)
  }

  return replacements
}

function extractThemePath(node: any): string | null {
  const segments: Array<{ type: 'root' | 'prop'; key: string; computed?: boolean }> = []
  let current = node

  while (current && (current.type === 'MemberExpression' || current.type === 'OptionalMemberExpression')) {
    if (current.property.type === 'PrivateIdentifier') {
      return null
    }

    if (current.computed) {
      if (current.property.type === 'Literal' && typeof current.property.value === 'string') {
        segments.unshift({ type: 'prop', key: current.property.value, computed: true })
      } else {
        return null
      }
    } else if (current.property.type === 'Identifier') {
      segments.unshift({ type: 'prop', key: current.property.name })
    } else {
      return null
    }

    current = current.object
  }

  if (!current || current.type !== 'Identifier' || current.name !== 'theme') {
    return null
  }

  segments.unshift({ type: 'root', key: 'theme' })

  const filtered = segments.filter((segment, index) => {
    return !(segment.type === 'prop' && segment.key === 'value' && index !== 0)
  })

  return filtered
    .map((segment, index) => {
      if (segment.type === 'root') {
        return 'theme'
      }

      if (!segment.computed && identifierPattern.test(segment.key)) {
        return `.${segment.key}`
      }

      return `['${segment.key}']`
    })
    .join('')
}
