ALTER TABLE customers ADD COLUMN notes TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE customers ADD COLUMN whatsapp_opt_in INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE notification_jobs ADD COLUMN channel TEXT NOT NULL DEFAULT 'email';
--> statement-breakpoint
ALTER TABLE notification_jobs ADD COLUMN provider_message_id TEXT;
--> statement-breakpoint
CREATE INDEX audit_tenant_created ON audit_log(tenant_id,created_at);
--> statement-breakpoint
CREATE INDEX jobs_channel_pending ON notification_jobs(channel,state,available_at);
