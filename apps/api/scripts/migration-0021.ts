import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Connection } from 'mysql2/promise'
import { migrationRoot, journal, assertRepairTarget, identifier, rows, repair0020,
  readHistory, assertHistoryUnchanged, columnMatches } from './migration-0020'

const q = String.fromCharCode(96)
const target = JSON.parse(readFileSync(resolve(migrationRoot, 'meta/0021_snapshot.json'), 'utf8'))
const prior = JSON.parse(readFileSync(resolve(migrationRoot, 'meta/0020_snapshot.json'), 'utf8'))
export const entry21 = journal.entries.find(entry => entry.idx === 21)!
if (!entry21 || entry21.tag !== '0021_subtreasury') throw new Error('Missing canonical 0021')
export const sql21 = readFileSync(resolve(migrationRoot, entry21.tag + '.sql'), 'utf8')
export const hash21 = createHash('sha256').update(sql21).digest('hex')
export const statements21 = sql21.split('--> statement-breakpoint')
  .map(part => part.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean)
const newTables = Object.keys(target.tables).filter(table => !prior.tables[table])
const addedRows = new Set(['permissions', 'role_permissions', 'treasury_configuration'])
const permissionKeys = ['treasury.view_own', 'treasury.assign', 'treasury.fund', 'treasury.handovers.view',
  'treasury.handovers.confirm', 'treasury.reconcile', 'shifts.view_all', 'expenses.view_all']
function columns(text: string) { return text.replaceAll(q, '').split(',').map(value => value.trim()) }
function expression(text: string) {
  return text.toLowerCase().replaceAll(q, '').replaceAll(String.fromCharCode(92), '').replace(/_utf8mb4|[\s()]/g, '')
}
function equalColumn(actual: any, expected: any): boolean {
  return columnMatches(actual, expected) && (expected.generated
    ? actual.EXTRA.toLowerCase().includes('stored generated') && expression(actual.GENERATION_EXPRESSION) === expression(expected.generated.as)
    : !actual.GENERATION_EXPRESSION)
}
async function metadata(connection: Connection) {
  return {
    tables: await rows(connection, 'SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()'),
    cols: await rows(connection, 'SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLUMN_DEFAULT,EXTRA,GENERATION_EXPRESSION FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE()'),
    indexes: await rows(connection, 'SELECT TABLE_NAME,INDEX_NAME,COLUMN_NAME,NON_UNIQUE,SEQ_IN_INDEX FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY SEQ_IN_INDEX'),
    fks: await rows(connection, 'SELECT k.TABLE_NAME,k.CONSTRAINT_NAME,k.COLUMN_NAME,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,r.DELETE_RULE,r.UPDATE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON k.CONSTRAINT_SCHEMA=r.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME=r.CONSTRAINT_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.ORDINAL_POSITION'),
  }
}
export async function plan0021(connection: Connection, includeDml = true) {
  const [database] = await rows(connection, 'SELECT DATABASE() AS name')
  assertRepairTarget(database.name)
  const m = await metadata(connection), plan: string[] = []
  const hasTable = (table: string) => m.tables.some(row => row.TABLE_NAME === table)
  const get = (table: string, column: string) => m.cols.find(row => row.TABLE_NAME === table && row.COLUMN_NAME === column)
  function checkIndex(table: string, name: string, expectedColumns: string[], unique: boolean) {
    const found = m.indexes.filter(row => row.TABLE_NAME === table && row.INDEX_NAME === name)
    if (!found.length) return false
    if (found.map(row => row.COLUMN_NAME).join(',') !== expectedColumns.join(',') || found.some(row => Boolean(row.NON_UNIQUE) === unique)) {
      throw new Error('Incompatible 0021 index ' + table + '.' + name)
    }
    return true
  }
  // CREATE TABLE is atomic: an existing partially-defined new table is not
  // repaired by guessing missing columns. All declared columns/keys must match.
  for (const table of newTables) {
    if (!hasTable(table)) continue
    if (m.tables.find(row => row.TABLE_NAME === table).ENGINE !== 'InnoDB') throw new Error('Expected InnoDB ' + table)
    for (const [name, expected] of Object.entries(target.tables[table].columns)) {
      const actual = get(table, name)
      if (!actual || !equalColumn(actual, expected)) throw new Error('Incompatible 0021 column ' + table + '.' + name)
    }
    if (!checkIndex(table, 'PRIMARY', ['id'], true)) throw new Error('Missing primary key ' + table)
    // Inline unique keys must exist before marking an existing CREATE complete.
    const create = statements21.find(statement => statement.startsWith('CREATE TABLE ' + identifier(table)))!
    for (const key of create.matchAll(/CONSTRAINT .([a-z_]+). UNIQUE\(([^)]+)\)/g)) {
      if (!checkIndex(table, key[1], columns(key[2]), true)) throw new Error('Missing inline unique key ' + key[1])
    }
  }
  for (const statement of statements21) {
    let match: RegExpMatchArray | null
    if ((match = statement.match(/^CREATE TABLE .([a-z_]+). /))) {
      if (!hasTable(match[1])) plan.push(statement)
    } else if ((match = statement.match(/^ALTER TABLE .([a-z_]+). (ADD|MODIFY) (?:COLUMN )?.([a-z_]+). (?!UNIQUE|FOREIGN)/))
      && !statement.includes(' ADD CONSTRAINT ')) {
      const [, table, operation, name] = match
      const expected = target.tables[table]?.columns[name], actual = get(table, name)
      if (!expected) throw new Error('Unknown 0021 column statement')
      if (!actual && operation === 'ADD') plan.push(statement)
      else if (!actual) throw new Error('Missing baseline column ' + table + '.' + name)
      else if (!equalColumn(actual, expected)) {
        const before = prior.tables[table]?.columns[name]
        if (operation !== 'MODIFY' || !before || !equalColumn(actual, before)) throw new Error('Incompatible 0021 column ' + table + '.' + name)
        plan.push(statement)
      }
    } else if ((match = statement.match(/^ALTER TABLE .([a-z_]+). ADD CONSTRAINT .([a-z_]+). UNIQUE\(([^)]+)\)/))) {
      if (!checkIndex(match[1], match[2], columns(match[3]), true)) {
        if (hasTable(match[1]) && columns(match[3]).every(name => get(match![1], name))) {
          const list = columns(match[3]).map(identifier)
          const duplicates = await rows(connection, 'SELECT 1 FROM ' + identifier(match[1]) + ' WHERE ' + list.map(col => col + ' IS NOT NULL').join(' AND ') + ' GROUP BY ' + list.join(',') + ' HAVING COUNT(*)>1 LIMIT 1')
          if (duplicates.length) throw new Error('Duplicate rows prevent ' + match[2])
        }
        plan.push(statement)
      }
    } else if ((match = statement.match(/^CREATE INDEX .([a-z_]+). ON .([a-z_]+). \(([^)]+)\)/))) {
      if (!checkIndex(match[2], match[1], columns(match[3]), false)) plan.push(statement)
    } else if ((match = statement.match(/^ALTER TABLE .([a-z_]+). ADD CONSTRAINT .([a-z_]+). FOREIGN KEY \(([^)]+)\) REFERENCES .([a-z_]+).\(([^)]+)\)/))) {
      const [, table, name, sourceText, referencedTable, targetText] = match
      if (name.length > 64) throw new Error('Overlength 0021 foreign-key name ' + name)
      const sourceColumns = columns(sourceText), targetColumns = columns(targetText)
      const found = m.fks.filter(row => row.TABLE_NAME === table && row.CONSTRAINT_NAME === name)
      if (found.length) {
        if (found.length !== sourceColumns.length || found.some((row, i) => row.COLUMN_NAME !== sourceColumns[i]
          || row.REFERENCED_TABLE_NAME !== referencedTable || row.REFERENCED_COLUMN_NAME !== targetColumns[i]
          || !['RESTRICT', 'NO ACTION'].includes(row.DELETE_RULE) || !['RESTRICT', 'NO ACTION'].includes(row.UPDATE_RULE))) {
          throw new Error('Incompatible 0021 foreign key ' + name)
        }
      } else {
        if (hasTable(table) && hasTable(referencedTable) && sourceColumns.every(column => get(table, column))) {
          const join = sourceColumns.map((column, i) => 'c.' + identifier(column) + '=p.' + identifier(targetColumns[i])).join(' AND ')
          const populated = sourceColumns.map(column => 'c.' + identifier(column) + ' IS NOT NULL').join(' AND ')
          if ((await rows(connection, 'SELECT 1 FROM ' + identifier(table) + ' c LEFT JOIN ' + identifier(referencedTable) + ' p ON ' + join + ' WHERE ' + populated + ' AND p.' + identifier(targetColumns[0]) + ' IS NULL LIMIT 1')).length) {
            throw new Error('Orphan rows prevent ' + name)
          }
        }
        plan.push(statement)
      }
    } else if (statement === 'INSERT INTO treasury_configuration(id,enabled) VALUES(1,0);') {
      if (!hasTable('treasury_configuration')) { if (includeDml) plan.push(statement); continue }
      const config = await rows(connection, 'SELECT * FROM treasury_configuration')
      if (!config.length) { if (includeDml) plan.push(statement) }
      else if (config.length !== 1 || config[0].id !== 1) throw new Error('Unexpected treasury configuration rows')
      else if (includeDml && (Number(config[0].enabled) !== 0 || config[0].main_account_id !== null || config[0].activated_by !== null || config[0].activated_at !== null)) throw new Error('Untracked 0021 configuration is already active/altered')
    } else if (statement.startsWith('INSERT IGNORE INTO permissions ') || statement.startsWith('INSERT IGNORE INTO role_permissions(')) {
      if (includeDml) plan.push(statement)
    } else throw new Error('Unrecognized 0021 statement; no blind execution permitted')
  }
  return plan
}
async function checkInitialization(connection: Connection) {
  const config = await rows(connection, 'SELECT * FROM treasury_configuration WHERE id=1')
  if (config.length !== 1 || Number(config[0].enabled) !== 0 || config[0].main_account_id !== null
    || config[0].activated_by !== null || config[0].activated_at !== null) throw new Error('Untracked 0021 has active/altered configuration; manual review required')
  const permissions = await rows(connection, 'SELECT ' + identifier('key') + ' FROM permissions WHERE ' + identifier('key') + ' IN (' + permissionKeys.map(() => '?').join(',') + ')', permissionKeys)
  if (permissions.length !== permissionKeys.length) throw new Error('0021 permission initialization incomplete')
  const missing = await rows(connection, "SELECT 1 FROM roles r CROSS JOIN permissions p WHERE p." + identifier('key') + " IN (" + permissionKeys.map(() => '?').join(',') + ") AND ((r.name='Administrator' AND r.is_system=1) OR EXISTS(SELECT 1 FROM role_permissions rp JOIN permissions old ON old.id=rp.permission_id WHERE rp.role_id=r.id AND old." + identifier('key') + "='treasury.manage')) AND NOT EXISTS(SELECT 1 FROM role_permissions rp WHERE rp.role_id=r.id AND rp.permission_id=p.id) LIMIT 1", permissionKeys)
  if (missing.length) throw new Error('0021 manager permission grants incomplete')
  const ownMissing = await rows(connection, "SELECT 1 FROM role_permissions rp JOIN permissions old ON old.id=rp.permission_id WHERE old." + identifier('key') + "='shifts.manage' AND NOT EXISTS(SELECT 1 FROM role_permissions own JOIN permissions p ON p.id=own.permission_id WHERE own.role_id=rp.role_id AND p." + identifier('key') + "='treasury.view_own') LIMIT 1")
  if (ownMissing.length) throw new Error('0021 own-view permission grants incomplete')
}
export async function repair0021(connection: Connection, apply = false) {
  const [database] = await rows(connection, 'SELECT DATABASE() AS name')
  assertRepairTarget(database.name)
  const check20 = await repair0020(connection)
  if (!check20.recorded || check20.statements) throw new Error('Complete and validate migration 0020 first')
  const lockName = 'repair0021:' + database.name
  if (Number((await rows(connection, 'SELECT GET_LOCK(?,0) acquired', [lockName]))[0].acquired) !== 1) throw new Error('Another 0021 repair is running')
  try {
    const tracked = await rows(connection, 'SELECT hash,created_at FROM __drizzle_migrations WHERE created_at>=?', [entry21.when])
    const recorded = tracked.filter(row => Number(row.created_at) === entry21.when)
    if (recorded.length > 1 || recorded.some(row => row.hash !== hash21) || (!recorded.length && tracked.length)) throw new Error('0021 migration metadata mismatch')
    const ddl = await plan0021(connection, false)
    if (recorded.length && ddl.length) throw new Error('Recorded 0021 schema is inconsistent')
    if (recorded.length) return { applied: false, recorded: true, statements: 0 }
    const plan = await plan0021(connection)
    if (!apply) return { applied: false, recorded: false, statements: plan.length, plan }
    const history = await readHistory(connection)
    for (const statement of plan) await connection.query(statement)
    if ((await plan0021(connection, false)).length) throw new Error('0021 schema incomplete; no journal entry recorded')
    await checkInitialization(connection)
    const preservedRows = await assertHistoryUnchanged(connection, history, addedRows)
    const historicalDigest = createHash('sha256').update(JSON.stringify(history)).digest('hex')
    await connection.query('INSERT INTO __drizzle_migrations(hash,created_at) VALUES (?,?)', [hash21, entry21.when])
    return { applied: true, recorded: true, statements: plan.length, preservedRows, historicalDigest }
  } finally { await connection.query('SELECT RELEASE_LOCK(?)', [lockName]) }
}
