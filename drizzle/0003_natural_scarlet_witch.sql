CREATE TABLE `ai_usage` (
	`uid` text NOT NULL,
	`datetime` integer NOT NULL,
	`input_token` integer NOT NULL,
	`output_token` integer NOT NULL,
	PRIMARY KEY(`uid`, `datetime`)
);
--> statement-breakpoint
CREATE TABLE `user_cost` (
	`uid` text NOT NULL,
	`date` text NOT NULL,
	`day_cost` real DEFAULT 0 NOT NULL,
	PRIMARY KEY(`uid`, `date`)
);
