import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config()

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME || 'koshk_skate',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
})

console.log('=== TABLES ===')
const [tables] = await conn.query('SHOW TABLES')
console.log(tables.map(r => Object.values(r)[0]).join('\n'))

console.log('\n=== DRIZZLE MIGRATIONS ===')
const [migs] = await conn.query('SELECT * FROM `__drizzle_migrations` ORDER BY id')
console.log(JSON.stringify(migs, null, 2))

console.log('\n=== USERS COLUMNS ===')
const [cols] = await conn.query('SHOW COLUMNS FROM `users`')
console.log(cols.map(c => c.Field).join(', '))

await conn.end()
