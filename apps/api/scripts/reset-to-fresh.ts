/**
 * KOSHK SKATE ERP — Database Reset Script
 *
 * PURPOSE:
 *   Resets the database to a clean "fresh installation" state.
 *   Clears all operational / business-transaction data while preserving
 *   the essential system configuration required for the application to
 *   start and operate correctly.
 *
 * WHAT IS DELETED (operational data):
 *   audit_logs, rental_item_extensions, maintenance_parts, sale_items,
 *   sale_payments, rental_payments, treasury_movements,
 *   treasury_settlements, treasury_transfers, treasury_handovers,
 *   treasury_funding, financial_operations, damage_reports,
 *   maintenance_records, late_fee_records, inspections, rental_items,
 *   rentals, reservations, sales, expenses, cashier_shifts,
 *   treasury_assignments, refresh_tokens, customers
 *
 *   Skates are reset to status='available', is_active=1
 *   (skate asset records themselves are kept so the fleet is preserved).
 *
 *   sequences.value is reset to 0.
 *
 *   treasury_accounts.balance is reset to 0.00.
 *
 *   Non-system users (all except admin + system actor) are deleted.
 *
 *   Admin password is re-hashed from SEED_ADMIN_PASSWORD env var.
 *
 * WHAT IS PRESERVED (system configuration):
 *   settings              — rental rates, duration options, etc.
 *   permissions           — all permission keys
 *   roles                 — Administrator, Cashier, MaintenanceStaff
 *   role_permissions      — all role<->permission mappings
 *   treasury_accounts     — Main Cash, Bank, Card, InstaPay, Other
 *   payment_methods       — one per treasury account
 *   treasury_configuration — system-wide treasury toggle
 *   users (admin only)    — admin@koshkskate.com + system actor
 *   user_roles (admin)    — admin's Administrator role assignment
 *
 * SAFETY GUARDS:
 *   - Refuses to run against any database NOT named 'koshk_skate'
 *     unless ALLOW_RESET_DB env var is set to the exact DB name.
 *   - Prints full target DB / host before any destructive operation.
 *   - Requires explicit confirmation (pass --confirm flag).
 *   - All deletes wrapped in a transaction; rolls back on any error.
 *   - Idempotent: safe to run multiple times.
 *
 * USAGE:
 *   cd apps/api
 *   npx tsx scripts/reset-to-fresh.ts            (dry-run)
 *   npx tsx scripts/reset-to-fresh.ts --confirm  (live reset)
 *
 * Or add to package.json scripts:
 *   "db:reset": "tsx scripts/reset-to-fresh.ts"
 *   "db:reset:confirm": "tsx scripts/reset-to-fresh.ts --confirm"
 *
 * ENVIRONMENT:
 *   Reads from apps/api/.env (same as the application).
 */

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DB_HOST     = process.env.DB_HOST     ?? 'localhost'
const DB_PORT     = parseInt(process.env.DB_PORT ?? '3306', 10)
const DB_NAME     = process.env.DB_NAME     ?? 'koshk_skate'
const DB_USER     = process.env.DB_USER     ?? 'root'
const DB_PASSWORD = process.env.DB_PASSWORD ?? ''

const SEED_ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    ?? 'admin@koshkskate.com'
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'Koshk@12345'
const SYSTEM_ACTOR_EMAIL  = 'system@koshkskate.internal'

const BCRYPT_ROUNDS = 12

// Confirmed via CLI --confirm flag
const DRY_RUN = !process.argv.includes('--confirm')

// ---------------------------------------------------------------------------
// Safety guard
// ---------------------------------------------------------------------------

function assertSafeTarget(): void {
  const allowedDb = process.env.ALLOW_RESET_DB

  // Only allow the known development database name by default,
  // or whatever the operator has explicitly whitelisted.
  const safeNames = new Set(['koshk_skate'])
  if (allowedDb) safeNames.add(allowedDb)

  if (!safeNames.has(DB_NAME)) {
    console.error(`\n SAFETY ABORT: Target database "${DB_NAME}" is not on the allowed list.`)
    console.error(`   Set ALLOW_RESET_DB="${DB_NAME}" in your environment to override.`)
    console.error(`   This guard exists to prevent accidental production data loss.\n`)
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function section(title: string): void {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(60))
}

function row(label: string, value: string | number): void {
  console.log(`  ${label.padEnd(42)} ${value}`)
}

// ---------------------------------------------------------------------------
// Main reset
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  // ── 1. Safety checks ────────────────────────────────────────────────────

  assertSafeTarget()

  section('KOSHK SKATE ERP — Database Reset')
  row('Target host',     `${DB_HOST}:${DB_PORT}`)
  row('Target database', DB_NAME)
  row('Admin email',     SEED_ADMIN_EMAIL)
  row('Mode',            DRY_RUN
    ? 'DRY-RUN (no changes will be made)'
    : 'LIVE — changes WILL be committed')

  if (DRY_RUN) {
    console.log('\n  Re-run with --confirm to execute the reset.')
    console.log('  Example: npx tsx scripts/reset-to-fresh.ts --confirm\n')
  }

  // ── 2. Connect ──────────────────────────────────────────────────────────

  const connection = await mysql.createConnection({
    host:     DB_HOST,
    port:     DB_PORT,
    database: DB_NAME,
    user:     DB_USER,
    password: DB_PASSWORD,
    charset:  'utf8mb4',
    timezone: '+00:00',
    multipleStatements: false,
  })

  try {
    await connection.ping()
    console.log(`\n  Connected to ${DB_HOST}:${DB_PORT}/${DB_NAME}`)
  } catch (err) {
    console.error(`\n  Cannot connect to database: ${(err as Error).message}`)
    await connection.end()
    process.exit(1)
  }

  // ── 3. Pre-flight: count current records ───────────────────────────────

  section('Current operational data counts')

  const countQueries: Array<{ table: string; label: string }> = [
    { table: 'audit_logs',               label: 'Audit log entries' },
    { table: 'rental_item_extensions',   label: 'Rental item extensions' },
    { table: 'maintenance_parts',        label: 'Maintenance parts' },
    { table: 'sale_items',               label: 'Sale items' },
    { table: 'sale_payments',            label: 'Sale payments' },
    { table: 'rental_payments',          label: 'Rental payments' },
    { table: 'treasury_movements',       label: 'Treasury movements' },
    { table: 'treasury_settlements',     label: 'Treasury settlements' },
    { table: 'treasury_transfers',       label: 'Treasury transfers' },
    { table: 'treasury_handovers',       label: 'Treasury handovers' },
    { table: 'treasury_funding',         label: 'Treasury funding records' },
    { table: 'financial_operations',     label: 'Financial operations' },
    { table: 'damage_reports',           label: 'Damage reports' },
    { table: 'maintenance_records',      label: 'Maintenance records' },
    { table: 'late_fee_records',         label: 'Late fee records' },
    { table: 'inspections',              label: 'Inspections' },
    { table: 'rental_items',             label: 'Rental items' },
    { table: 'rentals',                  label: 'Rentals' },
    { table: 'reservations',             label: 'Reservations' },
    { table: 'sales',                    label: 'Sales' },
    { table: 'expenses',                 label: 'Expenses' },
    { table: 'cashier_shifts',           label: 'Cashier shifts' },
    { table: 'treasury_assignments',     label: 'Treasury assignments' },
    { table: 'refresh_tokens',           label: 'Refresh tokens' },
    { table: 'customers',                label: 'Customers' },
    { table: 'skates',                   label: 'Skates (status will be reset)' },
    { table: 'sequences',                label: 'Sequences (value will be reset to 0)' },
    { table: 'users',                    label: 'Users total (admin+system kept)' },
  ]

  for (const { table, label } of countQueries) {
    try {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt FROM \`${table}\``
      )
      row(label, (rows[0] as mysql.RowDataPacket).cnt as number)
    } catch {
      row(label, '(table not found — will skip)')
    }
  }

  if (DRY_RUN) {
    section('Dry-run complete — no changes made')
    console.log('  Run with --confirm to execute the reset.\n')
    await connection.end()
    process.exit(0)
  }

  // ── 4. Execute reset inside a transaction ──────────────────────────────

  section('Executing reset...')

  await connection.beginTransaction()

  try {
    // Disable FK checks for the duration so we can delete in any order.
    // Re-enabled before commit so constraints are verified on the final state.
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0')

    // -- Operational tables: delete all rows --------------------------------

    const tablesToDelete = [
      'audit_logs',
      'rental_item_extensions',
      'maintenance_parts',
      'sale_items',
      'sale_payments',
      'rental_payments',
      'treasury_movements',
      'treasury_settlements',
      'treasury_transfers',
      'treasury_handovers',
      'treasury_funding',
      'financial_operations',
      'damage_reports',
      'maintenance_records',
      'late_fee_records',
      'inspections',
      'rental_items',
      'rentals',
      'reservations',
      'sales',
      'expenses',
      'cashier_shifts',
      'treasury_assignments',
      'refresh_tokens',
      'customers',
    ]

    for (const table of tablesToDelete) {
      try {
        const [result] = await connection.execute<mysql.ResultSetHeader>(
          `DELETE FROM \`${table}\``
        )
        console.log(`  Deleted ${String(result.affectedRows).padStart(6)} rows from ${table}`)
      } catch (err) {
        const msg = (err as Error).message
        if (msg.includes("doesn't exist")) {
          console.log(`  Table ${table} does not exist — skipping`)
        } else {
          throw err
        }
      }
    }

    // -- Skates: reset status -> available, keep asset records ---------------

    try {
      const [result] = await connection.execute<mysql.ResultSetHeader>(
        `UPDATE \`skates\` SET status = 'available', is_active = 1`
      )
      console.log(`  Reset status to 'available' for ${result.affectedRows} skate(s)`)
    } catch (err) {
      const msg = (err as Error).message
      if (!msg.includes("doesn't exist")) throw err
      console.log(`  Table skates does not exist — skipping`)
    }

    // -- Sequences: reset value to 0 ----------------------------------------

    try {
      const [result] = await connection.execute<mysql.ResultSetHeader>(
        `UPDATE \`sequences\` SET value = 0`
      )
      console.log(`  Reset ${result.affectedRows} sequence(s) to 0`)
    } catch (err) {
      const msg = (err as Error).message
      if (!msg.includes("doesn't exist")) throw err
      console.log(`  Table sequences does not exist — skipping`)
    }

    // -- Treasury account balances: reset to 0.00 ---------------------------

    try {
      const [result] = await connection.execute<mysql.ResultSetHeader>(
        `UPDATE \`treasury_accounts\` SET balance = '0.00'`
      )
      console.log(`  Reset balance to 0.00 for ${result.affectedRows} treasury account(s)`)
    } catch (err) {
      const msg = (err as Error).message
      if (!msg.includes("doesn't exist")) throw err
      console.log(`  Table treasury_accounts does not exist — skipping`)
    }

    // -- Users: delete all non-system, non-admin users ----------------------

    const [adminRows] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM \`users\` WHERE email = ?`,
      [SEED_ADMIN_EMAIL]
    )
    const [sysRows] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT id FROM \`users\` WHERE email = ?`,
      [SYSTEM_ACTOR_EMAIL]
    )

    const keepIds: number[] = []
    if (adminRows.length) keepIds.push((adminRows[0] as mysql.RowDataPacket).id as number)
    if (sysRows.length)   keepIds.push((sysRows[0] as mysql.RowDataPacket).id as number)

    if (keepIds.length > 0) {
      const placeholders = keepIds.map(() => '?').join(', ')
      const [delResult] = await connection.execute<mysql.ResultSetHeader>(
        `DELETE FROM \`users\` WHERE id NOT IN (${placeholders})`,
        keepIds
      )
      console.log(`  Deleted ${delResult.affectedRows} non-system user(s)`)
    } else {
      // No system users found — delete all (seed will recreate them)
      await connection.execute(`DELETE FROM \`users\``)
      console.log(`  No admin/system actor found — deleted all users (run db:seed to recreate)`)
    }

    // -- user_roles: remove orphaned entries --------------------------------

    const [urResult] = await connection.execute<mysql.ResultSetHeader>(
      `DELETE FROM \`user_roles\` WHERE user_id NOT IN (SELECT id FROM \`users\`)`
    )
    console.log(`  Removed ${urResult.affectedRows} orphaned user_role entry/entries`)

    // -- Re-hash admin password to the canonical seed password --------------

    if (adminRows.length) {
      const adminId = (adminRows[0] as mysql.RowDataPacket).id as number
      console.log(`  Hashing new admin password (bcrypt rounds=${BCRYPT_ROUNDS})...`)
      const newHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, BCRYPT_ROUNDS)
      await connection.execute(
        `UPDATE \`users\` SET password_hash = ?, is_active = 1 WHERE id = ?`,
        [newHash, adminId]
      )
      console.log(`  Admin password reset for ${SEED_ADMIN_EMAIL}`)
    } else {
      console.log(`  Admin user not found — it will be created by npm run db:seed`)
    }

    // -- Re-enable FK checks before commit ----------------------------------

    await connection.execute('SET FOREIGN_KEY_CHECKS = 1')

    // -- Commit -------------------------------------------------------------

    await connection.commit()
    console.log('\n  Transaction committed successfully.')

  } catch (err) {
    await connection.rollback()
    try { await connection.execute('SET FOREIGN_KEY_CHECKS = 1') } catch { /* ignore */ }
    console.error('\n  FAILED — transaction rolled back. Database is unchanged.')
    console.error(`  Error: ${(err as Error).message}`)
    await connection.end()
    process.exit(1)
  }

  // ── 5. Post-reset verification ─────────────────────────────────────────

  section('Post-reset verification')

  // Verify admin user
  const [verifyAdmin] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT id, email, password_hash, is_active, is_system_account FROM \`users\` WHERE email = ?`,
    [SEED_ADMIN_EMAIL]
  )

  if (verifyAdmin.length === 0) {
    console.log(`  Admin user not present — run: npm run db:seed`)
  } else {
    const adminUser = verifyAdmin[0] as mysql.RowDataPacket
    const passwordOk = await bcrypt.compare(SEED_ADMIN_PASSWORD, adminUser.password_hash as string)
    row('Admin user id',         adminUser.id as number)
    row('Admin is_active',       adminUser.is_active ? 'true' : 'false')
    row('Admin is_system_account', adminUser.is_system_account ? 'true (WARNING: should be false)' : 'false OK')
    row('Password verification', passwordOk ? 'PASS' : 'FAIL')
  }

  // Verify system actor
  const [verifySys] = await connection.execute<mysql.RowDataPacket[]>(
    `SELECT id, email, is_system_account FROM \`users\` WHERE email = ?`,
    [SYSTEM_ACTOR_EMAIL]
  )
  if (verifySys.length) {
    const sa = verifySys[0] as mysql.RowDataPacket
    row('System actor found', `id=${sa.id as number}, is_system=${String(sa.is_system_account)}`)
  } else {
    console.log(`  System actor not present — run: npm run db:seed`)
  }

  // Verify config tables intact
  const configChecks: Array<{ table: string; label: string }> = [
    { table: 'settings',          label: 'Settings rows preserved' },
    { table: 'permissions',       label: 'Permission keys preserved' },
    { table: 'roles',             label: 'Roles preserved' },
    { table: 'role_permissions',  label: 'Role-permission mappings preserved' },
    { table: 'treasury_accounts', label: 'Treasury accounts preserved' },
    { table: 'payment_methods',   label: 'Payment methods preserved' },
  ]

  for (const { table, label } of configChecks) {
    try {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt FROM \`${table}\``
      )
      row(label, (rows[0] as mysql.RowDataPacket).cnt as number)
    } catch {
      row(label, '(table not found)')
    }
  }

  // Verify operational tables are empty
  console.log()
  const operationalChecks = ['rentals', 'rental_items', 'customers', 'sales', 'cashier_shifts', 'audit_logs']
  for (const table of operationalChecks) {
    try {
      const [rows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) AS cnt FROM \`${table}\``
      )
      const cnt = (rows[0] as mysql.RowDataPacket).cnt as number
      row(`${table} (should be 0)`, cnt === 0 ? `0 OK` : `${cnt} WARNING: NOT EMPTY`)
    } catch {
      row(table, '(table not found)')
    }
  }

  // Skate status summary
  try {
    const [skateRows] = await connection.execute<mysql.RowDataPacket[]>(
      `SELECT status, COUNT(*) AS cnt FROM \`skates\` GROUP BY status`
    )
    for (const r of skateRows as mysql.RowDataPacket[]) {
      row(`Skate status: ${r.status as string}`, r.cnt as number)
    }
  } catch { /* ignore if table not found */ }

  await connection.end()

  section('Reset complete')
  console.log(`
  The database has been reset to a fresh state.

  Next steps:
  ─────────────────────────────────────────────
  1. Run the seeder to ensure all configuration is current:
       cd apps/api && npm run db:seed

  2. Start the API:
       cd apps/api && npm run dev

  3. Start the frontend:
       cd apps/web && npm run dev

  4. Log in at http://localhost:5173 with:
       Email:    ${SEED_ADMIN_EMAIL}
       Password: (as configured in SEED_ADMIN_PASSWORD env var)
  `)

  process.exit(0)
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

run().catch((err) => {
  console.error('\nUnexpected error:', err)
  process.exit(1)
})
