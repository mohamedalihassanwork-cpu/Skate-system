# Sales & POS Module
## Phase 11

The Sales & POS module provides a dedicated point-of-sale interface for selling products that are unrelated to rentals. This module leverages the existing treasury payment infrastructure developed in Phase 06 and RBAC implemented in Phase 02.

### Core Entities

- **Product**: Physical items available for sale (e.g. socks, beverages). Products have `stock_quantity` which must be `>= 0`.
- **ProductCategory**: Categorization for products to aid filtering in the POS interface.
- **Sale**: A finalized transaction representing products purchased by a customer.
- **SaleItem**: Individual products and quantities within a `Sale`.
- **SalePayment**: Payment records linked to a `Sale`.

### Permissions

- `products.view`: View products and categories.
- `products.manage`: Create, update, and manage products and categories, including direct stock adjustments.
- `sales.view`: View sales history.
- `sales.create`: Access the Sales POS and create new sales.
- `sales.cancel`: Cancel a completed sale and restore stock quantities.

### Business Logic

- **Strict Stock Enforcement**: Sales are rejected if any requested product quantity exceeds available `stock_quantity`.
- **Concurrency Protection**: The checkout process uses `SELECT ... FOR UPDATE` row-level locks on the `products` table to prevent race conditions from overselling.
- **Transaction Atomicity**: Creating a sale, deducting stock, and recording payments occur within a single database transaction. If any step fails, the entire transaction rolls back.
- **Cancellation**: Sales can be cancelled (by authorized users). Cancellation reverses payments (logs them back to the treasury as negative movements) and restores the exact product quantities back to the stock.
- **No Negative Stock**: Stock quantities are strictly prevented from falling below zero at the database level using `CHECK` constraints, application logic, and transaction locking.


## Approved sub-treasury integration — 2026-10-16

Managed sales and refunds use approved independent accounts: cash from the performing cashier’s active funded drawer, electronics from configured/original accounts. Persisted sale operation keys and required transactional audit prevent duplicate retries and partial writes. See Treasury and the verification report for current evidence.

Authority: [ST-01–06](../decisions/SUB_TREASURY_DAILY_CLOSING_CR.md). Current workflow: [Treasury](TREASURY.md). Executed checks and limits: [verification report](../quality/SUB_TREASURY_VERIFICATION.md). Earlier proposal/pending wording is historical and superseded only within this approved scope.
