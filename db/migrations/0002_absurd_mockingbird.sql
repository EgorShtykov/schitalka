CREATE TABLE `prize_claims` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`studentId` bigint unsigned NOT NULL,
	`prizeId` bigint unsigned NOT NULL,
	`cycleId` bigint unsigned NOT NULL,
	`title` varchar(120) NOT NULL,
	`priceSnapshot` int NOT NULL,
	`actualPrice` int,
	`status` enum('requested','approved','ordered','delivered','cancelled') NOT NULL DEFAULT 'requested',
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prize_claims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prize_goals` (
	`studentId` bigint unsigned NOT NULL,
	`prizeId` bigint unsigned NOT NULL,
	`chosenAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prize_goals_studentId` PRIMARY KEY(`studentId`)
);
--> statement-breakpoint
CREATE TABLE `prizes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`teacherId` bigint unsigned NOT NULL,
	`title` varchar(120) NOT NULL,
	`category` varchar(40) NOT NULL DEFAULT 'Разное',
	`emoji` varchar(8) NOT NULL DEFAULT '🎁',
	`price` int NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prizes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stipend_cycles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`studentId` bigint unsigned NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`homeworkCount` int NOT NULL DEFAULT 0,
	`bonusGranted` boolean NOT NULL DEFAULT false,
	`status` enum('active','completed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stipend_cycles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stipend_events` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`cycleId` bigint unsigned NOT NULL,
	`studentId` bigint unsigned NOT NULL,
	`kind` enum('homework_credit','cycle_bonus','prize_debit','refund') NOT NULL,
	`refId` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`note` varchar(255),
	`createdBy` bigint unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stipend_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `stipend_events_unique_entry` UNIQUE(`studentId`,`kind`,`refId`)
);
--> statement-breakpoint
CREATE TABLE `stipend_programs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`teacherId` bigint unsigned NOT NULL,
	`amountPerHomework` int NOT NULL DEFAULT 250,
	`cycleBonus` int NOT NULL DEFAULT 1000,
	`cycleWeeks` int NOT NULL DEFAULT 4,
	`homeworkPerWeek` int NOT NULL DEFAULT 2,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stipend_programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `stipend_programs_teacher_unique` UNIQUE(`teacherId`)
);
--> statement-breakpoint
ALTER TABLE `prize_claims` ADD CONSTRAINT `prize_claims_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prize_claims` ADD CONSTRAINT `prize_claims_prizeId_prizes_id_fk` FOREIGN KEY (`prizeId`) REFERENCES `prizes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prize_claims` ADD CONSTRAINT `prize_claims_cycleId_stipend_cycles_id_fk` FOREIGN KEY (`cycleId`) REFERENCES `stipend_cycles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prize_goals` ADD CONSTRAINT `prize_goals_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prize_goals` ADD CONSTRAINT `prize_goals_prizeId_prizes_id_fk` FOREIGN KEY (`prizeId`) REFERENCES `prizes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prizes` ADD CONSTRAINT `prizes_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stipend_cycles` ADD CONSTRAINT `stipend_cycles_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stipend_events` ADD CONSTRAINT `stipend_events_cycleId_stipend_cycles_id_fk` FOREIGN KEY (`cycleId`) REFERENCES `stipend_cycles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stipend_events` ADD CONSTRAINT `stipend_events_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stipend_events` ADD CONSTRAINT `stipend_events_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stipend_programs` ADD CONSTRAINT `stipend_programs_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `prize_claims_student_idx` ON `prize_claims` (`studentId`);--> statement-breakpoint
CREATE INDEX `prizes_teacher_idx` ON `prizes` (`teacherId`);--> statement-breakpoint
CREATE INDEX `stipend_cycles_student_status_idx` ON `stipend_cycles` (`studentId`,`status`);--> statement-breakpoint
CREATE INDEX `stipend_events_cycle_idx` ON `stipend_events` (`cycleId`);
