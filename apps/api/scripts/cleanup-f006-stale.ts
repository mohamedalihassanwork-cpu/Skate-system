/**
 * One-off cleanup script: removes stale gate51-f006 test fixtures
 * that were orphaned due to a partial beforeAll failure.
 *
 * Run: dotenv -e .env.test -- tsx scripts/cleanup-f006-stale.ts
 */

import 'dotenv/config'
import { createPool } from 'mysql2/promise'

const pool = createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
})

async function main() {
  const conn = await pool.getConnection()
  try {
    console.log('Cleaning up stale F006 test fixtures...')

    // Find stale rentals with non-conformant codes (RN-F006-* or RN-TEMP)
    const [staleRentals] = await conn.execute<any[]>(
      `SELECT id, rental_code FROM rentals WHERE rental_code LIKE 'RN-F006-%' OR rental_code = 'RN-TEMP'`
    )
    console.log(`Found ${staleRentals.length} stale rental(s):`, staleRentals.map((r: any) => r.rental_code))

    for (const rental of staleRentals) {
      const rentalId = rental.id
      console.log(`Cleaning up rental ${rentalId} (${rental.rental_code})...`)

      // Delete in FK-safe order
      await conn.execute('DELETE FROM maintenance_records WHERE inspection_id IN (SELECT id FROM inspections WHERE rental_id = ?)', [rentalId])
      await conn.execute('DELETE FROM damage_reports WHERE rental_id = ?', [rentalId])
      await conn.execute('DELETE FROM late_fee_records WHERE rental_id = ?', [rentalId])
      await conn.execute('DELETE FROM rental_payments WHERE rental_id = ?', [rentalId])
      await conn.execute('DELETE FROM inspections WHERE rental_id = ?', [rentalId])
      await conn.execute('DELETE FROM rentals WHERE id = ?', [rentalId])

      console.log(`  Rental ${rentalId} cleaned up.`)
    }

    // Also clean up stale skates with F006 codes — must clean referencing rentals first
    const [staleSkates] = await conn.execute<any[]>(
      `SELECT id, skate_code FROM skates WHERE skate_code LIKE 'F006-%'`
    )
    console.log(`Found ${staleSkates.length} stale skate(s):`, staleSkates.map((s: any) => s.skate_code))
    for (const skate of staleSkates) {
      // First clean up any rentals that reference this skate
      const [refRentals] = await conn.execute<any[]>(
        `SELECT id, rental_code FROM rentals WHERE skate_id = ?`, [skate.id]
      )
      for (const rental of refRentals) {
        console.log(`  Cleaning up referencing rental ${rental.id} (${rental.rental_code}) for skate ${skate.id}...`)
        await conn.execute('DELETE FROM maintenance_records WHERE inspection_id IN (SELECT id FROM inspections WHERE rental_id = ?)', [rental.id])
        await conn.execute('DELETE FROM damage_reports WHERE rental_id = ?', [rental.id])
        await conn.execute('DELETE FROM late_fee_records WHERE rental_id = ?', [rental.id])
        await conn.execute('DELETE FROM rental_payments WHERE rental_id = ?', [rental.id])
        await conn.execute('DELETE FROM inspections WHERE rental_id = ?', [rental.id])
        await conn.execute('DELETE FROM rentals WHERE id = ?', [rental.id])
      }
      await conn.execute('DELETE FROM skates WHERE id = ?', [skate.id])
      console.log(`  Skate ${skate.id} (${skate.skate_code}) deleted.`)
    }

    // Clean up stale customers
    const [staleCusts] = await conn.execute<any[]>(
      `SELECT id, name FROM customers WHERE name LIKE 'F006 Customer %'`
    )
    console.log(`Found ${staleCusts.length} stale customer(s)`)
    for (const cust of staleCusts) {
      await conn.execute('DELETE FROM customers WHERE id = ?', [cust.id])
      console.log(`  Customer ${cust.id} deleted.`)
    }

    // Clean up stale users
    const [staleUsers] = await conn.execute<any[]>(
      `SELECT id, email FROM users WHERE email LIKE 'f006.test.%@koshk.com'`
    )
    console.log(`Found ${staleUsers.length} stale user(s)`)
    for (const user of staleUsers) {
      await conn.execute('DELETE FROM maintenance_records WHERE created_by = ?', [user.id])
      await conn.execute('DELETE FROM audit_logs WHERE user_id = ?', [user.id])
      await conn.execute('DELETE FROM users WHERE id = ?', [user.id])
      console.log(`  User ${user.id} (${user.email}) deleted.`)
    }

    console.log('Done.')
  } finally {
    conn.release()
    await pool.end()
  }
}

main().catch(console.error)
