CREATE TABLE `skates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`skate_code` varchar(50) NOT NULL,
	`qr_code` varchar(255),
	`barcode` varchar(255),
	`size` varchar(20) NOT NULL,
	`type` varchar(50),
	`status` enum('available','rented','reserved','maintenance','damaged','lost') NOT NULL DEFAULT 'available',
	`condition` enum('good','fair','poor') NOT NULL DEFAULT 'good',
	`purchase_date` date,
	`purchase_cost` decimal(10,2),
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skates_id` PRIMARY KEY(`id`),
	CONSTRAINT `skates_skate_code_unique` UNIQUE(`skate_code`)
);
