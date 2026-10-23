# Sub-Treasury migrations and activation verification

**Date:** 2026-10-16
**Status:** IMPLEMENTED — guarded migration, recovery and activation verification passed on dedicated test/disposable databases.
**Authority:** Owner approval of ST-01–06 in [CR-SUB-TREASURY-2026-10-15](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md). No development or production migration/deployment was performed.

## Approved historical boundary

The former unjournaled 0020 duplicated `rentals.started_at`, omitted `late_fee_records.rental_item_id`, and generated historical rental items using inferred durations/prices. The replacement is schema-only. It preserves historical accounts, movements, payments, rentals, inspections, shifts, amounts, timestamps and nullable references. It does not post opening funds, allocate old custody, reconstruct items, or synthesize handovers.

Legacy rentals without items remain legacy. These migration checks prove schema/history preservation, not full application compatibility with every unconverted rental. Existing legacy sessions must close through their existing workflow before explicit sub-treasury activation. Cashier-entered opening cash is an audited count only, never a funding movement.

## Implemented migrations and controls

| Artifact | Implemented purpose |
|---|---|
| `0020_multi_skate_rentals.sql`, `meta/0020_snapshot.json`, journal idx20 | Canonical schema-only multi-item prerequisite; existing migrations 0000–0019 remain unchanged. Add missing nullable item links and new item/extension tables without historical backfills. |
| `0021_subtreasury.sql`, `meta/0021_snapshot.json`, journal idx21 | Add independent-account roles, managed-shift snapshots, operation keys, assignment/funding/handover/transfer/settlement tables, movement transfer legs and actual rental posting-account link. Add approved permission grants and disabled configuration. |
| `scripts/migration-0020.ts`, `scripts/migration-0021.ts` | Validate prior migration hashes and actual column/index/FK definitions; apply only missing reviewed DDL or safe widening; verify final schema and original rows before journaling canonical content. |
| `scripts/repair-migration-0020.ts`, `scripts/repair-migration-0021.ts` | Explicit target required; check/default is read-only; writes require `--apply`. |
| `scripts/verify-migrations.ts` | Guarded disposable verification of official migrations, seeds, legacy preservation, partial/aligned recovery, constraints, bad-schema/hash rejection and cleanup ownership. |
| `scripts/verify-treasury-activation.ts` | Invoke actual account creation and activation on guarded disposable fixtures; require independent new cash/electronic accounts to remain zero and repeat activation to retain one audit event. |

0021 starts disabled with no selected main account, assignment, inferred opening money or transferred historic balance. Its historical-row comparison allows only approved additive permission/grant/configuration rows. Stored account balances and old financial rows are never redistributed. New transfer and variance records remain distinct from revenue and ordinary expenses.

The managed-shift generated unique key applies only when `status='active'` and `treasury_account_id IS NOT NULL`; it does not alter legacy duplicate active sessions. The transfer destination FK has the explicit name `treasury_transfer_destination_fk`, within MySQL's 64-character identifier limit.

All canonical SQL uses LF, as required by `.gitattributes`. Drizzle records the hash of actual file contents; schema resemblance alone is not grounds to fabricate a journal entry.

## Safe execution and recovery

Run commands from `apps/api`. The scripts read `.env.test` privately and require its database to be exactly `koshk_skate_test` on a local host; they do not print credentials or historical row contents.

```powershell
npm run db:verify
npx tsx scripts/repair-migration-0020.ts --database koshk_skate_test --check
npx tsx scripts/repair-migration-0021.ts --database koshk_skate_test --check
```

The verifier creates only absent, fixed disposable names: `koshk_skate_migration_verify_fresh`, `koshk_skate_migration_verify_upgrade`, and `koshk_skate_migration_verify_aligned`. It refuses pre-existing targets and requires its ownership token before cleanup. The verifier refuses the development and shared test database as verification targets. Repair CLIs allow only the shared test name and those three disposable names. Activation smoke checks the disposable name before importing the application connection.

For a reviewed partial test database, keep other clients idle, inspect `--check`, then use the corresponding command with `--apply` only under the authorized repair scope. Run `--check` again to verify registration and zero remaining statements. Existing `fix_migrations.mjs` and `apply_missing_tables.mjs` are not the supported repair path.

MySQL DDL commits independently. Failure can leave additive partial state; retain it for validated forward recovery. Never drop/recreate tables or insert a guessed hash to make a migration appear complete. No journal entry is written until all schema and history checks pass. No destructive down migration or activation-disable switch is supplied; code rollback cannot reverse custody or authorize deletion of financial history.

## Verification results

Final run: `npm run db:verify`, exit 0, all 15 cases PASS. Local ignored evidence: `tmp/sub-treasury-migration/cd814c7b-82ee-4dae-9f51-36dcd6081767/results.json`.

| Case | Result |
|---|---|
| Unsafe/dev/shared-test verifier targets | Rejected before connection. |
| Pre-existing disposable target | Preserved; replacement refused. |
| Official fresh migration through 0020 and repeat | 21 journal entries; repeat succeeds. |
| Current seed on latest schema | Repeatable; 169 existing rows preserved. |
| New item-table FK and primary-key constraints | Invalid rows rejected. |
| Fresh activation | Independent cash/electronic accounts remain `0.00`; no duplicate activation audit; 191 pre-existing rows preserved. |
| Populated legacy upgrade through 0020 | All 22 original rows/null links preserved; zero invented rental items. |
| Legacy upgrade through latest 0021 | 22 migrations; 22 original rows preserved; approved permission rows only added. |
| Legacy-upgraded activation | Independent accounts remain `0.00`; no duplicate activation audit; 190 pre-existing rows preserved. |
| Partial 0020 repair | Six missing statements applied; 23 original rows preserved; exact canonical hash recorded. |
| Incompatible existing column | Rejected before DDL/journaling. |
| Fully aligned unjournaled 0020 | Validated and registered without DDL; 23 original rows preserved. |
| Prior journal mismatch | Rejected without fabricated metadata. |
| Partial 0021 recovery | 19 missing statements applied; 23 original rows preserved; retry is a no-op. |
| Disposable cleanup | Only verifier-owned databases removed; development/shared-test untouched by verifier. |

Standalone TypeScript validation passed, including activation verification:

```powershell
npx tsc --noEmit --skipLibCheck --esModuleInterop --target ES2022 --module commonjs scripts/migration-0020.ts scripts/migration-0021.ts scripts/repair-migration-0020.ts scripts/repair-migration-0021.ts scripts/verify-migrations.ts scripts/verify-treasury-activation.ts
```

### Failures found and corrected

The first seed check ran current application code against schema 0020; the verifier now seeds the latest journal schema and builds legacy fixtures from raw baseline 0019. The first 0021 application hit an auto-generated 65-character transfer destination FK name. The schema, SQL and snapshot now use the explicit short name above. Boolean-default and escaped generated-expression metadata normalization defects in the recovery validator were corrected and verified on disposable databases before shared-test recovery.

The first shared-test 0021 attempt left an additive DDL prefix and no 0021 journal entry. Review confirmed no permission/configuration DML had been reached. With the shared test database idle, the authorized repair applied 19 missing statements, recorded the canonical hash, and preserved all 7,558 original rows from the pre-repair snapshot. Its reported historical digest was `a60c723fd88486752ce62eb607ed4f398ffb6f230c989e4890e303883635cd08`. A final check reported `recorded: true` and zero statements. The earlier 0020 alignment check/apply required zero statements and preserved the same row count.

No independent digest was captured before the first failed shared-test 0021 attempt. Therefore the shared recovery preservation claim starts after that failure and before repair; it is supplemented by the schema-only prefix review and complete fresh/legacy disposable verification, not an invented pre-attempt comparison.

## Remaining boundaries

Only dedicated test/disposable databases were written. Production/development execution and operational cutover are not part of this run. Historical reconstruction, real opening cash allocation and physical verification of funds are not performed. Owner configuration and reviewed forward migration remain necessary for another environment. Broader application and UI verification is reported in the parent CR; migration success alone does not establish whole-feature correctness.
