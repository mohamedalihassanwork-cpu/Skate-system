/**
 * KOSHK SKATE ERP — Database Connection
 * Phase 01 — Foundation
 *
 * Drizzle ORM with MySQL2 driver (DEC-022)
 * Database: MySQL / MariaDB InnoDB utf8mb4 (DEC-015)
 *
 * This module exports:
 *   db — the Drizzle query builder instance (used by all modules)
 *   pool — the raw mysql2 pool (for health checks and transactions)
 *   testConnection() — verify DB is reachable on startup
 */

import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import env from '../config/env.js'
import * as schema from './schema/index.js'

// ---------------------------------------------------------------------------
// Connection pool — shared across all requests
// ---------------------------------------------------------------------------

export const pool = mysql.createPool({
  host:     env.DB_HOST,
  port:     env.DB_PORT,
  database: env.DB_NAME,
  user:     env.DB_USER,
  password: env.DB_PASSWORD,
  charset:  'utf8mb4', // Required for Arabic text (DEC-015)
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone: '+00:00',  // Store timestamps in UTC
})

// ---------------------------------------------------------------------------
// Drizzle instance — use this in all modules
// ---------------------------------------------------------------------------

export const db = drizzle(pool, {
  schema,
  mode: 'default',
})

// ---------------------------------------------------------------------------
// Connection health check — called on application startup
// ---------------------------------------------------------------------------

export async function testConnection(): Promise<void> {
  const connection = await pool.getConnection()
  try {
    await connection.ping()
    console.log(`✅ Database connected — ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`)
  } finally {
    connection.release()
  }
}

export default db
