-- Migration 0020: schema-only multi-skate prerequisite (ST-06, 2026-10-16).
-- Fresh databases: apply through Drizzle. Partially/already aligned databases:
-- run scripts/repair-migration-0020.ts metadata preflight before migration.
-- Historical rows, amounts, timestamps and nullable references remain unchanged.
-- No inferred rental items, rate/duration defaults, financial DML or settings DML.
-- started_at already exists in 0004 and must not be added or backfilled.

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
  CONSTRAINT `rental_items_rental_id_rentals_id_fk` FOREIGN KEY (`rental_id`) REFERENCES `rentals`(`id`),
  CONSTRAINT `rental_items_skate_id_skates_id_fk` FOREIGN KEY (`skate_id`) REFERENCES `skates`(`id`)
);
--> statement-breakpoint
CREATE INDEX `rental_items_rental_id_idx` ON `rental_items` (`rental_id`);
--> statement-breakpoint
CREATE INDEX `rental_items_skate_id_idx` ON `rental_items` (`skate_id`);
--> statement-breakpoint
CREATE INDEX `rental_items_status_idx` ON `rental_items` (`status`);
--> statement-breakpoint
CREATE INDEX `rental_items_expected_end_at_idx` ON `rental_items` (`expected_end_at`);
--> statement-breakpoint
CREATE TABLE `rental_item_extensions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `rental_item_id` int NOT NULL,
  `extended_by_minutes` int NOT NULL,
  `previous_expected_end_at` datetime NOT NULL,
  `new_expected_end_at` datetime NOT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `rental_item_extensions_id` PRIMARY KEY(`id`),
  CONSTRAINT `rental_item_extensions_rental_item_id_rental_items_id_fk` FOREIGN KEY (`rental_item_id`) REFERENCES `rental_items`(`id`),
  CONSTRAINT `rental_item_extensions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE INDEX `extensions_rental_item_id_idx` ON `rental_item_extensions` (`rental_item_id`);
--> statement-breakpoint
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
ALTER TABLE `rentals` ADD COLUMN `total_amount` decimal(10,2);
--> statement-breakpoint
ALTER TABLE `rentals` ADD COLUMN `completed_at` datetime;
--> statement-breakpoint
ALTER TABLE `rentals` MODIFY COLUMN `status` enum('active','completed','cancelled','returned') NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `rental_payments` ADD COLUMN `rental_item_id` int;
--> statement-breakpoint
ALTER TABLE `inspections` ADD COLUMN `rental_item_id` int;
--> statement-breakpoint
ALTER TABLE `late_fee_records` ADD COLUMN `rental_item_id` int;
