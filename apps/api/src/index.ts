/**
 * KOSHK SKATE ERP — Express Application Entry Point
 * Phase 01 — Foundation
 *
 * What this file does:
 *  1. Loads environment configuration
 *  2. Creates the Express app with global middleware
 *  3. Registers the health check route
 *  4. Registers the global error handler (must be last)
 *  5. Tests the database connection
 *  6. Starts the HTTP server
 *
 * Subsequent phases will add:
 *  Phase 02: auth routes + permission middleware
 *  Phase 03+: module routes (skates, customers, rentals, ...)
 */

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { errorHandler } from './middleware/errorHandler.js'
import { testConnection } from './db/connection.js'
import env from './config/env.js'

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express()

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

// CORS — allow frontend dev server and production origin
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
)

// JSON body parsing
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging
app.use(morgan(env.isDevelopment ? 'dev' : 'combined'))

// ---------------------------------------------------------------------------
// Health check — GET /api/v1/health
// Used by: deployment scripts, monitoring, Phase 01 verification
// ---------------------------------------------------------------------------

app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'koshk-skate-api',
    version: '1.0.0',
    phase: 'Phase 01 — Foundation',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  })
})

// ---------------------------------------------------------------------------
// API Router — Phase 01 placeholder
// Phase 02+ will mount: /api/v1/auth, /api/v1/users, /api/v1/skates, ...
// ---------------------------------------------------------------------------

app.get('/api/v1', (_req, res) => {
  res.json({
    success: true,
    message: 'KOSHK SKATE ERP API — Phase 01',
    routes: {
      health: 'GET /api/v1/health',
    },
  })
})

// 404 handler — must come before error handler, after all routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'المسار غير موجود',
    },
  })
})

// Global error handler — MUST be last middleware registered
app.use(errorHandler)

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
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

start()

export default app
