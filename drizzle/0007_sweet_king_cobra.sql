CREATE TABLE `habit_day_plan` (
	`user_id` text NOT NULL,
	`habit_id` text NOT NULL,
	`plan_date` integer NOT NULL,
	`start_time` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `habit_id`, `plan_date`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_habit_day_plan_user_date` ON `habit_day_plan` (`user_id`,`plan_date`);--> statement-breakpoint
CREATE TABLE `habit_markers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`habit_id` text NOT NULL,
	`date` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_habit_markers_user_date` ON `habit_markers` (`user_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_habit_markers_habit_date` ON `habit_markers` (`habit_id`,`date`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`importance` integer DEFAULT 3 NOT NULL,
	`cadence` text DEFAULT 'daily' NOT NULL,
	`active_days` text,
	`estimate_min` integer DEFAULT 30 NOT NULL,
	`color` text,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `recurring_day_plan` (
	`user_id` text NOT NULL,
	`recurring_task_id` text NOT NULL,
	`plan_date` integer NOT NULL,
	`start_time` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `recurring_task_id`, `plan_date`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recurring_task_id`) REFERENCES `recurring_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_recurring_day_plan_user_date` ON `recurring_day_plan` (`user_id`,`plan_date`);--> statement-breakpoint
CREATE TABLE `recurring_markers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`recurring_task_id` text NOT NULL,
	`date` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`spawned_task_id` text,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recurring_task_id`) REFERENCES `recurring_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spawned_task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_recurring_markers_user_date` ON `recurring_markers` (`user_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recurring_markers_task_date` ON `recurring_markers` (`recurring_task_id`,`date`);--> statement-breakpoint
CREATE TABLE `recurring_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`project_id` text,
	`importance` integer DEFAULT 3 NOT NULL,
	`cadence` text NOT NULL,
	`active_days` text,
	`recurrence_rule` text,
	`recurrence_ends_at` integer,
	`estimate_min` integer DEFAULT 30 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_day_plan` (
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`strategy_id` text,
	`plan_date` integer NOT NULL,
	`start_time` integer NOT NULL,
	`duration_min` integer DEFAULT 30 NOT NULL,
	`session_type` text DEFAULT 'focused' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `task_id`, `plan_date`, `start_time`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`strategy_id`) REFERENCES `scheduling_strategies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_day_plan`("user_id", "task_id", "strategy_id", "plan_date", "start_time", "duration_min", "session_type", "created_at", "updated_at") SELECT "user_id", "task_id", "strategy_id", "plan_date", "start_time", "duration_min", "session_type", "created_at", "updated_at" FROM `day_plan`;--> statement-breakpoint
DROP TABLE `day_plan`;--> statement-breakpoint
ALTER TABLE `__new_day_plan` RENAME TO `day_plan`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_day_plan_user_date` ON `day_plan` (`user_id`,`plan_date`);--> statement-breakpoint
CREATE INDEX `idx_day_plan_task` ON `day_plan` (`task_id`);--> statement-breakpoint
ALTER TABLE `day_logs` ADD `habits_completed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `day_logs` ADD `habits_missed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `day_logs` ADD `recurrings_completed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `day_logs` ADD `recurrings_missed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `preferences` ADD `streak_threshold` integer DEFAULT 75 NOT NULL;