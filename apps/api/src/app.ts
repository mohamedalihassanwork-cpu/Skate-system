/**
 * KOSHK SKATE ERP — Express App Factory
 * Phase 05 — Rental POS Core (updated from Phase 04)
 *
 * Separated from server startup (index.ts) so tests can import the
 * configured app without starting the HTTP listener or failing on
 * DB connection issues.
 *
 * This module is the single source of truth for:
 *   - Global middleware registration
 *   - Route mounting
 *   - Error handler registration
 */

import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import { errorHandler } from './middleware/errorHandler.js'
import env from './config/env.js'

// Phase 02 routes
import authRoutes from './modules/auth/auth.routes.js'
import usersRoutes from './modules/users/users.routes.js'
import rolesRoutes from './modules/users/roles.routes.js'

import { productsRouter } from './modules/products/products.routes.js'
import { salesRouter } from './modules/sales/sales.routes.js'

// Phase 03 routes
import skatesRoutes from './modules/skates/skates.routes.js'

// Phase 04 routes
import customersRoutes from './modules/customers/customers.routes.js'

// Phase 05 routes
import rentalsRoutes from './modules/rentals/rentals.routes.js'
import rentalItemsRoutes from './modules/rentals/rental-items.routes.js'

// Phase 06 routes
import paymentsRoutes from './modules/payments/payments.routes.js'
import treasuryRoutes from './modules/treasury/treasury.routes.js'

// Phase 08 routes
import { damageRouter } from './modules/damage/damage.routes.js'

// Phase 09 routes
import maintenanceRoutes from './modules/maintenance/maintenance.routes.js'

// Phase 10 routes
import { reservationsRouter } from './modules/reservations/reservations.routes.js'

// Phase 12 routes
import { shiftsRouter } from './modules/shifts/shifts.routes.js'
import { expensesRouter } from './modules/expenses/expenses.routes.js'

// Phase 13 routes
import { reportsRouter } from './modules/reports/reports.routes.js'

// Phase 14 routes
import { invoicesRouter } from './modules/invoices/invoices.routes.js'

// Settings
import { settingsRouter } from './modules/settings/settings.routes.js'

// Phase 15 routes
import { notificationsRouter } from './modules/notifications/notifications.routes.js'

// Phase 16 routes
import { auditRouter } from './modules/audit/audit.routes.js'

// Phase 17 routes
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js'

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express()

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

// CORS — allow frontend dev server and production origin (handling localhost/127.0.0.1 mismatch)
app.use(
  cors({
    origin: [env.CORS_ORIGIN, env.CORS_ORIGIN.replace('localhost', '127.0.0.1'), env.CORS_ORIGIN.replace('127.0.0.1', 'localhost')],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,  // required for HttpOnly cookie on refresh (DEC-025)
  }),
)

// Cookie parser — required for reading the HttpOnly refresh token cookie (DEC-025)
app.use(cookieParser())

// JSON body parsing
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging (suppress in test environment)
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.isDevelopment ? 'dev' : 'combined'))
}

// ---------------------------------------------------------------------------
// Health check — GET /api/v1/health
// ---------------------------------------------------------------------------

app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'koshk-skate-api',
    version: '6.0.0',
    phase: 'Phase 06 — Multi-Skate Rentals Redesign',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  })
})

// ---------------------------------------------------------------------------
// API Router index
// ---------------------------------------------------------------------------

app.get('/api/v1', (_req, res) => {
  res.json({
    success: true,
    message: 'KOSHK SKATE ERP API — Phase 05',
    routes: {
      health: 'GET /api/v1/health',
      auth: {
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        logout: 'POST /api/v1/auth/logout',
        me: 'GET /api/v1/auth/me',
      },
      users:     '/api/v1/users',
      roles:     '/api/v1/roles',
      skates:    '/api/v1/skates',
      customers: '/api/v1/customers',
      rentals:   '/api/v1/rentals',
    },
  })
})

// ---------------------------------------------------------------------------
// Phase 02 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', usersRoutes)
app.use('/api/v1/roles', rolesRoutes)

// ---------------------------------------------------------------------------
// Phase 03 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/skates', skatesRoutes)

app.use('/api/v1/products', productsRouter)
app.use('/api/v1/sales', salesRouter)

// ---------------------------------------------------------------------------
// Phase 04 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/customers', customersRoutes)

// ---------------------------------------------------------------------------
// Phase 05 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/rentals', rentalsRoutes)
app.use('/api/v1/rental-items', rentalItemsRoutes)

// ---------------------------------------------------------------------------
// Phase 06 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/payments', paymentsRoutes)
app.use('/api/v1/treasury', treasuryRoutes)

// ---------------------------------------------------------------------------
// Phase 08 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/damages', damageRouter)

// ---------------------------------------------------------------------------
// Phase 09 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/maintenance', maintenanceRoutes)

// ---------------------------------------------------------------------------
// Phase 10 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/reservations', reservationsRouter)

// ---------------------------------------------------------------------------
// Phase 12 routes
// ---------------------------------------------------------------------------

app.use('/api/v1/shifts', shiftsRouter)
app.use('/api/v1/expenses', expensesRouter)

// ---------------------------------------------------------------------------
// Phase 13 routes
// ---------------------------------------------------------------------------
app.use('/api/v1/reports', reportsRouter)

// ---------------------------------------------------------------------------
// Phase 14 routes
app.use('/api/v1/invoices', invoicesRouter)

// Settings routes
app.use('/api/v1/settings', settingsRouter)

// Phase 15 routes
app.use('/api/v1/notifications', notificationsRouter)

// Phase 16 routes
app.use('/api/v1/audit-logs', auditRouter)

// Phase 17 routes
app.use('/api/v1/dashboard', dashboardRouter)

// ---------------------------------------------------------------------------
// 404 handler — must come before error handler, after all routes
// ---------------------------------------------------------------------------

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

export default app
