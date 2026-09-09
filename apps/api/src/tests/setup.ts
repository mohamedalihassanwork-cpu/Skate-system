/**
 * KOSHK SKATE ERP — Test Setup
 * Phase 02 — Authentication & Permissions
 *
 * Runs before all test files.
 * Loads .env so DB credentials and JWT secrets are available.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from the apps/api directory (two levels up from src/tests/)
config({ path: resolve(__dirname, '../../.env') })
