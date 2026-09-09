/**
 * KOSHK SKATE ERP — Server Entry Point
 * Phase 02 — Authentication & Permissions (updated)
 *
 * This file ONLY:
 *   1. Imports the configured Express app from app.ts
 *   2. Tests the DB connection
 *   3. Starts the HTTP listener
 *
 * All app configuration (middleware, routes, error handler) lives in app.ts.
 * Tests import from app.ts directly — not this file.
 *
 * Phase 03+: module routes added to app.ts, not here.
 */

import { testConnection } from './db/connection.js'
import env from './config/env.js'
import app from './app.js'

export { app }

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  try {
    // Test DB connection before accepting requests
    await testConnection()

    app.listen(env.PORT, () => {
      console.log(`🚀 KOSHK SKATE API running on http://localhost:${env.PORT}`)
      console.log(`   Environment: ${env.NODE_ENV}`)
      console.log(`   Health check: http://localhost:${env.PORT}/api/v1/health`)
      console.log(`   Auth routes:  http://localhost:${env.PORT}/api/v1/auth/login`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

start()
