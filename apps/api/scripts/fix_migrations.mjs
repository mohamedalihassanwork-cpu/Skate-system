/**
 * fix_migrations.mjs
 *
 * Repairs the Drizzle migration tracking table.
 *
 * Situation:
 *   - DB has migrations 0000–0002 recorded (3 entries)
 *   - Migrations 0003–0018 were applied to the DB manually/outside Drizzle
 *     (tables like `settings`, `rentals`, etc. already exist)
 *   - Migration 0019 was never applied (missing `is_system_account` column)
 *
 * Fix:
 *   1. Insert fake tracking rows for 0003–0018 so Drizzle thinks they ran
 *   2. Also add `is_system_account` column manually (run 0019 SQL directly)
 *   3. Insert tracking row for 0019
 *
 * After this script, `npm run db:migrate` will have nothing to do (clean state).
 * Then `npm run db:seed` will work because the column exists.
 */

import mysql from 'mysql2/promise'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(__dirname, '../src/db/migrations')
const journal = JSON.parse(fs.readFileSync(path.join(migrationsDir, 'meta/_journal.json'), 'utf8'))

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'koshk_skate',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
})

console.log('🔧 Starting migration repair...')

// 1. Check which migrations are already recorded
const [existing] = await conn.query('SELECT hash FROM `__drizzle_migrations`')
const existingHashes = new Set(existing.map(r => r.hash))
console.log(`   Found ${existingHashes.size} recorded migrations in DB`)

// 2. Compute hashes for all migration files the same way Drizzle does
//    Drizzle hashes the SQL file content with SHA-256
function hashMigration(sqlContent) {
  return crypto.createHash('sha256').update(sqlContent).digest('hex')
}

// 3. For each journal entry (0003–0018), insert a tracking record if missing
//    We do NOT re-run the SQL — the tables already exist.
const entriesToMark = journal.entries.filter(e => e.idx >= 3 && e.idx <= 18)

for (const entry of entriesToMark) {
  const sqlFile = path.join(migrationsDir, `${entry.tag}.sql`)
  if (!fs.existsSync(sqlFile)) {
    console.log(`   ⚠️  SQL file not found: ${entry.tag}.sql — skipping`)
    continue
  }
  const sql = fs.readFileSync(sqlFile, 'utf8')
  const hash = hashMigration(sql)

  if (existingHashes.has(hash)) {
    console.log(`   ✓ Already tracked: ${entry.tag}`)
    continue
  }

  await conn.query(
    'INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)',
    [hash, entry.when]
  )
  console.log(`   ✅ Marked as applied: ${entry.tag}`)
}

// 4. Apply migration 0019 directly (ADD COLUMN is_system_account)
const sql0019File = path.join(migrationsDir, '0019_fat_joystick.sql')
const sql0019 = fs.readFileSync(sql0019File, 'utf8').trim()
const hash0019 = hashMigration(sql0019)

if (existingHashes.has(hash0019)) {
  console.log('   ✓ Migration 0019 already tracked — skipping column add')
} else {
  // Check if column already exists
  const [cols] = await conn.query("SHOW COLUMNS FROM `users` LIKE 'is_system_account'")
  if (cols.length > 0) {
    console.log('   ✓ Column `is_system_account` already exists — just marking as tracked')
  } else {
    console.log('   → Applying migration 0019: ADD COLUMN is_system_account...')
    await conn.query(sql0019)
    console.log('   ✅ Column added successfully')
  }

  // Record it in the migrations table
  const entry0019 = journal.entries.find(e => e.idx === 19)
  await conn.query(
    'INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)',
    [hash0019, entry0019?.when ?? Date.now()]
  )
  console.log('   ✅ Marked migration 0019 as applied')
}

// 5. Also check for 0018 column (is_cash_drawer) while we're at it
const sql0018File = path.join(migrationsDir, '0018_nasty_ezekiel.sql')
const sql0018 = fs.readFileSync(sql0018File, 'utf8').trim()
const [cashDrawerCols] = await conn.query("SHOW COLUMNS FROM `treasury_accounts` LIKE 'is_cash_drawer'")
if (cashDrawerCols.length === 0) {
  console.log('   → Applying migration 0018 column: ADD is_cash_drawer...')
  await conn.query(sql0018)
  console.log('   ✅ Column is_cash_drawer added')
} else {
  console.log('   ✓ Column `is_cash_drawer` already exists')
}

await conn.end()
console.log('\n✅ Migration repair complete!')
console.log('   You can now run: npm run db:migrate && npm run db:seed')
