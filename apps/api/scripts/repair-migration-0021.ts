import mysql from 'mysql2/promise'
import { assertRepairTarget, testCredentials } from './migration-0020'
import { repair0021 } from './migration-0021'

async function main() {
  const args = process.argv.slice(2), index = args.indexOf('--database')
  if (index < 0 || !args[index + 1]) throw new Error('Specify --database koshk_skate_test; default is read-only')
  const target = args[index + 1]
  assertRepairTarget(target)
  if (args.includes('--check') && args.includes('--apply')) throw new Error('Choose --check or --apply')
  const connection = await mysql.createConnection({ ...testCredentials(), database: target })
  try { console.log(JSON.stringify({ target, ...await repair0021(connection, args.includes('--apply')) }, null, 2)) }
  finally { await connection.end() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
