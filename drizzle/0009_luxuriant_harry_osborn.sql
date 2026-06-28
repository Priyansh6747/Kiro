DROP INDEX "idx_day_logs_user_date";--> statement-breakpoint
DROP INDEX "idx_day_plan_user_date";--> statement-breakpoint
DROP INDEX "idx_day_plan_task";--> statement-breakpoint
DROP INDEX "idx_habit_day_plan_user_date";--> statement-breakpoint
DROP INDEX "idx_habit_markers_user_date";--> statement-breakpoint
DROP INDEX "idx_habit_markers_habit_date";--> statement-breakpoint
DROP INDEX "idx_memory_user_computed";--> statement-breakpoint
DROP INDEX "idx_projects_user_type";--> statement-breakpoint
DROP INDEX "idx_recurring_day_plan_user_date";--> statement-breakpoint
DROP INDEX "idx_recurring_markers_user_date";--> statement-breakpoint
DROP INDEX "idx_recurring_markers_task_date";--> statement-breakpoint
DROP INDEX "scheduling_strategies_task_id_unique";--> statement-breakpoint
DROP INDEX "idx_strategies_task";--> statement-breakpoint
DROP INDEX "idx_closure_descendant";--> statement-breakpoint
DROP INDEX "idx_dependencies_task";--> statement-breakpoint
DROP INDEX "idx_tasks_user_scheduled";--> statement-breakpoint
DROP INDEX "idx_tasks_project_status";--> statement-breakpoint
DROP INDEX "idx_tasks_parent";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "users_username_unique";--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "consent" TO "consent" integer;--> statement-breakpoint
CREATE INDEX `idx_day_logs_user_date` ON `day_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_day_plan_user_date` ON `day_plan` (`user_id`,`plan_date`);--> statement-breakpoint
CREATE INDEX `idx_day_plan_task` ON `day_plan` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_habit_day_plan_user_date` ON `habit_day_plan` (`user_id`,`plan_date`);--> statement-breakpoint
CREATE INDEX `idx_habit_markers_user_date` ON `habit_markers` (`user_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_habit_markers_habit_date` ON `habit_markers` (`habit_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_memory_user_computed` ON `memory_baseline` (`user_id`,`computed_at`);--> statement-breakpoint
CREATE INDEX `idx_projects_user_type` ON `projects` (`user_id`,`type`,`archived_at`);--> statement-breakpoint
CREATE INDEX `idx_recurring_day_plan_user_date` ON `recurring_day_plan` (`user_id`,`plan_date`);--> statement-breakpoint
CREATE INDEX `idx_recurring_markers_user_date` ON `recurring_markers` (`user_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_recurring_markers_task_date` ON `recurring_markers` (`recurring_task_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `scheduling_strategies_task_id_unique` ON `scheduling_strategies` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_strategies_task` ON `scheduling_strategies` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_closure_descendant` ON `task_closure` (`descendant_id`);--> statement-breakpoint
CREATE INDEX `idx_dependencies_task` ON `task_dependencies` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_user_scheduled` ON `tasks` (`user_id`,`scheduled_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_project_status` ON `tasks` (`project_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_parent` ON `tasks` (`parent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);