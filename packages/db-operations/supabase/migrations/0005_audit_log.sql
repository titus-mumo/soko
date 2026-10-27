CREATE TABLE "request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"method" varchar(10) NOT NULL,
	"path" text NOT NULL,
	"query" text,
	"status" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"user_id" uuid,
	"role" varchar(20),
	"ip" varchar(64),
	"user_agent" text
);
--> statement-breakpoint
CREATE INDEX "request_logs_created_idx" ON "request_logs" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "request_logs_user_idx" ON "request_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "request_logs_status_idx" ON "request_logs" USING btree ("status","created_at");