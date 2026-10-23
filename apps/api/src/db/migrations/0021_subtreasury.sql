CREATE TABLE `financial_operations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_id` int NOT NULL,
	`scope` varchar(64) NOT NULL,
	`operation_key` varchar(100) NOT NULL,
	`request_hash` varchar(64) NOT NULL,
	`result` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `financial_operations_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_operation_key_unique` UNIQUE(`actor_id`,`scope`,`operation_key`)
);
--> statement-breakpoint
CREATE TABLE `treasury_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`account_id` int NOT NULL,
	`cashier_id` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`assigned_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treasury_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `treasury_assignment_account_unique` UNIQUE(`account_id`),
	CONSTRAINT `treasury_assignment_cashier_unique` UNIQUE(`cashier_id`)
);
--> statement-breakpoint
CREATE TABLE `treasury_configuration` (
	`id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`main_account_id` int,
	`activated_by` int,
	`activated_at` timestamp,
	CONSTRAINT `treasury_configuration_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treasury_funding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignment_id` int NOT NULL,
	`cashier_id` int NOT NULL,
	`source_account_id` int NOT NULL,
	`destination_account_id` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reason` varchar(1000) NOT NULL,
	`status` enum('pending','accepted','cancelled') NOT NULL DEFAULT 'pending',
	`created_by` int NOT NULL,
	`accepted_by` int,
	`accepted_at` timestamp,
	`cancelled_by` int,
	`cancelled_at` timestamp,
	`cancellation_reason` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treasury_funding_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `treasury_handovers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shift_id` int NOT NULL,
	`attempt` int NOT NULL DEFAULT 1,
	`replaces_id` int,
	`account_id` int NOT NULL,
	`cashier_id` int NOT NULL,
	`expected_balance` decimal(12,2) NOT NULL,
	`expected_ledger_balance` decimal(12,2) NOT NULL,
	`actual_balance` decimal(12,2) NOT NULL,
	`declared_amount` decimal(12,2) NOT NULL,
	`difference` decimal(12,2) NOT NULL,
	`reason` varchar(1000) NOT NULL,
	`status` enum('pending','rejected','confirmed','zero_acknowledged') NOT NULL DEFAULT 'pending',
	`received_amount` decimal(12,2),
	`reviewed_by` int,
	`reviewed_at` timestamp,
	`review_reason` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treasury_handovers_id` PRIMARY KEY(`id`),
	CONSTRAINT `treasury_handover_shift_attempt` UNIQUE(`shift_id`,`attempt`)
);
--> statement-breakpoint
CREATE TABLE `treasury_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shift_id` int NOT NULL,
	`handover_id` int NOT NULL,
	`transfer_id` int,
	`received_amount` decimal(12,2) NOT NULL,
	`adjustment_amount` decimal(12,2) NOT NULL,
	`confirmed_by` int NOT NULL,
	`variance_approved_by` int,
	`reason` varchar(1000) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treasury_settlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `treasury_settlement_shift_unique` UNIQUE(`shift_id`),
	CONSTRAINT `treasury_settlement_handover_unique` UNIQUE(`handover_id`)
);
--> statement-breakpoint
CREATE TABLE `treasury_transfers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_account_id` int NOT NULL,
	`destination_account_id` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`kind` enum('funding','handover') NOT NULL,
	`handover_id` int,
	`funding_id` int,
	`confirmed_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `treasury_transfers_id` PRIMARY KEY(`id`),
	CONSTRAINT `treasury_transfer_handover_unique` UNIQUE(`handover_id`),
	CONSTRAINT `treasury_transfer_funding_unique` UNIQUE(`funding_id`)
);
--> statement-breakpoint
ALTER TABLE `treasury_movements` MODIFY COLUMN `amount` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `treasury_movements` MODIFY COLUMN `reference_type` enum('rental_payment','rental_refund','late_fee_payment','damage_charge_payment','expense','sale_payment','sale_refund','maintenance_payment','other','treasury_transfer','treasury_variance') NOT NULL;--> statement-breakpoint
ALTER TABLE `cashier_shifts` MODIFY COLUMN `opening_balance` decimal(12,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `cashier_shifts` MODIFY COLUMN `expected_balance` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cashier_shifts` MODIFY COLUMN `actual_balance` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cashier_shifts` MODIFY COLUMN `difference` decimal(12,2);--> statement-breakpoint
ALTER TABLE `rental_payments` ADD `treasury_account_id` int;--> statement-breakpoint
ALTER TABLE `treasury_accounts` ADD `account_role` varchar(30) DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `treasury_movements` ADD `transfer_id` int;--> statement-breakpoint
ALTER TABLE `treasury_movements` ADD `transfer_leg` enum('in','out');--> statement-breakpoint
ALTER TABLE `treasury_movements` ADD `cash_snapshot` boolean;--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD `treasury_account_id` int;--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD `assignment_id` int;--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD `business_date` varchar(10);--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD `opening_ledger_balance` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD `expected_ledger_balance` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD `closed_by` int;--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD `declared_amount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD `active_cashier_id` int GENERATED ALWAYS AS (CASE WHEN status = 'active' AND treasury_account_id IS NOT NULL THEN cashier_id ELSE NULL END) STORED;--> statement-breakpoint
ALTER TABLE `treasury_movements` ADD CONSTRAINT `treasury_movement_transfer_leg_unique` UNIQUE(`transfer_id`,`transfer_leg`);--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD CONSTRAINT `cashier_shift_managed_active_unique` UNIQUE(`active_cashier_id`);--> statement-breakpoint
ALTER TABLE `financial_operations` ADD CONSTRAINT `financial_operations_actor_id_users_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_assignments` ADD CONSTRAINT `treasury_assignments_account_id_treasury_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_assignments` ADD CONSTRAINT `treasury_assignments_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_assignments` ADD CONSTRAINT `treasury_assignments_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_configuration` ADD CONSTRAINT `treasury_configuration_main_account_id_treasury_accounts_id_fk` FOREIGN KEY (`main_account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_configuration` ADD CONSTRAINT `treasury_configuration_activated_by_users_id_fk` FOREIGN KEY (`activated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_funding` ADD CONSTRAINT `treasury_funding_assignment_id_treasury_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `treasury_assignments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_funding` ADD CONSTRAINT `treasury_funding_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_funding` ADD CONSTRAINT `treasury_funding_source_account_id_treasury_accounts_id_fk` FOREIGN KEY (`source_account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_funding` ADD CONSTRAINT `treasury_funding_destination_account_id_treasury_accounts_id_fk` FOREIGN KEY (`destination_account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_funding` ADD CONSTRAINT `treasury_funding_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_funding` ADD CONSTRAINT `treasury_funding_accepted_by_users_id_fk` FOREIGN KEY (`accepted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_funding` ADD CONSTRAINT `treasury_funding_cancelled_by_users_id_fk` FOREIGN KEY (`cancelled_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_handovers` ADD CONSTRAINT `treasury_handovers_shift_id_cashier_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_handovers` ADD CONSTRAINT `treasury_handovers_account_id_treasury_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_handovers` ADD CONSTRAINT `treasury_handovers_cashier_id_users_id_fk` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_handovers` ADD CONSTRAINT `treasury_handovers_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_settlements` ADD CONSTRAINT `treasury_settlements_shift_id_cashier_shifts_id_fk` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_settlements` ADD CONSTRAINT `treasury_settlements_handover_id_treasury_handovers_id_fk` FOREIGN KEY (`handover_id`) REFERENCES `treasury_handovers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_settlements` ADD CONSTRAINT `treasury_settlements_transfer_id_treasury_transfers_id_fk` FOREIGN KEY (`transfer_id`) REFERENCES `treasury_transfers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_settlements` ADD CONSTRAINT `treasury_settlements_confirmed_by_users_id_fk` FOREIGN KEY (`confirmed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_settlements` ADD CONSTRAINT `treasury_settlements_variance_approved_by_users_id_fk` FOREIGN KEY (`variance_approved_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_transfers` ADD CONSTRAINT `treasury_transfers_source_account_id_treasury_accounts_id_fk` FOREIGN KEY (`source_account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_transfers` ADD CONSTRAINT `treasury_transfer_destination_fk` FOREIGN KEY (`destination_account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_transfers` ADD CONSTRAINT `treasury_transfers_handover_id_treasury_handovers_id_fk` FOREIGN KEY (`handover_id`) REFERENCES `treasury_handovers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_transfers` ADD CONSTRAINT `treasury_transfers_funding_id_treasury_funding_id_fk` FOREIGN KEY (`funding_id`) REFERENCES `treasury_funding`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `treasury_transfers` ADD CONSTRAINT `treasury_transfers_confirmed_by_users_id_fk` FOREIGN KEY (`confirmed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `treasury_funding_cashier_status` ON `treasury_funding` (`cashier_id`,`status`);--> statement-breakpoint
CREATE INDEX `treasury_handover_status` ON `treasury_handovers` (`status`,`created_at`);--> statement-breakpoint
ALTER TABLE `rental_payments` ADD CONSTRAINT `rental_payments_treasury_account_id_treasury_accounts_id_fk` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD CONSTRAINT `cashier_shifts_closed_by_users_id_fk` FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `treasury_movement_account` ON `treasury_movements` (`treasury_account_id`);--> statement-breakpoint
CREATE INDEX `treasury_movement_shift` ON `treasury_movements` (`shift_id`);
--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD CONSTRAINT `cashier_shifts_treasury_account_id_treasury_accounts_id_fk` FOREIGN KEY (`treasury_account_id`) REFERENCES `treasury_accounts`(`id`) ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE `cashier_shifts` ADD CONSTRAINT `cashier_shifts_assignment_id_treasury_assignments_id_fk` FOREIGN KEY (`assignment_id`) REFERENCES `treasury_assignments`(`id`) ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE `treasury_movements` ADD CONSTRAINT `treasury_movements_transfer_id_treasury_transfers_id_fk` FOREIGN KEY (`transfer_id`) REFERENCES `treasury_transfers`(`id`) ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE `treasury_handovers` ADD CONSTRAINT `treasury_handovers_replaces_id_treasury_handovers_id_fk` FOREIGN KEY (`replaces_id`) REFERENCES `treasury_handovers`(`id`) ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
INSERT INTO treasury_configuration(id,enabled) VALUES(1,0);

--> statement-breakpoint
INSERT IGNORE INTO permissions (`key`,label_ar,module) VALUES ('treasury.view_own','عرض خزينتي','treasury'),('treasury.assign','تعيين الخزائن وتفعيلها','treasury'),('treasury.fund','تمويل الخزائن','treasury'),('treasury.handovers.view','مراجعة تسليم الخزائن','treasury'),('treasury.handovers.confirm','تأكيد استلام الخزائن','treasury'),('treasury.reconcile','اعتماد فروق النقدية','treasury'),('shifts.view_all','عرض جميع الورديات','shifts'),('expenses.view_all','عرض جميع المصروفات','expenses');

--> statement-breakpoint
INSERT IGNORE INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.name='Administrator' AND r.is_system=1 AND p.`key` IN ('treasury.view_own','treasury.assign','treasury.fund','treasury.handovers.view','treasury.handovers.confirm','treasury.reconcile','shifts.view_all','expenses.view_all');

--> statement-breakpoint
INSERT IGNORE INTO role_permissions(role_id,permission_id) SELECT rp.role_id,pnew.id FROM role_permissions rp JOIN permissions pold ON pold.id=rp.permission_id CROSS JOIN permissions pnew WHERE pold.`key`='treasury.manage' AND pnew.`key` IN ('treasury.view_own','treasury.assign','treasury.fund','treasury.handovers.view','treasury.handovers.confirm','treasury.reconcile','shifts.view_all','expenses.view_all');

--> statement-breakpoint
INSERT IGNORE INTO role_permissions(role_id,permission_id) SELECT rp.role_id,pnew.id FROM role_permissions rp JOIN permissions pold ON pold.id=rp.permission_id CROSS JOIN permissions pnew WHERE pold.`key`='shifts.manage' AND pnew.`key`='treasury.view_own';
