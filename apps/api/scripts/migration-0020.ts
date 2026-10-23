import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Connection, RowDataPacket } from 'mysql2/promise'
import { parse } from 'dotenv'

export const apiRoot = resolve(__dirname, '..')
export const migrationRoot = resolve(apiRoot, 'src/db/migrations')
export const disposableTargets = [
  'koshk_skate_migration_verify_fresh',
  'koshk_skate_migration_verify_upgrade',
  'koshk_skate_migration_verify_aligned',
] as const
const q = String.fromCharCode(96)
export function identifier(value: string): string {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) throw new Error('Unsafe SQL identifier')
  return q + value + q
}
export function assertDisposableTarget(value: string): void {
  if (!(disposableTargets as readonly string[]).includes(value)) {
    throw new Error('Refusing non-disposable migration verification target')
  }
}
export function assertRepairTarget(value: string): void {
  if (value !== 'koshk_skate_test') assertDisposableTarget(value)
}
export function testCredentials() {
  const config = parse(readFileSync(resolve(apiRoot, '.env.test')))
  if (config.DB_NAME !== 'koshk_skate_test') throw new Error('.env.test must name koshk_skate_test')
  const host = config.DB_HOST || 'localhost'
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('Migration test tooling requires a local server')
  return { host, port: Number(config.DB_PORT || 3306), user: config.DB_USER || 'root',
    password: config.DB_PASSWORD || '', dateStrings: true, supportBigNumbers: true, bigNumberStrings: true }
}
export async function rows(connection: Connection, sql: string, values: unknown[] = []): Promise<any[]> {
  return (await connection.query<RowDataPacket[]>(sql, values))[0]
}
type Column = { name: string; type: string; notNull: boolean; autoincrement: boolean; default?: string | boolean | number }
type ForeignKey = { name: string; columnsFrom: string[]; tableTo: string; columnsTo: string[] }
type Table = { columns: Record<string, Column>; indexes: Record<string, { columns: string[]; isUnique: boolean }>;
  foreignKeys: Record<string, ForeignKey> }
const snapshot = JSON.parse(readFileSync(resolve(migrationRoot, 'meta/0020_snapshot.json'), 'utf8')) as { tables: Record<string, Table> }
const baseline = JSON.parse(readFileSync(resolve(migrationRoot, 'meta/0019_snapshot.json'), 'utf8')) as { tables: Record<string, Table> }
export const journal = JSON.parse(readFileSync(resolve(migrationRoot, 'meta/_journal.json'), 'utf8')) as {
  version: string; dialect: string; entries: { idx: number; when: number; tag: string; version: string; breakpoints: boolean }[] }
export const entry20 = journal.entries.find(entry => entry.idx === 20)!
if (!entry20 || entry20.tag !== '0020_multi_skate_rentals') throw new Error('Missing canonical 0020 journal entry')
export const sql20 = readFileSync(resolve(migrationRoot, entry20.tag + '.sql'), 'utf8')
export const hash20 = createHash('sha256').update(sql20).digest('hex')
export const statements20 = sql20.split('--> statement-breakpoint')
  .map(part => part.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)

function normalType(value: string): string { return value.toLowerCase().replace(/boolean/g, 'tinyint').replace(/int\(\d+\)/g, 'int').replace(/\s+/g, '') }
function normalDefault(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/ on update current_timestamp(?:\(\))?/g, '')
    .replace(/^'|'$/g, '').replace(/^true$/, '1').replace(/^false$/, '0').replace(/current_timestamp\(\)|\(now\(\)\)|now\(\)/g, 'current_timestamp')
}
export function columnMatches(actual: any, expected: Column): boolean {
  const extra = String(actual.EXTRA).toLowerCase()
  return normalType(actual.COLUMN_TYPE) === normalType(expected.type)
    && (actual.IS_NULLABLE === 'NO') === expected.notNull
    && extra.includes('auto_increment') === expected.autoincrement
    && extra.includes('on update') === String(expected.default ?? '').includes('ON UPDATE')
    && normalDefault(actual.COLUMN_DEFAULT) === normalDefault(expected.default)
}
function requireColumn(actual: any, expected: Column, table: string): void {
  if (!actual || !columnMatches(actual, expected)) throw new Error('Incompatible schema at ' + table + '.' + expected.name)
}
export async function readHistory(connection: Connection): Promise<Record<string, { columns: string[]; data: string[] }>> {
  const tables = await rows(connection, 'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE=?', ['BASE TABLE'])
  const history: Record<string, { columns: string[]; data: string[] }> = {}
  for (const { TABLE_NAME: table } of tables) {
    if (table === '__drizzle_migrations' || table === '__migration_verify_owner') continue
    const columns = (await rows(connection, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION', [table])).map(row => row.COLUMN_NAME)
    const data = await rows(connection, 'SELECT ' + columns.map(identifier).join(',') + ' FROM ' + identifier(table))
    history[table] = { columns, data: data.map(row => JSON.stringify(row)).sort() }
  }
  return history
}
export async function assertHistoryUnchanged(connection: Connection, history: Awaited<ReturnType<typeof readHistory>>, allowAddedRows: ReadonlySet<string> = new Set()): Promise<number> {
  let count = 0
  for (const [table, prior] of Object.entries(history)) {
    const data = (await rows(connection, 'SELECT ' + prior.columns.map(identifier).join(',') + ' FROM ' + identifier(table)))
      .map(row => JSON.stringify(row)).sort()
    if (allowAddedRows.has(table)) {
      const remaining = [...data]
      for (const previous of prior.data) {
        const index = remaining.indexOf(previous)
        if (index < 0) throw new Error('Historical rows changed in ' + table)
        remaining.splice(index, 1)
      }
    } else if (JSON.stringify(data) !== JSON.stringify(prior.data)) throw new Error('Historical rows changed in ' + table)
    count += prior.data.length
  }
  return count
}
async function validateJournal(connection: Connection): Promise<boolean> {
  const recorded = await rows(connection, 'SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at,id')
  const priorTimes = new Set(journal.entries.filter(entry => entry.idx < 20).map(entry => entry.when))
  if (recorded.some(row => Number(row.created_at) < entry20.when && !priorTimes.has(Number(row.created_at)))) {
    throw new Error('Unrecognized prior migration metadata; manual review required')
  }
  for (const entry of journal.entries.filter(entry => entry.idx < 20)) {
    const matching = recorded.filter(row => Number(row.created_at) === entry.when)
    const hash = createHash('sha256').update(readFileSync(resolve(migrationRoot, entry.tag + '.sql'), 'utf8')).digest('hex')
    if (matching.length !== 1 || matching[0].hash !== hash) throw new Error('Prior migration metadata mismatch at ' + entry.tag)
  }
  const matching = recorded.filter(row => Number(row.created_at) === entry20.when)
  if (matching.length > 1 || (matching.length === 1 && matching[0].hash !== hash20)) {
    throw new Error('0020 metadata does not match the repaired schema-only migration')
  }
  if (!matching.length && recorded.some(row => Number(row.created_at) > entry20.when)) {
    throw new Error('Cannot insert a missing 0020 baseline beneath later migrations')
  }
  return matching.length === 1
}
export async function plan0020(connection: Connection): Promise<string[]> {
  const [target] = await rows(connection, 'SELECT DATABASE() AS name')
  assertRepairTarget(target.name)
  const metadata = await rows(connection, 'SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()')
  const tables = await rows(connection, 'SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')
  const get = (table: string, column: string) => metadata.find(row => row.TABLE_NAME === table && row.COLUMN_NAME === column)
  requireColumn(get('rentals', 'started_at'), baseline.tables.rentals.columns.started_at, 'rentals')
  const indexes = await rows(connection, 'SELECT TABLE_NAME,INDEX_NAME,COLUMN_NAME,NON_UNIQUE,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY SEQ_IN_INDEX')
  const fks = await rows(connection, 'SELECT k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.DELETE_RULE,r.UPDATE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON k.CONSTRAINT_SCHEMA=r.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME=r.CONSTRAINT_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL')
  const plan: string[] = []
  const absent = new Set<string>()
  for (const table of ['rental_items', 'rental_item_extensions']) {
    const current = tables.find(row => row.TABLE_NAME === table)
    if (!current) { absent.add(table); continue }
    if (current.ENGINE !== 'InnoDB') throw new Error('Expected InnoDB for ' + table)
    for (const col of Object.values(snapshot.tables[table].columns)) requireColumn(get(table, col.name), col, table)
    const pk = indexes.filter(row => row.TABLE_NAME === table && row.INDEX_NAME === 'PRIMARY')
    if (pk.length !== 1 || pk[0].COLUMN_NAME !== 'id') throw new Error('Incompatible primary key on ' + table)
  }
  for (const statement of statements20) {
    let m: RegExpMatchArray | null
    if ((m = statement.match(/^CREATE TABLE .([a-z_]+). /))) {
      if (absent.has(m[1])) plan.push(statement)
    } else if ((m = statement.match(/^CREATE INDEX .([a-z_]+). ON .([a-z_]+)./))) {
      const expected = snapshot.tables[m[2]].indexes[m[1]]
      const found = indexes.filter(row => row.TABLE_NAME === m![2] && row.INDEX_NAME === m![1])
      if (!found.length) plan.push(statement)
      else if (found.map(row => row.COLUMN_NAME).join(',') !== expected.columns.join(',') || found.some(row => Boolean(row.NON_UNIQUE) === expected.isUnique)) {
        throw new Error('Incompatible index ' + m[1])
      }
    } else if ((m = statement.match(/^ALTER TABLE .([a-z_]+). (ADD|MODIFY) COLUMN .([a-z_]+). /))) {
      const [, table, operation, column] = m
      const actual = get(table, column)
      const expected = snapshot.tables[table].columns[column]
      if (!actual && operation === 'ADD') plan.push(statement)
      else if (!actual) throw new Error('Missing baseline column ' + table + '.' + column)
      else if (!columnMatches(actual, expected)) {
        const prior = baseline.tables[table].columns[column]
        if (operation !== 'MODIFY' || !prior || !columnMatches(actual, prior)) {
          throw new Error('Incompatible schema at ' + table + '.' + column)
        }
        plan.push(statement)
      }
    } else throw new Error('Unrecognized 0020 statement; review the repair planner')
  }
  for (const table of ['rental_items', 'rental_item_extensions']) {
    if (absent.has(table)) continue
    for (const fk of Object.values(snapshot.tables[table].foreignKeys)) {
      const [column] = fk.columnsFrom, [ref] = fk.columnsTo
      const found = fks.filter(row => row.TABLE_NAME === table && row.COLUMN_NAME === column)
      if (found.length) {
        if (found.length !== 1 || found[0].REFERENCED_TABLE_NAME !== fk.tableTo || found[0].REFERENCED_COLUMN_NAME !== ref
          || !['RESTRICT', 'NO ACTION'].includes(found[0].DELETE_RULE) || !['RESTRICT', 'NO ACTION'].includes(found[0].UPDATE_RULE)) {
          throw new Error('Incompatible foreign key on ' + table + '.' + column)
        }
      } else {
        if (absent.has(fk.tableTo)) throw new Error('Existing child table has a missing referenced table')
        const orphan = await rows(connection, 'SELECT 1 FROM ' + identifier(table) + ' c LEFT JOIN ' + identifier(fk.tableTo) + ' p ON c.' + identifier(column) + '=p.' + identifier(ref) + ' WHERE p.' + identifier(ref) + ' IS NULL LIMIT 1')
        if (orphan.length) throw new Error('Orphan rows prevent adding ' + fk.name)
        plan.push('ALTER TABLE ' + identifier(table) + ' ADD CONSTRAINT ' + identifier(fk.name) + ' FOREIGN KEY (' + identifier(column) + ') REFERENCES ' + identifier(fk.tableTo) + '(' + identifier(ref) + ')')
      }
    }
  }
  return plan
}
export async function repair0020(connection: Connection, apply = false) {
  const [target] = await rows(connection, 'SELECT DATABASE() AS name')
  assertRepairTarget(target.name)
  const lockName = 'repair0020:' + target.name
  const [locked] = await rows(connection, 'SELECT GET_LOCK(?, 0) AS acquired', [lockName])
  if (Number(locked.acquired) !== 1) throw new Error('Another 0020 repair is running')
  try {
    const recorded = await validateJournal(connection)
    const plan = await plan0020(connection)
    if (recorded && plan.length) throw new Error('Recorded 0020 does not match schema; require a separate reviewed repair')
    if (!apply) return { applied: false, recorded, statements: plan.length, plan }
    const history = await readHistory(connection)
    for (const statement of plan) await connection.query(statement)
    if ((await plan0020(connection)).length) throw new Error('0020 schema remains incomplete; no journal entry recorded')
    const preservedRows = await assertHistoryUnchanged(connection, history)
    if (!recorded) await connection.query('INSERT INTO __drizzle_migrations (hash,created_at) VALUES (?,?)', [hash20, entry20.when])
    return { applied: true, recorded: true, statements: plan.length, preservedRows }
  } finally {
    await connection.query('SELECT RELEASE_LOCK(?)', [lockName])
  }
}
