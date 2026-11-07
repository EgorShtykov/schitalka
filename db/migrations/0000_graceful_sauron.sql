CREATE TABLE `competition_answers` (
	`roomId` varchar(36) NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`taskIndex` int NOT NULL,
	`answer` varchar(64) NOT NULL,
	`correct` boolean NOT NULL,
	`timeMs` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `competition_answers_roomId_userId_taskIndex_pk` PRIMARY KEY(`roomId`,`userId`,`taskIndex`)
);
--> statement-breakpoint
CREATE TABLE `competition_players` (
	`roomId` varchar(36) NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`name` varchar(255) NOT NULL,
	`correct` int NOT NULL DEFAULT 0,
	`answered` int NOT NULL DEFAULT 0,
	`totalTimeMs` int NOT NULL DEFAULT 0,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `competition_players_roomId_userId_pk` PRIMARY KEY(`roomId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `competition_rooms` (
	`id` varchar(36) NOT NULL,
	`code` varchar(8) NOT NULL,
	`hostUserId` bigint unsigned NOT NULL,
	`grade` int NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`status` enum('lobby','active','finished') NOT NULL DEFAULT 'lobby',
	`taskCount` int NOT NULL DEFAULT 10,
	`durationSec` int NOT NULL DEFAULT 90,
	`tasksJson` text,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `competition_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `competition_rooms_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `plus_ledger` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`kind` varchar(24) NOT NULL,
	`refId` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plus_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `plus_ledger_user_kind_ref_unique` UNIQUE(`userId`,`kind`,`refId`)
);
--> statement-breakpoint
CREATE TABLE `processed_attempts` (
	`userId` bigint unsigned NOT NULL,
	`attemptId` varchar(36) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processed_attempts_userId_attemptId_pk` PRIMARY KEY(`userId`,`attemptId`)
);
--> statement-breakpoint
CREATE TABLE `purchased_themes` (
	`userId` bigint unsigned NOT NULL,
	`themeId` varchar(40) NOT NULL,
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchased_themes_userId_themeId_pk` PRIMARY KEY(`userId`,`themeId`)
);
--> statement-breakpoint
CREATE TABLE `spark_ledger` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`kind` varchar(32) NOT NULL,
	`refId` varchar(100) NOT NULL,
	`amount` int NOT NULL,
	`note` varchar(255),
	`createdBy` bigint unsigned,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spark_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `spark_ledger_unique_entry` UNIQUE(`userId`,`kind`,`refId`)
);
--> statement-breakpoint
CREATE TABLE `student_stats` (
	`userId` bigint unsigned NOT NULL,
	`grade` int NOT NULL DEFAULT 4,
	`solved` int NOT NULL DEFAULT 0,
	`attempts` int NOT NULL DEFAULT 0,
	`firstTry` int NOT NULL DEFAULT 0,
	`streak` int NOT NULL DEFAULT 0,
	`bestStreak` int NOT NULL DEFAULT 0,
	`plusBalance` int NOT NULL DEFAULT 0,
	`sparkBalance` int NOT NULL DEFAULT 0,
	`selectedTheme` varchar(40) NOT NULL DEFAULT 'classic',
	`migratedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_stats_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE TABLE `topic_progress` (
	`userId` bigint unsigned NOT NULL,
	`topicId` varchar(80) NOT NULL,
	`solved` int NOT NULL DEFAULT 0,
	`attempts` int NOT NULL DEFAULT 0,
	`firstTry` int NOT NULL DEFAULT 0,
	`masterySolved` int NOT NULL DEFAULT 0,
	`masteryAttempts` int NOT NULL DEFAULT 0,
	`masteryFirstTry` int NOT NULL DEFAULT 0,
	`rewarded` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `topic_progress_userId_topicId_pk` PRIMARY KEY(`userId`,`topicId`)
);
--> statement-breakpoint
CREATE TABLE `trophies` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`userId` bigint unsigned NOT NULL,
	`roomId` varchar(36) NOT NULL,
	`place` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trophies_id` PRIMARY KEY(`id`),
	CONSTRAINT `trophies_unique_entry` UNIQUE(`userId`,`roomId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`unionId` varchar(255) NOT NULL,
	`name` varchar(255),
	`email` varchar(320),
	`avatar` text,
	`passwordHash` varchar(255),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSignInAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_unionId_value_unique` UNIQUE(`unionId`)
);
--> statement-breakpoint
ALTER TABLE `competition_answers` ADD CONSTRAINT `competition_answers_roomId_competition_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `competition_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_answers` ADD CONSTRAINT `competition_answers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_players` ADD CONSTRAINT `competition_players_roomId_competition_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `competition_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_players` ADD CONSTRAINT `competition_players_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `competition_rooms` ADD CONSTRAINT `competition_rooms_hostUserId_users_id_fk` FOREIGN KEY (`hostUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plus_ledger` ADD CONSTRAINT `plus_ledger_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `processed_attempts` ADD CONSTRAINT `processed_attempts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchased_themes` ADD CONSTRAINT `purchased_themes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spark_ledger` ADD CONSTRAINT `spark_ledger_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spark_ledger` ADD CONSTRAINT `spark_ledger_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `student_stats` ADD CONSTRAINT `student_stats_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `topic_progress` ADD CONSTRAINT `topic_progress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trophies` ADD CONSTRAINT `trophies_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trophies` ADD CONSTRAINT `trophies_roomId_competition_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `competition_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `plus_ledger_unique_entry` ON `plus_ledger` (`userId`,`kind`,`refId`);--> statement-breakpoint
CREATE INDEX `users_unionId_unique` ON `users` (`unionId`);