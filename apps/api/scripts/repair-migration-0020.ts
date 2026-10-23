import mysql from 'mysql2/promise'
import { assertRepairTarget, repair0020, testCredentials } from './migration-0020'

async function main() {
  const args = process.argv.slice(2)
  if (args.some(arg => !['--database', '--apply', '--check'].includes(arg) && !/^koshk_skate_/.test(arg))) throw new Error('Unknown argument')
  const index = args.indexOf('--database')
  if (index < 0 || !args[index + 1]) throw new Error('Specify --database koshk_skate_test; default is read-only')
  const target = args[index + 1]
  assertRepairTarget(target)
  if (args.includes('--check') && args.includes('--apply')) throw new Error('Choose --check or --apply')
  const connection = await mysql.createConnection({ ...testCredentials(), database: target })
  try {
    const result = await repair0020(connection, args.includes('--apply'))
    // No credentials or historical row contents are emitted.
    console.log(JSON.stringify({ target, ...result }, null, 2))
  } finally { await connection.end() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
