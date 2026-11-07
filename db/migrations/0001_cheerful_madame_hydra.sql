CREATE TABLE `ai_checks` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`submissionId` bigint unsigned NOT NULL,
	`teacherId` bigint unsigned NOT NULL,
	`status` enum('completed','failed') NOT NULL,
	`errorMessage` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `class_members` (
	`classId` bigint unsigned NOT NULL,
	`studentId` bigint unsigned NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `class_members_classId_studentId_pk` PRIMARY KEY(`classId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`teacherId` bigint unsigned NOT NULL,
	`name` varchar(40) NOT NULL,
	`grade` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classes_id` PRIMARY KEY(`id`),
	CONSTRAINT `classes_teacher_name_unique` UNIQUE(`teacherId`,`name`)
);
--> statement-breakpoint
CREATE TABLE `grade_entries` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`teacherId` bigint unsigned NOT NULL,
	`studentId` bigint unsigned NOT NULL,
	`classId` bigint unsigned,
	`submissionId` bigint unsigned,
	`grade` int NOT NULL,
	`comment` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `grade_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `grade_entries_submission_unique` UNIQUE(`submissionId`)
);
--> statement-breakpoint
CREATE TABLE `homework_assignments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`teacherId` bigint unsigned NOT NULL,
	`classId` bigint unsigned NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`dueAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `homework_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `homework_files` (
	`id` varchar(36) NOT NULL,
	`submissionId` bigint unsigned NOT NULL,
	`storageName` varchar(255) NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`contentType` varchar(40) NOT NULL,
	`size` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `homework_files_id` PRIMARY KEY(`id`),
	CONSTRAINT `homework_files_storageName_unique` UNIQUE(`storageName`)
);
--> statement-breakpoint
CREATE TABLE `homework_submissions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`assignmentId` bigint unsigned NOT NULL,
	`studentId` bigint unsigned NOT NULL,
	`textAnswer` text,
	`status` enum('submitted','reviewed','needs_revision') NOT NULL DEFAULT 'submitted',
	`teacherComment` text,
	`aiStatus` enum('idle','processing','completed','failed') NOT NULL DEFAULT 'idle',
	`aiReport` text,
	`aiConfidence` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `homework_submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `homework_submission_assignment_student_unique` UNIQUE(`assignmentId`,`studentId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `sessionVersion` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_checks` ADD CONSTRAINT `ai_checks_submissionId_homework_submissions_id_fk` FOREIGN KEY (`submissionId`) REFERENCES `homework_submissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ai_checks` ADD CONSTRAINT `ai_checks_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_members` ADD CONSTRAINT `class_members_classId_classes_id_fk` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `class_members` ADD CONSTRAINT `class_members_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classes` ADD CONSTRAINT `classes_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grade_entries` ADD CONSTRAINT `grade_entries_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grade_entries` ADD CONSTRAINT `grade_entries_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grade_entries` ADD CONSTRAINT `grade_entries_classId_classes_id_fk` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `grade_entries` ADD CONSTRAINT `grade_entries_submissionId_homework_submissions_id_fk` FOREIGN KEY (`submissionId`) REFERENCES `homework_submissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homework_assignments` ADD CONSTRAINT `homework_assignments_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homework_assignments` ADD CONSTRAINT `homework_assignments_classId_classes_id_fk` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homework_files` ADD CONSTRAINT `homework_files_submissionId_homework_submissions_id_fk` FOREIGN KEY (`submissionId`) REFERENCES `homework_submissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homework_submissions` ADD CONSTRAINT `homework_submissions_assignmentId_homework_assignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `homework_assignments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homework_submissions` ADD CONSTRAINT `homework_submissions_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_checks_teacher_created_idx` ON `ai_checks` (`teacherId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `class_members_student_idx` ON `class_members` (`studentId`);--> statement-breakpoint
CREATE INDEX `classes_teacher_idx` ON `classes` (`teacherId`);--> statement-breakpoint
CREATE INDEX `grade_entries_student_idx` ON `grade_entries` (`studentId`);--> statement-breakpoint
CREATE INDEX `grade_entries_teacher_idx` ON `grade_entries` (`teacherId`);--> statement-breakpoint
CREATE INDEX `homework_assignments_class_idx` ON `homework_assignments` (`classId`);--> statement-breakpoint
CREATE INDEX `homework_assignments_teacher_idx` ON `homework_assignments` (`teacherId`);--> statement-breakpoint
CREATE INDEX `homework_files_submission_idx` ON `homework_files` (`submissionId`);--> statement-breakpoint
CREATE INDEX `homework_submissions_student_idx` ON `homework_submissions` (`studentId`);--> statement-breakpoint
CREATE INDEX `homework_submissions_assignment_idx` ON `homework_submissions` (`assignmentId`);
