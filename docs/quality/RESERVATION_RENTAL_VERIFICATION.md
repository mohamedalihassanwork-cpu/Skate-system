# Reservation execution verification — 2026-10-24

**Status:** TESTED — focused automated/backend and synthetic browser verification passed.
**Scope:** [Approved repair](../decisions/RESERVATION_RENTAL_WORKFLOW_CR.md).

## Executed checks

| Check | Actual result |
|---|---|
| Baseline `npm.cmd test -- src/tests/reservations.test.ts` | 4 passed / 2 failed. Both integration failures sent obsolete `skateId`/payment-at-start data and failed before exercising current reservation behavior. |
| Baseline API/web builds | PASS |
| Migration generation | PASS; only nullable unique rental-to-reservation FK and metadata generated. |
| `DB_NAME=koshk_skate_test npm.cmd run db:migrate:test` (PowerShell environment assignment) | PASS; migration applied only to isolated test DB. |
| First repaired reservation suite | 24 passed / 2 failed. Failures exposed premature lazy expiry from MySQL local `NOW()` vs UTC booking storage; corrected and superseded by the final run below. |
| Final `npm.cmd test -- src/tests/reservations.test.ts` | **29/29 PASS** after UTC correction. Includes HTTP 401/403, execution without duration, full derived duration/timestamp separation, eligibility/binding, every-skate overlaps, observed competing row-lock races, audit rollback, FK/uniqueness/null links, partial returns and actual-duration split-payment finalization. |
| `npm.cmd test -- src/tests/subtreasury-producers.test.ts` | **20/20 PASS**. Existing financial-producer regressions include ordinary rental start/extension/return/cancel, closed-session rejection, split finalization and concurrent financial posting. |
| `npm.cmd run db:verify` | **15/15 PASS**, exit 0. Fresh install/seed, latest 23-entry journal upgrade, historical-row preservation, migration repeatability and owned-database cleanup. Uses disposable verification databases; development/shared test databases untouched by this verifier. |
| API build after implementation/UTC fix | PASS. An initial optional-ID TypeScript narrowing error was corrected before this passing build. |
| Web `npm.cmd run build` | PASS; existing dynamic-import/large-chunk warnings remain. |
| Web `npm.cmd run lint` | Exit 0; warnings remain. |
| `python tests/reservation_rental_ui.py` | 40 checks PASS. Chrome with mocked API only; desktop/tablet/phone/landscape (1440×900, 820×1180, 375×812, 667×375). Direct review, inherited full duration, separate booking window, request shape, error/retry, stale-route reset and walk-in duration flow checked. |

## Test isolation and evidence

- API connection guard rejects `NODE_ENV=test` unless DB name is exactly `koshk_skate_test`. New fixtures additionally verify `SELECT DATABASE()`, generate unique records, remove only owned fixtures and restore treasury configuration.
- Read-only clock check confirmed `NOW()` three hours ahead of `UTC_TIMESTAMP()` with session `SYSTEM` / Egypt Daylight Time. This is why UTC expiry must be explicit.
- Browser requests are all intercepted. Mocked POST payload checks are not a live API/browser integration claim. Screenshots/results are generated under `tmp/reservation-rental-ui/`.
- Initial browser harness failures (StrictMode repeated requests and hidden responsive duplicate controls) were fixed; the successful run above supersedes them.
- Migration-verifier evidence: `tmp/sub-treasury-migration/edc5717e-d52d-4c0a-b21a-f101f7e6ef53/results.json`. New link FK/uniqueness/multiple-null behavior was separately exercised in the 29-case workflow suite.
- Desktop and phone review screenshots were visually inspected; original booking fields are readable and distinct from actual-start guidance, without horizontal overflow. Action reachability was checked at all four widths.

## Verification limits

- Development database migration and a live cashier browser transaction have not been performed.
- Historical Phase 05 rental/Phase 07 return suites use obsolete single-skate fixture/API contracts; their old recorded passing counts are not current evidence. Current item-level regression results will be recorded here explicitly.
- No production deployment. Repository-wide unrelated checks are not implied by focused suite results.

## Files changed

| Area | Files | Purpose |
|---|---|---|
| Rental backend | `apps/api/src/modules/rentals/rentals.service.ts`, `rentals.types.ts`, `rentals.routes.ts` | Derived booking duration, validation/fulfillment/link/audit, occupancy checks, optional reserved-request duration and linked response. |
| Reservation backend | `apps/api/src/modules/reservations/reservations.service.ts`, `reservations.types.ts` | UTC expiry, locked edit checks, active rental occupancy protection and reverse link. |
| Database | `apps/api/src/db/schema/rentals.ts`, `apps/api/src/db/migrations/0022_reservation_rental_link.sql`, `meta/0022_snapshot.json`, `meta/_journal.json` | Additive nullable unique FK and generated migration metadata. |
| Frontend | `apps/web/src/modules/rentals/RentalPOSPage.tsx`, `rentals.service.ts`; `apps/web/src/modules/reservations/reservations.service.ts` | Direct review, booked/actual-time explanation, loading/error/retry, stale request protection and DTO contracts. |
| Tests | `apps/api/src/tests/reservations.test.ts`, `tests/reservation_rental_ui.py` | Current real-database/HTTP/concurrency/financial tests and synthetic browser checks. |
| Current documentation | `docs/modules/RESERVATIONS.md`, `docs/modules/RENTALS.md`, `docs/phases/PHASE_10_RESERVATIONS.md`, `docs/architecture/API_ARCHITECTURE.md`, `docs/architecture/DATABASE_ARCHITECTURE.md` | Current behavior and distinction from historical single-skate specs. |
| Governance/delivery | `docs/decisions/DECISION_LOG.md`, `docs/decisions/RESERVATION_RENTAL_WORKFLOW_CR.md`, `docs/PROJECT_STATE.md`, `docs/PROJECT_MAP.md`, `docs/CHANGELOG.md`, this report | Owner decision, root causes, implementation scope, navigation and actual checks. |

The pre-existing untracked `tests/subtreasury_ui.py` was not modified or included in this change. Generated verification artifacts remain under ignored `tmp/`.

## Owner decisions and Git delivery

- Required timing choice resolved: full booked duration from actual server start. No further business decision blocks this repair.
- Earlier multi-skate approval artifact remains absent from the repository. The current request explicitly preserves that model; no historical billing rule was silently restored.
- The repository requires one logical commit for a verified repair (`AI_AGENT_RULES.md` Rule 9). The exact local commit hash and push status are reported in the delivery message. No push or deployment is part of this delivery.
