CREATE TABLE platform_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TRIGGER service_quota_reactivate BEFORE UPDATE OF active ON services WHEN NEW.active=1 AND OLD.active=0 BEGIN
 SELECT RAISE(ABORT,'Limite de serviços ativos do plano') WHERE (SELECT count(*) FROM services WHERE tenant_id=NEW.tenant_id AND active=1)>=CASE WHEN (SELECT plan FROM subscriptions WHERE tenant_id=NEW.tenant_id)='solo' THEN 10 ELSE 50 END;
END;
