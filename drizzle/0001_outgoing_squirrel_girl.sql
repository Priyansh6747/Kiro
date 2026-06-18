ALTER TABLE `projects` ADD `cadence` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `recurrence_rule` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `recurrence_ends_at` integer;