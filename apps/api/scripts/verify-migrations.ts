import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import mysql, { type Connection, type ResultSetHeader } from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { repair0021, statements21, entry21 } from './migration-0021'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { apiRoot, migrationRoot, journal, disposableTargets, assertDisposableTarget,
  assertRepairTarget, testCredentials, identifier, rows, readHistory, assertHistoryUnchanged,
  repair0020, plan0020, statements20, entry20, hash20 } from './migration-0020'

// This verifier never drops a pre-existing database. Cleanup is limited to a
// database created by this invocation and bearing its random ownership token.
const runId = randomUUID()
const artifacts = resolve(apiRoot, '../../tmp/sub-treasury-migration', runId)
mkdirSync(artifacts, { recursive: true })
const results: { case: string; status: string; details?: unknown }[] = []
const credentials = testCredentials()
const created = new Map<string, string>()
function pass(name: string, details?: unknown) {
  results.push({ case: name, status: 'PASS', details })
  console.log('PASS ' + name + (details ? ' ' + JSON.stringify(details) : ''))
}
function migrationFolder(through: number) {
  const folder = resolve(artifacts, 'through-' + through)
  mkdirSync(resolve(folder, 'meta'), { recursive: true })
  const entries = journal.entries.filter(entry => entry.idx <= through)
  assert.equal(entries.length, through + 1)
  writeFileSync(resolve(folder, 'meta/_journal.json'), JSON.stringify({ ...journal, entries }))
  for (const entry of entries) copyFileSync(resolve(migrationRoot, entry.tag + '.sql'), resolve(folder, entry.tag + '.sql'))
  return folder
}
const through19 = migrationFolder(19), through20 = migrationFolder(20)
const latest = migrationFolder(Math.max(...journal.entries.map(entry => entry.idx)))
async function runMigrations(connection: Connection, folder: string) {
  await migrate(drizzle(connection), { migrationsFolder: folder })
}
async function createOwned(connection: Connection, name: string) {
  assertDisposableTarget(name)
  await connection.query('CREATE DATABASE ' + identifier(name) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  const token = randomUUID()
  created.set(name, token)
  await connection.query('CREATE TABLE ' + identifier(name) + '.__migration_verify_owner (token varchar(36) PRIMARY KEY)')
  await connection.query('INSERT INTO ' + identifier(name) + '.__migration_verify_owner (token) VALUES (?)', [token])
}
async function cleanupOwned(connection: Connection, name: string, token: string) {
  assertDisposableTarget(name)
  const ownership = await rows(connection, 'SELECT token FROM ' + identifier(name) + '.__migration_verify_owner')
  if (ownership.length !== 1 || ownership[0].token !== token) throw new Error('Refusing cleanup: database ownership changed')
  await connection.query('DROP DATABASE ' + identifier(name))
}
function runSeed(target: string) {
  assertDisposableTarget(target)
  const result = spawnSync(process.execPath, [resolve(apiRoot, 'node_modules/tsx/dist/cli.mjs'), 'src/db/seed.ts'], {
    cwd: apiRoot, encoding: 'utf8', timeout: 60000,
    env: { ...process.env, DB_HOST: credentials.host, DB_PORT: String(credentials.port),
      DB_USER: credentials.user, DB_PASSWORD: credentials.password, DB_NAME: target, NODE_ENV: 'development',
      SEED_ADMIN_EMAIL: 'migration-verifier@example.invalid', SEED_ADMIN_PASSWORD: randomUUID() },
  })
  if (result.status !== 0) {
    // Child stdout/stderr can contain credentials or user data on DB errors.
    const detail = (result.stderr || '').match(/Unknown column '[^']+'|Table '[^']+' doesn't exist/)
    throw new Error('Seed failed in disposable database; exit=' + result.status + (detail ? '; ' + detail[0] : '; error=' + (result.error?.name || 'none')))
  }
}
function runActivationSmoke(target: string) {
  assertDisposableTarget(target)
  const result = spawnSync(process.execPath, [resolve(apiRoot, 'node_modules/tsx/dist/cli.mjs'), 'scripts/verify-treasury-activation.ts'], {
    cwd: apiRoot, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, DB_HOST: credentials.host, DB_PORT: String(credentials.port),
      DB_USER: credentials.user, DB_PASSWORD: credentials.password, DB_NAME: target, NODE_ENV: 'development' },
  })
  if (result.status !== 0) throw new Error('Disposable activation smoke failed: ' + result.stderr.trim())
  return JSON.parse(result.stdout.trim())
}
async function insert(connection: Connection, sql: string, values: unknown[] = []) {
  return (await connection.query<ResultSetHeader>(sql, values))[0].insertId
}
async function legacyFixture(connection: Connection) {
  // Direct fixture rows use only the 0019 contract, independent of live source
  // schema/seed changes being developed for subsequent migrations.
  const user = await insert(connection, "INSERT INTO users (name,email,password_hash) VALUES ('Migration Fixture',?,'not-a-login-hash')", [randomUUID() + '@example.invalid'])
  const account = await insert(connection, "INSERT INTO treasury_accounts (name,name_ar,is_cash_drawer) VALUES ('Migration fixture account','اختبار',true)")
  const method = await insert(connection, "INSERT INTO payment_methods (name,name_ar,treasury_account_id) VALUES ('Migration fixture method','اختبار',?)", [account])
  const customer = await insert(connection, "INSERT INTO customers (name,phone,registration_date) VALUES ('Legacy migration fixture','01000000000','2026-09-01')")
  const skate = await insert(connection, "INSERT INTO skates (skate_code,size,status) VALUES ('MIGRATION-LEGACY','40','rented')")
  const shift = await insert(connection, "INSERT INTO cashier_shifts (cashier_id,opening_balance,expected_balance,actual_balance,difference,status,closed_at,notes) VALUES (?,100.01,175.51,174.51,-1.00,'closed','2026-09-02 20:00:00','historical close; no custody inferred')", [user])
  const rental = await insert(connection, "INSERT INTO rentals (rental_code,skate_id,customer_id,cashier_id,shift_id,duration_minutes,price_per_hour,rental_amount,started_at,expected_end_at,returned_at,status,created_at,updated_at) VALUES ('RN-MIGRATION',?,?,?,?,45,100.50,75.38,'2026-09-02 09:00:00','2026-09-02 09:45:00','2026-09-02 09:47:00','returned','2026-09-02 09:00:00','2026-09-02 09:47:00')", [skate, customer, user, shift])
  await insert(connection, "INSERT INTO rental_payments (rental_id,payment_method_id,amount,cashier_id,payment_type) VALUES (?,?,75.38,?,'rental')", [rental, method, user])
  await insert(connection, 'INSERT INTO late_fee_records (rental_id,late_minutes,calculated_fee,collected_fee,waived_fee,waived_by,waiver_reason) VALUES (?,2,4.00,2.00,2.00,?,?)', [rental, user, 'legacy waiver'])
  const inspection = await insert(connection, 'INSERT INTO inspections (rental_id,skate_id,inspected_by) VALUES (?,?,?)', [rental, skate, user])
  const expense = await insert(connection, "INSERT INTO expenses (amount,description,cashier_id,shift_id) VALUES (1.87,'legacy expense',?,?)", [user, shift])
  for (const [amount, type, refType, refId] of [['75.38', 'in', 'rental_payment', rental], ['2.00', 'in', 'late_fee_payment', rental], ['1.87', 'out', 'expense', expense], ['0.01', 'out', 'other', null]]) {
    await insert(connection, 'INSERT INTO treasury_movements (treasury_account_id,amount,type,reference_type,reference_id,cashier_id,shift_id) VALUES (?,?,?,?,?,?,?)', [account, amount, type, refType, refId, user, shift])
  }
  await connection.query('UPDATE treasury_accounts SET balance=75.50 WHERE id=?', [account])
  const category = await insert(connection, "INSERT INTO product_categories (name,name_ar) VALUES ('migration category','اختبار')")
  const product = await insert(connection, "INSERT INTO products (name,name_ar,category_id,price,stock_quantity) VALUES ('fixture','اختبار',?,15.75,2)", [category])
  const sale = await insert(connection, "INSERT INTO sales (sale_code,cashier_id,shift_id,total_amount,status) VALUES ('SL-MIGRATION',?,?,15.75,'cancelled')", [user, shift])
  await insert(connection, 'INSERT INTO sale_items (sale_id,product_id,quantity,unit_price,total_price) VALUES (?,?,1,15.75,15.75)', [sale, product])
  await insert(connection, 'INSERT INTO sale_payments (sale_id,payment_method_id,amount,treasury_account_id) VALUES (?,?,15.75,?)', [sale, method, account])
  for (const [type, reference] of [['in', 'sale_payment'], ['out', 'sale_refund']]) {
    await insert(connection, 'INSERT INTO treasury_movements (treasury_account_id,amount,type,reference_type,reference_id,cashier_id,shift_id) VALUES (?,15.75,?,?,?,?,?)', [account, type, reference, sale, user, shift])
  }
  return { user, account, rental, skate, inspection }
}
async function mustReject(operation: () => Promise<unknown>, expected: RegExp) {
  await assert.rejects(operation, expected)
}
async function main() {
  if (process.env.VERIFY_DB_NAME) assertDisposableTarget(process.env.VERIFY_DB_NAME)
  for (const invalid of ['koshk_skate', 'koshk_skate_test', 'production', 'koshk_skate_migration_verify_fresh; DROP DATABASE x', '']) {
    assert.throws(() => assertDisposableTarget(invalid), /Refusing/)
  }
  assert.throws(() => assertRepairTarget('koshk_skate'), /Refusing/)
  pass('reject unsafe/dev/shared-test verification targets before connecting')
  const admin = await mysql.createConnection(credentials)
  try {
    // Refuse all work if any fixed target already exists, rather than resetting it.
    const existing = await rows(admin, 'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME IN (?,?,?)', [...disposableTargets])
    assert.equal(existing.length, 0, 'A disposable target already exists; refusing to overwrite it')
    for (const name of disposableTargets) await createOwned(admin, name)
    const [freshName, upgradeName, alignedName] = disposableTargets
    await mustReject(() => createOwned(admin, freshName), /database exists/i)
    assert.equal((await rows(admin, 'SELECT token FROM ' + identifier(freshName) + '.__migration_verify_owner'))[0].token, created.get(freshName))
    pass('pre-existing verification target is not replaced')
    const fresh = await mysql.createConnection({ ...credentials, database: freshName })
    try {
      await runMigrations(fresh, through20)
      assert.deepEqual(await plan0020(fresh), [])
      assert.equal((await rows(fresh, 'SELECT * FROM __drizzle_migrations')).length, 21)
      const before = await readHistory(fresh)
      await runMigrations(fresh, through20)
      await assertHistoryUnchanged(fresh, before)
      assert.equal((await rows(fresh, 'SELECT * FROM __drizzle_migrations')).length, 21)
      pass('fresh official Drizzle migration through0020 and repeatability', { migrations: 21 })
      if (process.argv.includes('--skip-current-seed')) {
        results.push({ case: 'current application seed', status: 'NOT RUN', details: 'Explicitly skipped while subsequent schema migration is being prepared' })
        console.log('NOT RUN current application seed (explicit skip)')
      } else {
      await runMigrations(fresh, latest)
      runSeed(freshName)
      const seeded = await readHistory(fresh)
      runSeed(freshName)
      pass('current application seed on latest journal schema is repeatable', { rows: await assertHistoryUnchanged(fresh, seeded) })
      }
      const fixture = await legacyFixture(fresh)
      await mustReject(() => insert(fresh, "INSERT INTO rental_items (rental_id,skate_id,started_at,expected_duration_minutes,expected_end_at,price_per_hour) VALUES (2147483647,?,'2026-10-01',1,'2026-10-01',1.00)", [fixture.skate]), /foreign key constraint/i)
      const item = await insert(fresh, "INSERT INTO rental_items (rental_id,skate_id,started_at,expected_duration_minutes,expected_end_at,price_per_hour) VALUES (?,?,'2026-10-01',1,'2026-10-01',1.00)", [fixture.rental, fixture.skate])
      await mustReject(() => insert(fresh, "INSERT INTO rental_item_extensions (rental_item_id,extended_by_minutes,previous_expected_end_at,new_expected_end_at,created_by) VALUES (?,1,'2026-10-01','2026-10-01',2147483647)", [item]), /foreign key constraint/i)
      await mustReject(() => insert(fresh, "INSERT INTO rental_items (id,rental_id,skate_id,started_at,expected_duration_minutes,expected_end_at,price_per_hour) VALUES (?,?,?,'2026-10-01',1,'2026-10-01',1.00)", [item, fixture.rental, fixture.skate]), /Duplicate entry/i)
      pass('new table foreign keys and primary key reject invalid rows')
      if (!process.argv.includes('--skip-current-seed')) pass('fresh migrated database activation adds no funds or duplicate audit', runActivationSmoke(freshName))
    } finally { await fresh.end() }

    const upgrade = await mysql.createConnection({ ...credentials, database: upgradeName })
    try {
      await runMigrations(upgrade, through19)
      await legacyFixture(upgrade)
      const before = await readHistory(upgrade)
      const dry = await repair0020(upgrade)
      assert.equal(dry.statements, statements20.length)
      await assertHistoryUnchanged(upgrade, before)
      assert.equal((await rows(upgrade, 'SELECT * FROM __drizzle_migrations')).length, 20)
      await runMigrations(upgrade, through20)
      const preserved = await assertHistoryUnchanged(upgrade, before)
      assert.equal(Number((await rows(upgrade, 'SELECT COUNT(*) n FROM rental_items'))[0].n), 0)
      assert.equal(Number((await rows(upgrade, 'SELECT COUNT(*) n FROM inspections WHERE rental_item_id IS NOT NULL'))[0].n), 0)
      assert.equal((await repair0020(upgrade, true)).statements, 0)
      pass('populated legacy official upgrade preserves every original row and null link', { rows: preserved, legacyItemsInvented: 0 })
      const beforeLatest = await readHistory(upgrade)
      await runMigrations(upgrade, latest)
      const latestPreserved = await assertHistoryUnchanged(upgrade, beforeLatest, new Set(['permissions', 'role_permissions']))
      await runMigrations(upgrade, latest)
      await assertHistoryUnchanged(upgrade, beforeLatest, new Set(['permissions', 'role_permissions']))
      pass('latest journal upgrade preserves financial history; only approved permission grants may add rows', { rows: latestPreserved, migrations: journal.entries.length })
      if (!process.argv.includes('--skip-current-seed')) {
        runSeed(upgradeName)
        pass('legacy upgraded database activation preserves original financial rows', runActivationSmoke(upgradeName))
      }
    } finally { await upgrade.end() }

    const aligned = await mysql.createConnection({ ...credentials, database: alignedName })
    try {
      await runMigrations(aligned, through19)
      const fixture = await legacyFixture(aligned)
      // Simulate the earlier test-only alignment: most DDL, no journal entry.
      // A linked item is real fixture data, not a repair backfill.
      for (const statement of statements20) {
        if (statement.includes('late_fee_records') || statement.startsWith('CREATE INDEX')) continue
        await aligned.query(statement)
      }
      const item = await insert(aligned, "INSERT INTO rental_items (rental_id,skate_id,started_at,expected_duration_minutes,expected_end_at,price_per_hour,actual_amount,status) VALUES (?,?,'2026-09-02 09:00:00',45,'2026-09-02 09:45:00',100.50,75.38,'returned')", [fixture.rental, fixture.skate])
      await aligned.query('UPDATE inspections SET rental_item_id=? WHERE id=?', [item, fixture.inspection])
      const before = await readHistory(aligned)
      const result = await repair0020(aligned, true)
      assert.equal(result.statements, 6)
      await assertHistoryUnchanged(aligned, before)
      const tracked = await rows(aligned, 'SELECT hash,created_at FROM __drizzle_migrations WHERE created_at=?', [entry20.when])
      assert.equal(tracked.length, 1); assert.equal(tracked[0].hash, hash20)
      assert.equal((await repair0020(aligned, true)).statements, 0)
      await runMigrations(aligned, through20)
      await assertHistoryUnchanged(aligned, before)
      pass('partially aligned repair applies only missingDDL, preserves rows, and records actual canonical hash', { statements: result.statements, rows: result.preservedRows })
      // Defect fixtures are changed only inside this owned disposable database.
      await aligned.query('DELETE FROM __drizzle_migrations WHERE created_at=?', [entry20.when])
      await aligned.query('ALTER TABLE late_fee_records MODIFY COLUMN rental_item_id varchar(12)')
      const incompatible = await readHistory(aligned)
      await mustReject(() => repair0020(aligned, true), /Incompatible schema at late_fee_records.rental_item_id/)
      await assertHistoryUnchanged(aligned, incompatible)
      assert.equal(Number((await rows(aligned, 'SELECT COUNT(*) n FROM __drizzle_migrations WHERE created_at=?', [entry20.when]))[0].n), 0)
      pass('incompatible existing column fails before DDL or journaling')
      await aligned.query('ALTER TABLE late_fee_records MODIFY COLUMN rental_item_id int')
      const fullyAligned = await repair0020(aligned, true)
      assert.equal(fullyAligned.statements, 0)
      await assertHistoryUnchanged(aligned, before)
      pass('fully aligned unjournaled schema is validated and registered without DDL', { rows: fullyAligned.preservedRows })
      const before19 = (await rows(aligned, 'SELECT hash FROM __drizzle_migrations WHERE created_at=?', [journal.entries[19].when]))[0].hash
      await aligned.query("UPDATE __drizzle_migrations SET hash='invalid-fixture-hash' WHERE created_at=?", [journal.entries[19].when])
      await mustReject(() => repair0020(aligned, true), /Prior migration metadata mismatch/)
      pass('prior journal mismatch rejected without fabricated metadata')
      await aligned.query('UPDATE __drizzle_migrations SET hash=? WHERE created_at=?', [before19, journal.entries[19].when])
      const before21 = await readHistory(aligned)
      const stop = statements21.findIndex(statement => statement.includes('treasury_transfer_destination_fk'))
      assert.ok(stop > 0, 'Partial fixture must stop before the formerly overlength constraint')
      for (const statement of statements21.slice(0, stop)) await aligned.query(statement)
      await assertHistoryUnchanged(aligned, before21)
      const partial21 = await repair0021(aligned, true)
      await assertHistoryUnchanged(aligned, before21, new Set(['permissions', 'role_permissions']))
      assert.equal((await rows(aligned, 'SELECT * FROM __drizzle_migrations WHERE created_at=?', [entry21.when])).length, 1)
      assert.equal((await repair0021(aligned, true)).statements, 0)
      pass('partial0021 recovery validates applied DDL, resumes missing only, and preserves financial rows', { statements: partial21.statements, rows: partial21.preservedRows })

    } finally { await aligned.end() }
  } finally {
    for (const [name, token] of created) await cleanupOwned(admin, name, token)
    await admin.end()
    writeFileSync(resolve(artifacts, 'results.json'), JSON.stringify({ runId, results }, null, 2))
  }
  pass('owned disposable databases cleaned; development/shared-test untouched')
  writeFileSync(resolve(artifacts, 'results.json'), JSON.stringify({ runId, results }, null, 2))
  console.log('Evidence: ' + resolve(artifacts, 'results.json'))
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
