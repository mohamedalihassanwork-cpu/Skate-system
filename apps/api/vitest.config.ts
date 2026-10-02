/**
 * KOSHK SKATE ERP — Vitest Configuration
 * Phase 02 — Authentication & Permissions
 *
 * Note: .env is loaded by dotenv-cli in the npm test script:
 *   "test": "dotenv -e .env -- cross-env NODE_ENV=test vitest run"
 * No dotenv config needed here.
 *
 * Gate 4.1.2 fix: singleFork: true forces all test files to share a single
 * fork process, eliminating cross-file DB state pollution.
 *
 * Gate 4.2 Batch 1 migration: `poolOptions` was removed in Vitest 5.
 * singleFork is now a top-level `test` option (per migration guide).
 * poolOptions block kept as a compatibility shim; remove once Vitest version
 * is upgraded and confirmed that top-level singleFork is sufficient.
 */

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Raised from 30 000 to 60 000 — system-actor test 5 calls execSync
    // to re-run the seed script; on a loaded Windows machine this can exceed
    // the default 30 s limit (observed: 30 942 ms in Gate 4.2 Batch 1 run 2).
    testTimeout: 60000,
    hookTimeout: 30000,     // prevents rentals.test.ts beforeAll timing out after system-actor seed
    fileParallelism: false, // enforce strict sequential file execution
    pool: 'forks',          // explicit: use fork-based isolation
    // Vitest 5: singleFork is now a top-level option (poolOptions removed).
    // Run all files inside ONE fork so execSync in system-actor.test.ts cannot
    // trigger concurrent workers and cross-file DB state pollution is prevented.
    singleFork: true,
    // Compatibility shim — will be removed once top-level singleFork is confirmed.
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    include: ['src/tests/**/*.test.ts'],
    // Run test files serially to avoid DB state conflicts
    sequence: {
      concurrent: false,
    },
  },
})
