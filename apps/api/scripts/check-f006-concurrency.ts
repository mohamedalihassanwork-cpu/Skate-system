import { createPool } from 'mysql2/promise'
import 'dotenv/config'

async function main() {
  const pool = createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })
  const conn = await pool.getConnection()
  try {
    const [rows] = await conn.execute(
      'SELECT damage_report_id, inspection_id, COUNT(*) as cnt FROM maintenance_records WHERE damage_report_id IS NOT NULL OR inspection_id IS NOT NULL GROUP BY damage_report_id, inspection_id HAVING cnt > 1'
    )
    console.log('LEGACY_DUPES:', JSON.stringify(rows))
    const [txIso] = await conn.execute('SELECT @@transaction_isolation as iso')
    console.log('TX_ISO:', JSON.stringify(txIso))
  } finally {
    conn.release()
    await pool.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
