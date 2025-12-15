#!/usr/bin/env tsx
/**
 * Universal Baseline Data Applicator
 * Applies baseline SQL files to both MySQL and SQLite databases via Prisma
 *
 * Usage: npx tsx data/baseline/apply-baseline.ts
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()
const DB_PROVIDER = process.env.DB_PROVIDER || 'mysql'

/**
 * Convert MySQL SQL syntax to SQLite-compatible syntax
 */
function convertSQLForSQLite(sql: string): string {
  return sql
    // INSERT IGNORE → INSERT OR IGNORE
    .replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT OR IGNORE INTO')
    // Backticks → Double quotes
    .replace(/`([^`]+)`/g, '"$1"')
    // NOW() → datetime('now')
    .replace(/NOW\(\)/gi, "datetime('now')")
    // Remove MySQL-specific keywords that SQLite doesn't need
    .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
}

/**
 * Apply single SQL file
 */
async function applySQLFile(filePath: string, fileName: string): Promise<void> {
  let sql = fs.readFileSync(filePath, 'utf-8')

  // Convert syntax if using SQLite
  if (DB_PROVIDER === 'sqlite') {
    sql = convertSQLForSQLite(sql)
  }

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 0)

  let successCount = 0
  let skipCount = 0

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement)
      successCount++
    } catch (error: any) {
      // Ignore "already exists" errors (idempotent)
      if (
        error.message.includes('already exists') ||
        error.message.includes('Duplicate entry') ||
        error.message.includes('UNIQUE constraint failed')
      ) {
        skipCount++
      } else {
        console.error(`  ✗ Failed statement in ${fileName}:`, error.message)
        console.error(`  Statement: ${statement.substring(0, 100)}...`)
      }
    }
  }

  if (successCount > 0 || skipCount > 0) {
    console.log(`  ✓ ${fileName}: ${successCount} applied, ${skipCount} skipped`)
  }
}

/**
 * Main baseline application logic
 */
async function applyBaseline(): Promise<void> {
  console.log('🌱 Applying baseline defaults...')
  console.log(`  📦 Database Provider: ${DB_PROVIDER}`)

  const baselineDir = path.join(__dirname, 'defaults')

  if (!fs.existsSync(baselineDir)) {
    console.error(`  ✗ Baseline directory not found: ${baselineDir}`)
    process.exit(1)
  }

  // Get all SQL files sorted by name
  const files = fs
    .readdirSync(baselineDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('  ⚠️  No baseline SQL files found')
    return
  }

  console.log(`  📝 Found ${files.length} baseline files`)

  for (const file of files) {
    const filePath = path.join(baselineDir, file)
    await applySQLFile(filePath, file)
  }

  console.log('✅ Baseline defaults applied successfully')
}

// Execute
applyBaseline()
  .catch((error) => {
    console.error('❌ Baseline application failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
