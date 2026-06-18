CREATE TABLE `day_plan` (
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`plan_date` integer NOT NULL,
	`start_time` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `task_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_day_plan_user_date` ON `day_plan` (`user_id`,`plan_date`);