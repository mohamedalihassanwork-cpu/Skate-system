-- KOSHK SKATE ERP — Migration 0020
-- Phase 06 Redesign: Multi-Skate Rentals Domain Restructure
--
-- Changes:
--   1. Create rental_items table (per-skate billing unit)
--   2. Create rental_item_extensions table (extension audit trail)
--   3. Alter rentals table: add total_amount, completed_at, status 'completed'
--   4. Migrate historical data: create one rental_item per existing rental row
--   5. Alter rental_payments: add rental_item_id nullable FK
--   6. Alter inspections: add rental_item_id nullable FK
--
-- NOTE: Legacy columns on rentals (skate_id, duration_minutes, price_per_hour,
--   rental_amount, expected_end_at, returned_at) are kept nullable for
--   historical data reference. New rentals do not use them.

-- =============================================================================
-- 1. Create rental_items table
-- =============================================================================

CREATE TABLE `rental_items` (
  `id` int AUTO_INCREMENT NOT NULL,
  `rental_id` int NOT NULL,
  `skate_id` int NOT NULL,
  `started_at` datetime NOT NULL,
  `expected_duration_minutes` int NOT NULL,
  `expected_end_at` datetime NOT NULL,
  `returned_at` datetime,
  `actual_duration_minutes` int,
  `actual_amount` decimal(10,2),
  `price_per_hour` decimal(10,2) NOT NULL,
  `inspection_id` int,
  `status` enum('active','returned','cancelled') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `rental_items_id` PRIMARY KEY(`id`),
  CONSTRAINT `rental_items_rental_id_fk` FOREIGN KEY (`rental_id`) REFERENCES `rentals`(`id`),
  CONSTRAINT `rental_items_skate_id_fk` FOREIGN KEY (`skate_id`) REFERENCES `skates`(`id`)
);
--> statement-breakpoint
CREATE INDEX `rental_items_rental_id_idx` ON `rental_items` (`rental_id`);
--> statement-breakpoint
CREATE INDEX `rental_items_skate_id_idx` ON `rental_items` (`skate_id`);
--> statement-breakpoint
CREATE INDEX `rental_items_status_idx` ON `rental_items` (`status`);
--> statement-breakpoint
CREATE INDEX `rental_items_expected_end_at_idx` ON `rental_items` (`expected_end_at`);

-- =============================================================================
-- 2. Create rental_item_extensions table
-- =============================================================================

CREATE TABLE `rental_item_extensions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `rental_item_id` int NOT NULL,
  `extended_by_minutes` int NOT NULL,
  `previous_expected_end_at` datetime NOT NULL,
  `new_expected_end_at` datetime NOT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `rental_item_extensions_id` PRIMARY KEY(`id`),
  CONSTRAINT `rental_item_extensions_item_fk` FOREIGN KEY (`rental_item_id`) REFERENCES `rental_items`(`id`),
  CONSTRAINT `rental_item_extensions_user_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `extensions_rental_item_id_idx` ON `rental_item_extensions` (`rental_item_id`);

-- =============================================================================
-- 3. Alter rentals table: add new columns, make legacy columns nullable
-- =============================================================================

-- Make legacy single-skate columns nullable (they stay for historical data)
ALTER TABLE `rentals` MODIFY COLUMN `skate_id` int;
--> statement-breakpoint
ALTER TABLE `rentals` MODIFY COLUMN `duration_minutes` int;
--> statement-breakpoint
ALTER TABLE `rentals` MODIFY COLUMN `price_per_hour` decimal(10,2);
--> statement-breakpoint
ALTER TABLE `rentals` MODIFY COLUMN `rental_amount` decimal(10,2);
--> statement-breakpoint
ALTER TABLE `rentals` MODIFY COLUMN `expected_end_at` datetime;
--> statement-breakpoint

-- Add new columns for multi-skate model
ALTER TABLE `rentals` ADD COLUMN `total_amount` decimal(10,2);
--> statement-breakpoint
ALTER TABLE `rentals` ADD COLUMN `completed_at` datetime;
--> statement-breakpoint
ALTER TABLE `rentals` ADD COLUMN `started_at` datetime;
--> statement-breakpoint

-- Add 'completed' to status enum (keep 'returned' for migration compat)
ALTER TABLE `rentals` MODIFY COLUMN `status` enum('active','completed','cancelled','returned') NOT NULL DEFAULT 'active';

-- =============================================================================
-- 4. Populate started_at from created_at for existing rows (backfill)
-- =============================================================================

UPDATE `rentals` SET `started_at` = `created_at` WHERE `started_at` IS NULL;
--> statement-breakpoint

-- Make started_at NOT NULL after backfill
ALTER TABLE `rentals` MODIFY COLUMN `started_at` datetime NOT NULL;
--> statement-breakpoint

-- Populate total_amount from existing rental_amount for historical rows
UPDATE `rentals` SET `total_amount` = `rental_amount` WHERE `total_amount` IS NULL AND `rental_amount` IS NOT NULL;
--> statement-breakpoint

-- Mark completed_at for historical returned/completed rentals
UPDATE `rentals` SET `completed_at` = `returned_at` WHERE `status` = 'returned' AND `returned_at` IS NOT NULL AND `completed_at` IS NULL;
--> statement-breakpoint

-- Migrate status: 'returned' → 'completed' for historical rentals that have payments
-- (Keep returned for now; service layer handles both completed and returned as equivalent)

-- =============================================================================
-- 5. Create one rental_item per existing rental row (historical data migration)
-- =============================================================================

INSERT INTO `rental_items` (
  `rental_id`,
  `skate_id`,
  `started_at`,
  `expected_duration_minutes`,
  `expected_end_at`,
  `returned_at`,
  `actual_duration_minutes`,
  `actual_amount`,
  `price_per_hour`,
  `status`,
  `created_at`,
  `updated_at`
)
SELECT
  r.`id`,
  r.`skate_id`,
  COALESCE(r.`started_at`, r.`created_at`),
  COALESCE(r.`duration_minutes`, 60),
  COALESCE(r.`expected_end_at`, DATE_ADD(COALESCE(r.`started_at`, r.`created_at`), INTERVAL COALESCE(r.`duration_minutes`, 60) MINUTE)),
  r.`returned_at`,
  -- actual_duration_minutes: use duration_minutes for historical (actual not tracked before redesign)
  CASE
    WHEN r.`returned_at` IS NOT NULL AND r.`started_at` IS NOT NULL
    THEN GREATEST(1, CEIL(TIMESTAMPDIFF(SECOND, r.`started_at`, r.`returned_at`) / 60.0))
    ELSE r.`duration_minutes`
  END,
  -- actual_amount: use existing rental_amount as historical approximation
  r.`rental_amount`,
  COALESCE(r.`price_per_hour`, 120),
  -- map rental status to item status
  CASE r.`status`
    WHEN 'active' THEN 'active'
    WHEN 'returned' THEN 'returned'
    WHEN 'completed' THEN 'returned'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'returned'
  END,
  COALESCE(r.`started_at`, r.`created_at`),
  r.`updated_at`
FROM `rentals` r
WHERE r.`skate_id` IS NOT NULL;

-- =============================================================================
-- 6. Alter rental_payments: add rental_item_id nullable FK
-- =============================================================================

ALTER TABLE `rental_payments` ADD COLUMN `rental_item_id` int;
--> statement-breakpoint
ALTER TABLE `rental_payments` ADD CONSTRAINT `rental_payments_item_fk` FOREIGN KEY (`rental_item_id`) REFERENCES `rental_items`(`id`);

-- =============================================================================
-- 7. Alter inspections: add rental_item_id nullable FK
-- =============================================================================

ALTER TABLE `inspections` ADD COLUMN `rental_item_id` int;
--> statement-breakpoint
ALTER TABLE `inspections` ADD CONSTRAINT `inspections_item_fk` FOREIGN KEY (`rental_item_id`) REFERENCES `rental_items`(`id`);

-- =============================================================================
-- 8. Link existing inspection records to their migrated rental_items
-- =============================================================================

UPDATE `inspections` i
JOIN `rental_items` ri ON ri.`rental_id` = i.`rental_id`
SET i.`rental_item_id` = ri.`id`
WHERE i.`rental_id` IS NOT NULL AND i.`rental_item_id` IS NULL;

-- =============================================================================
-- 9. Add rental_grace_minutes setting (if not exists — handled by seed update)
-- =============================================================================

INSERT IGNORE INTO `settings` (`key`, `value`, `label_ar`)
VALUES ('rental_grace_minutes', '0', 'دقائق السماح للإيجار');
