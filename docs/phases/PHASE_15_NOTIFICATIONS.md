# Phase 15 — Notifications

**Status:** PARTIALLY VERIFIED
**Last updated:** 2026-10-03 (Gate 5.3 — Documentation Reconciliation)
**Reconciled by:** AI Agent (Gate 5.3)

---

> [!IMPORTANT]
> **Gate 5.3 Note:** The previous document had status PLANNED and contained only placeholder
> text. This is inaccurate. A functional notification polling system exists:
> backend service, route, API client, frontend NotificationBell component with polling
> and sound alerts — all discovered as existing implementation.
> Delivery mechanism decision (SSE vs WebSocket vs polling) has been resolved implicitly
> by the existing implementation using HTTP polling. The status is PARTIALLY VERIFIED.

---

## 1. Purpose

Alert cashiers and managers to rental expiry events (ENDING_SOON / EXPIRED) via an in-app
notification panel. Notifications are generated on-demand by polling the backend, which
queries all active rentals and computes time-based alert states.

**Evidence source:** `apps/api/src/modules/notifications/notifications.service.ts`,
`apps/api/src/modules/notifications/notifications.routes.ts`,
`apps/web/src/modules/notifications/notifications.api.ts`,
`apps/web/src/components/ui/NotificationBell.tsx`,
`apps/api/src/tests/notifications.test.ts`

---

## 2. Scope

### 2.1 Implemented (INFERRED FROM IMPLEMENTATION)

| Feature | Evidence |
|---|---|
| Backend notification service — computes alert states from active rentals | `notifications.service.ts` |
| `GET /api/v1/notifications` endpoint — returns current alert list | `notifications.routes.ts` |
| Frontend API client | `notifications.api.ts` |
| `NotificationBell` component — poll every 10s, badge count, expandable panel | `NotificationBell.tsx` |
| Sound alerts — 3 types (beep, chime, pulse) via Web Audio API | `NotificationBell.tsx` |
| Sound setting persisted in localStorage | `NotificationBell.tsx` |
| `notification_sound_enabled` setting from backend settings API | `NotificationBell.tsx` line 59-61 |
| Arabic notification text | `notifications.service.ts` textAr field |
| Live countdown timer in panel (1-second interval) | `NotificationBell.tsx` lines 96-105 |
| New notification deduplication (seenKeys ref) | `NotificationBell.tsx` lines 80-86 |

### 2.2 NOT Implemented

| Feature | Notes |
|---|---|
| SSE (Server-Sent Events) | No SSE implementation found |
| WebSocket delivery | No WebSocket implementation found |
| Persistent `notifications` DB table | No notifications schema table found — notifications are computed on-demand |
| Notification history / mark-as-read | Not implemented |
| Notifications for non-rental events | Only active rental expiry events are supported |

### 2.3 Delivery Mechanism

**Chosen mechanism: HTTP polling** (every 10 seconds, browser `setInterval`).
Evidence: `NotificationBell.tsx` line 98: `setInterval(fetchNotifications, 10000)`.

The prior documentation listed delivery mechanism as a pending decision. The implementation
has resolved this implicitly via polling. No SSE or WebSocket infrastructure was added.

> [!NOTE]
> OWNER DECISION PENDING: Whether HTTP polling is the final accepted delivery mechanism,
> or whether SSE/WebSocket should be implemented before production. See §12.

---

## 3. Business Requirements

| ID | Requirement | Evidence Source | Status |
|---|---|---|---|
| BR-P15-01 | Alert when rental is EXPIRED (past expectedEndAt) | `notifications.service.ts` remainingTime <= 0 | IMPLEMENTED — TESTED |
| BR-P15-02 | Alert when rental ENDING_SOON (within 75 seconds of end) | `notifications.service.ts` ENDING_SOON_WINDOW_SECONDS=75 | IMPLEMENTED — TESTED |
| BR-P15-03 | Alert includes customer name, skate code, expected end time | `notifications.service.ts` response shape | IMPLEMENTED — TESTED |
| BR-P15-04 | Endpoint requires `rentals.view` permission | `notifications.routes.ts` line 8 | IMPLEMENTED |
| BR-P15-05 | Arabic notification text | `notifications.service.ts` textAr field | IMPLEMENTED |
| BR-P15-06 | In-app notification panel in topbar | `NotificationBell.tsx` integrated in Topbar | IMPLEMENTED — NOT BROWSER-VERIFIED |
| BR-P15-07 | Badge showing count of current alerts | `NotificationBell.tsx` lines 118-132 | IMPLEMENTED — NOT BROWSER-VERIFIED |
| BR-P15-08 | Sound alert on new notifications (deduplication) | `NotificationBell.tsx` seenKeys ref | IMPLEMENTED — NOT BROWSER-VERIFIED |
| BR-P15-09 | Sound type configurable (beep/chime/pulse) | `NotificationBell.tsx` localStorage | IMPLEMENTED — NOT BROWSER-VERIFIED |
| BR-P15-10 | notification_sound_enabled setting | Settings API + `NotificationBell.tsx` | IMPLEMENTED — NOT BROWSER-VERIFIED |
| BR-P15-11 | Normal rentals (>75s remaining) not included | `notifications.service.ts` type=null | IMPLEMENTED — TESTED |

---

## 4. Functional Behavior

### 4.1 Backend Computation

`GET /api/v1/notifications`:
- Requires: authenticated + `rentals.view`
- Queries all `active` rentals with customer and skate joins
- For each: computes `remainingTime = (expectedEndAt - now) / 1000` (seconds)
- If `remainingTime <= 0` → type = `EXPIRED`
- If `remainingTime <= 75` → type = `ENDING_SOON`
- Otherwise → excluded
- Returns array of notification objects (may be empty)

**Stateless:** No notifications table, no persistence. Each call recomputes current state.

### 4.2 Frontend Polling

- `NotificationBell` component polls every 10 seconds
- `seenKeys` ref (in-memory) tracks `{rentalId}:{type}` pairs already seen
- Sound plays only for new notifications not previously seen
- 1-second `setInterval` updates countdown timers in the panel
- Panel expandable from topbar bell icon

---

## 5. Data Model

No dedicated `notifications` table. Reads from: `rentals`, `customers`, `skates`.

`ENDING_SOON_WINDOW_SECONDS = 75` (exported constant for testability).

---

## 6. API / Integration Surface

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/v1/notifications` | `rentals.view` | Compute and return current alert list |

---

## 7. Permissions

| Permission | Description | Evidence |
|---|---|---|
| `rentals.view` | Required to view notifications | `notifications.routes.ts` line 8 |

---

## 8. Testing

### 8.1 Test File

| File | Test Count | Coverage |
|---|---|---|
| `notifications.test.ts` | 4 tests | Auth, ENDING_SOON detection, EXPIRED detection, normal rental excluded |

### 8.2 Test Cases

| ID | Description | Status |
|---|---|---|
| TC-NOTIF-EMPTY | GET /notifications with no alerts returns empty array | TESTED |
| TC-NOTIF-ENDING-SOON | Active rental with 30s remaining → ENDING_SOON notification | TESTED |
| TC-NOTIF-EXPIRED | Active rental with -10s (past end) → EXPIRED notification | TESTED |
| TC-NOTIF-NORMAL | Active rental with 5 minutes remaining → excluded | TESTED |

### 8.3 Known Test Gaps

| Gap | Description | Risk |
|---|---|---|
| TC-NOTIF-RBAC | No test for cashier without rentals.view being blocked | LOW — middleware standard |
| TC-NOTIF-BROWSER | NotificationBell UI not browser-tested | MEDIUM |
| TC-NOTIF-SOUND | Sound playback not testable in automated tests | LOW |
| TC-NOTIF-POLLING | Polling interval behavior not tested | LOW |

---

## 9. Verification Matrix

| Requirement | Implementation | Test | Verification State | Source |
|---|---|---|---|---|
| EXPIRED detection | `notifications.service.ts` remainingTime <= 0 | TC-NOTIF-EXPIRED | TESTED | impl |
| ENDING_SOON detection (75s window) | `notifications.service.ts` ENDING_SOON_WINDOW_SECONDS=75 | TC-NOTIF-ENDING-SOON | TESTED | impl |
| Normal rental excluded | `notifications.service.ts` no type assigned | TC-NOTIF-NORMAL | TESTED | impl |
| Empty result when no alerts | `notifications.service.ts` returns empty array | TC-NOTIF-EMPTY | TESTED | impl |
| Arabic text (textAr) | `notifications.service.ts` textAr field | TC-NOTIF-ENDING-SOON (implicit) | TESTED | impl |
| NotificationBell UI | `NotificationBell.tsx` | None | IMPLEMENTED — BROWSER NOT VERIFIED | impl |
| Sound alerts | `NotificationBell.tsx` Web Audio API | None | IMPLEMENTED — BROWSER NOT VERIFIED | impl |
| Polling every 10s | `NotificationBell.tsx` setInterval 10000 | None | IMPLEMENTED — NOT VERIFIED | impl |
| Delivery mechanism decision | HTTP polling chosen implicitly | None | PENDING OWNER RATIFICATION (see §12) | impl |

---

## 10. Known Gaps / Risks

| ID | Description | Risk Level |
|---|---|---|
| G-P15-01 | HTTP polling adds backend load every 10s per active browser tab | MEDIUM |
| G-P15-02 | NotificationBell UI not browser-verified | MEDIUM |
| G-P15-03 | No notification persistence — history lost on page refresh | MEDIUM |
| G-P15-04 | `seenKeys` deduplication is in-memory only — resets on page reload | LOW |
| G-P15-05 | Sound alerts cannot be automated-tested | LOW |
| G-P15-06 | Only rental expiry events are supported — other event types not implemented | MEDIUM |

---

## 11. F-014 / UNK-005 Status

**UNK-005 (Delivery Mechanism Decision):**
The implementation has adopted HTTP polling. Whether this is the final accepted mechanism
or whether SSE/WebSocket is required for production is a pending owner decision.

Do NOT resolve this in Gate 5.3. Document as pending.

---

## 12. Owner Decisions

| ID | Decision | Status |
|---|---|---|
| UNK-005 | Notification delivery mechanism (SSE vs WebSocket vs polling) | PENDING OWNER RATIFICATION — implementation uses HTTP polling; production suitability not decided |
| NOTIF-SCOPE | Only active rental expiry events in scope for Phase 15 | INFERRED FROM IMPLEMENTATION |
| NOTIF-PERSIST | No persistence — compute-on-demand | INFERRED FROM IMPLEMENTATION |

---

## 13. Remediation History

| Event | Date | Description |
|---|---|---|
| Phase 15 Implementation | 2026-09-28 (approx) | Backend notifications service, route, and frontend NotificationBell implemented. Existing implementation discovered during Gate 5 audit — no pre-implementation spec existed. |
| Gate 5.3 | 2026-10-03 | PLANNED stub replaced with evidence-traceable specification. Delivery mechanism (HTTP polling) documented from implementation. Status set to PARTIALLY VERIFIED. UNK-005 preserved as pending. |

---

## 14. Current Status

**PARTIALLY VERIFIED**

Rationale:
- Backend notification computation: TESTED (4 tests — EXPIRED, ENDING_SOON, normal excluded)
- Frontend NotificationBell UI: IMPLEMENTED — BROWSER NOT VERIFIED
- Sound alerts: IMPLEMENTED — NOT VERIFIED (not testable automatically)
- Polling mechanism: IMPLEMENTED — delivery decision pending owner ratification
- No persistence design: INFERRED FROM IMPLEMENTATION
- Previous PLANNED status was inaccurate — functional implementation exists

---

## DESIGN SYSTEM INHERITANCE

> [!IMPORTANT]
> This section is mandatory per UI-011 (AI_AGENT_RULES.md).
> This phase inherits the current approved KOSHK design system.
> It MUST NOT introduce a separate visual language.

This phase inherits:
- **KOSHK Visual Design Reference** — brand identity
- **DESIGN_SYSTEM.md** — approved design tokens and UI standards
- **COMPONENT_LIBRARY.md** — approved reusable components
- **Approved UI Governance** (UI-001 through UI-011 — AI_AGENT_RULES.md)
- **Approved RTL behavior** (DEC-001)
- **Approved accessibility rules** (DESIGN_SYSTEM.md §11)
- **Approved responsive/mobile rules** (DESIGN_SYSTEM.md §16)
- **Approved semantic color system** (DEC-034, DEC-041)
- **Approved typography** (Cairo, design-system.css §3)
- **Approved currency formatting** — `formatCurrency()` from `utils/currency.ts` (DEC-042)
- **Approved component APIs** from the existing shared component library

---

*Last updated: 2026-10-03 (Gate 5.3 — Documentation Reconciliation. PLANNED stub replaced.
Status corrected from PLANNED to PARTIALLY VERIFIED. Implementation discovered: HTTP polling,
NotificationBell, 4 backend tests. UNK-005 preserved as pending owner decision.)*
