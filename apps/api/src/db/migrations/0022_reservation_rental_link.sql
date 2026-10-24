ALTER TABLE `rentals` ADD `reservation_id` int;--> statement-breakpoint
ALTER TABLE `rentals` ADD CONSTRAINT `rentals_reservation_id_unique` UNIQUE(`reservation_id`);--> statement-breakpoint
ALTER TABLE `rentals` ADD CONSTRAINT `rentals_reservation_id_reservations_id_fk` FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE no action ON UPDATE no action;