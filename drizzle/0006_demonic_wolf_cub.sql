CREATE TABLE `scheduling_strategies` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`importance` integer DEFAULT 3 NOT NULL,
	`minutes_per_day` integer NOT NULL,
	`active_days` text NOT NULL,
	`preferred_start_date` integer NOT NULL,
	`deadline_at` integer,
	`is_flexible` integer DEFAULT false NOT NULL,
	`accepted_risk` integer DEFAULT false NOT NULL,
	`suggested_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scheduling_strategies_task_id_unique` ON `scheduling_strategies` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_strategies_task` ON `scheduling_strategies` (`task_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_day_plan` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`strategy_id` text,
	`plan_date` integer NOT NULL,
	`start_time` integer NOT NULL,
	`duration_min` integer DEFAULT 30 NOT NULL,
	`session_type` text DEFAULT 'focused' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`strategy_id`) REFERENCES `scheduling_strategies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_day_plan`("id", "user_id", "task_id", "strategy_id", "plan_date", "start_time", "duration_min", "session_type", "created_at", "updated_at") SELECT "id", "user_id", "task_id", "strategy_id", "plan_date", "start_time", "duration_min", "session_type", "created_at", "updated_at" FROM `day_plan`;--> statement-breakpoint
DROP TABLE `day_plan`;--> statement-breakpoint
ALTER TABLE `__new_day_plan` RENAME TO `day_plan`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_day_plan_user_date` ON `day_plan` (`user_id`,`plan_date`);--> statement-breakpoint
CREATE INDEX `idx_day_plan_task` ON `day_plan` (`task_id`);--> statement-breakpoint
ALTER TABLE `artifacts` ADD `title` text DEFAULT 'Untitled' NOT NULL;