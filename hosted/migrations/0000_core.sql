PRAGMA foreign_keys=ON;
CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT NOT NULL,name TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE tenants(id TEXT PRIMARY KEY,name TEXT NOT NULL,slug TEXT NOT NULL UNIQUE,segment TEXT NOT NULL,address TEXT NOT NULL,timezone TEXT NOT NULL,published INTEGER NOT NULL DEFAULT 0,min_notice INTEGER NOT NULL DEFAULT 120,horizon INTEGER NOT NULL DEFAULT 60,cancel_hours INTEGER NOT NULL DEFAULT 24,accent TEXT NOT NULL DEFAULT '#004dff',logo_path TEXT,cover_path TEXT,created_at TEXT NOT NULL);
CREATE TABLE memberships(tenant_id TEXT NOT NULL REFERENCES tenants(id),user_id TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','admin','professional')),PRIMARY KEY(tenant_id,user_id));
CREATE TABLE professionals(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),user_id TEXT,name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,UNIQUE(tenant_id,id));
CREATE TABLE services(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),name TEXT NOT NULL,duration INTEGER NOT NULL,price INTEGER NOT NULL,buffer_before INTEGER NOT NULL DEFAULT 0,buffer_after INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,UNIQUE(tenant_id,id));
CREATE TABLE professional_services(tenant_id TEXT NOT NULL,professional_id TEXT NOT NULL,service_id TEXT NOT NULL,PRIMARY KEY(professional_id,service_id),FOREIGN KEY(tenant_id,professional_id) REFERENCES professionals(tenant_id,id),FOREIGN KEY(tenant_id,service_id) REFERENCES services(tenant_id,id));
CREATE TABLE availability(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,professional_id TEXT NOT NULL,weekday INTEGER NOT NULL,starts TEXT NOT NULL,ends TEXT NOT NULL,CHECK(ends>starts),FOREIGN KEY(tenant_id,professional_id) REFERENCES professionals(tenant_id,id));
CREATE TABLE exceptions(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,professional_id TEXT NOT NULL,day TEXT NOT NULL,reason TEXT NOT NULL,UNIQUE(professional_id,day),FOREIGN KEY(tenant_id,professional_id) REFERENCES professionals(tenant_id,id));
CREATE TABLE customers(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),name TEXT NOT NULL,email TEXT NOT NULL,phone TEXT,reminders INTEGER NOT NULL DEFAULT 1,UNIQUE(tenant_id,email),UNIQUE(tenant_id,id));
CREATE TABLE subscriptions(tenant_id TEXT PRIMARY KEY REFERENCES tenants(id),plan TEXT NOT NULL DEFAULT 'trial',status TEXT NOT NULL DEFAULT 'trial',valid_until TEXT NOT NULL,cycle_start TEXT NOT NULL);
CREATE TABLE appointments(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),professional_id TEXT NOT NULL,service_id TEXT,customer_id TEXT,starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,occupied_start INTEGER NOT NULL,occupied_end INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','completed','cancelled','no_show','blocked')),service_name TEXT NOT NULL,duration INTEGER NOT NULL,price INTEGER NOT NULL,manage_hash TEXT UNIQUE,idempotency_key TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(tenant_id,idempotency_key),FOREIGN KEY(tenant_id,professional_id) REFERENCES professionals(tenant_id,id),FOREIGN KEY(tenant_id,service_id) REFERENCES services(tenant_id,id),FOREIGN KEY(tenant_id,customer_id) REFERENCES customers(tenant_id,id));
CREATE INDEX appointments_tenant_start ON appointments(tenant_id,starts_at);
CREATE INDEX appointments_professional_occupied ON appointments(professional_id,occupied_start,occupied_end);
-- D1 serializes transactions. Every INSERT/UPDATE enforces overlap in a database trigger.
CREATE TRIGGER no_overlap_insert BEFORE INSERT ON appointments WHEN NEW.status<>'cancelled' BEGIN
 SELECT RAISE(ABORT,'Horário acabou de ser ocupado. Escolha outro horário') WHERE EXISTS(SELECT 1 FROM appointments a WHERE a.professional_id=NEW.professional_id AND a.status<>'cancelled' AND a.occupied_start<NEW.occupied_end AND a.occupied_end>NEW.occupied_start);
END;
CREATE TRIGGER no_overlap_update BEFORE UPDATE OF occupied_start,occupied_end,status,professional_id ON appointments WHEN NEW.status<>'cancelled' BEGIN
 SELECT RAISE(ABORT,'Horário ocupado. A reserva original foi preservada') WHERE EXISTS(SELECT 1 FROM appointments a WHERE a.id<>NEW.id AND a.professional_id=NEW.professional_id AND a.status<>'cancelled' AND a.occupied_start<NEW.occupied_end AND a.occupied_end>NEW.occupied_start);
END;
CREATE TRIGGER subscription_booking_guard BEFORE INSERT ON appointments WHEN NEW.status<>'blocked' BEGIN
 SELECT RAISE(ABORT,'Agenda temporariamente sem novas reservas') WHERE NOT EXISTS(SELECT 1 FROM subscriptions s WHERE s.tenant_id=NEW.tenant_id AND s.valid_until>NEW.created_at AND s.status IN ('trial','active','cancelled'));
 SELECT RAISE(ABORT,'Limite mensal de agendamentos atingido') WHERE (SELECT count(*) FROM appointments a WHERE a.tenant_id=NEW.tenant_id AND a.service_id IS NOT NULL AND a.created_at>=max((SELECT cycle_start FROM subscriptions WHERE tenant_id=NEW.tenant_id),strftime('%Y-%m-01T00:00:00.000Z','now'))) >= CASE WHEN (SELECT plan FROM subscriptions WHERE tenant_id=NEW.tenant_id)='solo' THEN 100 ELSE 500 END;
END;
CREATE TABLE payment_events(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),payment_id TEXT UNIQUE,plan TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL,mode TEXT NOT NULL,pix_code TEXT,provider_updated_at TEXT,credited_at TEXT,created_at TEXT NOT NULL,expires_at TEXT,approved_by TEXT);
CREATE INDEX payment_events_tenant ON payment_events(tenant_id,created_at);
CREATE TABLE notification_jobs(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id),appointment_id TEXT NOT NULL REFERENCES appointments(id),kind TEXT NOT NULL,recipient TEXT NOT NULL,available_at TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL DEFAULT 'pending',locked_until TEXT,created_at TEXT NOT NULL);
CREATE TABLE audit_log(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,actor TEXT,event TEXT NOT NULL,record_id TEXT,created_at TEXT NOT NULL);
CREATE TABLE invites(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,email TEXT NOT NULL,role TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at TEXT NOT NULL,accepted_at TEXT);
CREATE TABLE rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,window_at INTEGER NOT NULL);
CREATE TABLE reservation_keys(tenant_id TEXT NOT NULL,key TEXT NOT NULL,request_hash TEXT NOT NULL,PRIMARY KEY(tenant_id,key));
CREATE TRIGGER service_quota BEFORE INSERT ON services WHEN NEW.active=1 BEGIN
 SELECT RAISE(ABORT,'Limite de serviços ativos do plano') WHERE (SELECT count(*) FROM services WHERE tenant_id=NEW.tenant_id AND active=1)>=CASE WHEN (SELECT plan FROM subscriptions WHERE tenant_id=NEW.tenant_id)='solo' THEN 10 ELSE 50 END;
END;
CREATE TRIGGER professional_quota BEFORE INSERT ON professionals WHEN NEW.active=1 BEGIN
 SELECT RAISE(ABORT,'Limite de profissionais do plano') WHERE (SELECT count(*) FROM professionals WHERE tenant_id=NEW.tenant_id AND active=1)>=CASE WHEN (SELECT plan FROM subscriptions WHERE tenant_id=NEW.tenant_id)='solo' THEN 1 ELSE 5 END;
END;
