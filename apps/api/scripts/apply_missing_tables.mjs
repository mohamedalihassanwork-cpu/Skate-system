/**
 * apply_missing_tables.mjs
 *
 * Applies the SQL from migrations 0005-0017 that create tables/columns
 * not yet in the database. Uses IF NOT EXISTS and catches duplicate errors
 * so it's safe to run multiple times.
 */

import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(__dirname, '../src/db/migrations')

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'koshk_skate',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: false,
})

console.log('🔧 Applying missing migration SQL (tables/columns)...\n')

// Split a Drizzle SQL file by the --> statement-breakpoint separator
function splitStatements(sql) {
  return sql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean)
}

// Execute a single SQL statement, ignoring "already exists" errors
async function safeExecute(sql, label) {
  try {
    await conn.query(sql)
    console.log(`   ✅ ${label}`)
  } catch (err) {
    const ignoredCodes = [
      'ER_TABLE_EXISTS_ERROR',   // 1050: Table already exists
      'ER_DUP_FIELDNAME',        // 1060: Column already exists
      'ER_DUP_KEYNAME',          // 1061: Duplicate key name
      'ER_FK_DUP_NAME',          // Duplicate FK
      'ER_CANT_DROP_FIELD_OR_KEY', // Can't drop
    ]
    if (ignoredCodes.includes(err.code) || err.errno === 1050 || err.errno === 1060 || err.errno === 1061) {
      console.log(`   ⚠️  ${label} — already exists, skipped`)
    } else {
      console.error(`   ❌ ${label} — ERROR: ${err.message}`)
    }
  }
}

// Migrations 0005–0017 (everything that creates new tables or alters columns)
// We skip 0018 (is_cash_drawer) and 0019 (is_system_account) — those were handled separately
const migrations = [
  '0005_funny_leper_queen',  // treasury_accounts, payment_methods, rental_payments, treasury_movements
  '0006_natural_bucky',      // ALTER treasury_movements, ADD payment_type to rental_payments
  '0007_mysterious_quasar',  // inspections, late_fee_records
  '0008_tiny_the_initiative',
  '0009_numerous_thena',
  '0010_dashing_mastermind',
  '0011_mean_micromax',
  '0012_previous_bloodscream',
  '0013_married_morgan_stark',
  '0014_faulty_stardust',
  '0015_harsh_salo',
  '0016_zippy_gateway',
  '0017_funny_kitty_pryde',
]

for (const migration of migrations) {
  const sqlFile = path.join(migrationsDir, `${migration}.sql`)
  if (!fs.existsSync(sqlFile)) {
    console.log(`   ⚠️  File not found: ${migration}.sql — skipping`)
    continue
  }

  console.log(`\n📄 Applying: ${migration}`)
  const content = fs.readFileSync(sqlFile, 'utf8')
  const statements = splitStatements(content)

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    if (!stmt) continue
    // Extract a short label from the first line
    const label = stmt.split('\n')[0].substring(0, 80)
    await safeExecute(stmt, label)
  }
}

// Also apply 0018 is_cash_drawer on treasury_accounts
console.log('\n📄 Applying: 0018_nasty_ezekiel (is_cash_drawer column)')
await safeExecute(
  "ALTER TABLE `treasury_accounts` ADD `is_cash_drawer` boolean DEFAULT false NOT NULL",
  "ADD is_cash_drawer to treasury_accounts"
)

await conn.end()
console.log('\n✅ All missing tables/columns applied!')
console.log('   Now run: npm run db:seed')
