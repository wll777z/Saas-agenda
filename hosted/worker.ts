import { z } from "zod";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { plans, PIX_KEY } from "../src/lib/config";
import { pixPayload } from "./pix";
import { assets, html } from "virtual:agenda-assets";
type DB = any;
type Row = Record<string, any>;
type Env = {
  DB: DB;
  BUCKET?: any;
  MANAGEMENT_SECRET: string;
  PLATFORM_OWNER_EMAIL: string;
  PIX_RECEIVER_NAME?: string;
  PIX_RECEIVER_CITY?: string;
  MERCADO_PAGO_ACCESS_TOKEN?: string;
  MERCADO_PAGO_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  CRON_SECRET?: string;
};
const id = () => crypto.randomUUID();
const iso = () => new Date().toISOString();
const uuid = z.string().uuid();
const date = z.iso.datetime({ offset: true });
const digest = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
async function hmac(value: string, secret: string) {
  if (!secret) throw Error("Links seguros não configurados");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
const stmt = (db: DB, sql: string, ...args: any[]) =>
  db
    .prepare(sql)
    .bind(
      ...args.map((x) =>
        x === undefined ? null : typeof x === "boolean" ? Number(x) : x,
      ),
    );
const rows = async (db: DB, sql: string, ...args: any[]) => {
  const result = await stmt(db, sql, ...args).all();
  return result.results ?? [];
};
const one = async (db: DB, sql: string, ...args: any[]) =>
  stmt(db, sql, ...args).first();
function identity(req: Request) {
  const userId = req.headers.get("oai-authenticated-user-id");
  if (!userId) return null;
  let name = req.headers.get("oai-authenticated-user-full-name") ?? "";
  if (
    req.headers.get("oai-authenticated-user-full-name-encoding") ===
    "percent-encoded-utf-8"
  )
    try {
      name = decodeURIComponent(name);
    } catch {}
  return {
    id: userId,
    email: req.headers.get("oai-authenticated-user-email") ?? "",
    name,
  };
}
function user(req: Request) {
  const u = identity(req);
  if (!u) throw Error("Entre com sua conta ChatGPT para acessar o painel.");
  return u;
}
async function member(
  db: DB,
  req: Request,
  tenant: string,
  roles = ["owner", "admin", "professional"],
) {
  const u = user(req);
  const m = await one(
    db,
    "SELECT role FROM memberships WHERE tenant_id=? AND user_id=?",
    tenant,
    u.id,
  );
  if (!m || !roles.includes(m.role))
    throw Error("Acesso negado a este negócio");
  return { ...u, role: m.role };
}
function operator(req: Request, env: Env) {
  const u = user(req);
  if (
    !env.PLATFORM_OWNER_EMAIL ||
    u.email.toLowerCase() !== env.PLATFORM_OWNER_EMAIL.toLowerCase()
  )
    throw Error("Acesso restrito ao operador da plataforma");
  return u;
}
async function limit(db: DB, key: string, max: number, seconds: number) {
  const now = Date.now();
  const r = await one(
    db,
    "INSERT INTO rate_limits(key,count,window_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_at<? THEN 1 ELSE count+1 END,window_at=CASE WHEN window_at<? THEN ? ELSE window_at END RETURNING count",
    key,
    now,
    now - seconds * 1000,
    now - seconds * 1000,
    now,
  );
  if (r.count > max)
    throw Error(
      "Muitas tentativas. Aguarde um pouco antes de tentar novamente.",
    );
}
const audit = (
  db: DB,
  tenant: string,
  actor: string | null,
  event: string,
  record: string,
) =>
  stmt(
    db,
    "INSERT INTO audit_log VALUES(?,?,?,?,?,?)",
    id(),
    tenant,
    actor,
    event,
    record,
    iso(),
  );
function present(r: Row) {
  return {
    ...r,
    ...("active" in r ? { active: Boolean(r.active) } : {}),
    ...("published" in r ? { published: Boolean(r.published) } : {}),
  };
}
async function business(db: DB, slug: string, req?: Request) {
  const t = await one(db, "SELECT * FROM tenants WHERE slug=?", slug);
  if (!t) return null;
  if (req) await member(db, req, t.id, ["owner", "admin"]);
  else if (!t.published) return null;
  const services = await rows(
    db,
    "SELECT id,name,duration,price FROM services WHERE tenant_id=? AND active=1",
    t.id,
  );
  const professionals = await rows(
    db,
    "SELECT id,name FROM professionals WHERE tenant_id=? AND active=1",
    t.id,
  );
  for (const p of professionals)
    p.services = (
      await rows(
        db,
        "SELECT service_id FROM professional_services WHERE professional_id=?",
        p.id,
      )
    ).map((x: Row) => x.service_id);
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    address: t.address,
    timezone: t.timezone,
    cancel_hours: t.cancel_hours,
    horizon: t.horizon,
    accent: t.accent,
    logo_path: t.logo_path,
    cover_path: t.cover_path,
    services,
    professionals,
  };
}
async function slots(
  db: DB,
  slug: string,
  service: string,
  professional: string | null,
  day: string,
  manualReq?: Request,
  ignoreId?: string,
) {
  const t = await one(db, "SELECT * FROM tenants WHERE slug=?", slug);
  if (!t) return [];
  if (manualReq) await member(db, manualReq, t.id, ["owner", "admin"]);
  else if (!t.published) return [];
  const localToday = formatInTimeZone(new Date(), t.timezone, "yyyy-MM-dd");
  const maxDay = new Date(localToday + "T12:00:00Z");
  maxDay.setUTCDate(maxDay.getUTCDate() + t.horizon);
  if (day < localToday || day > maxDay.toISOString().slice(0, 10)) return [];
  const s = await one(
    db,
    "SELECT * FROM services WHERE tenant_id=? AND id=? AND active=1",
    t.id,
    service,
  );
  if (!s) return [];
  const pros = await rows(
    db,
    "SELECT p.* FROM professionals p JOIN professional_services ps ON ps.professional_id=p.id WHERE p.tenant_id=? AND p.active=1 AND ps.service_id=?" +
      (professional ? " AND p.id=?" : ""),
    ...[t.id, service, ...(professional ? [professional] : [])],
  );
  const result: Row[] = [];
  const weekday = new Date(day + "T12:00:00Z").getUTCDay();
  for (const p of pros) {
    if (
      await one(
        db,
        "SELECT 1 FROM exceptions WHERE professional_id=? AND day=?",
        p.id,
        day,
      )
    )
      continue;
    const rules = await rows(
      db,
      "SELECT * FROM availability WHERE professional_id=? AND weekday=?",
      p.id,
      weekday,
    );
    const busy = await rows(
      db,
      "SELECT id,occupied_start,occupied_end FROM appointments WHERE professional_id=? AND status<>'cancelled' AND occupied_end>? AND occupied_start<?",
      p.id,
      Date.parse(day + "T00:00:00Z") - 86400000,
      Date.parse(day + "T00:00:00Z") + 172800000,
    );
    for (const r of rules) {
      const start = fromZonedTime(day + "T" + r.starts, t.timezone).getTime();
      const end = fromZonedTime(day + "T" + r.ends, t.timezone).getTime();
      for (
        let at = start;
        at + (s.duration + s.buffer_after) * 60000 <= end;
        at += 15 * 60000
      ) {
        const occupiedStart = at - s.buffer_before * 60000,
          occupiedEnd = at + (s.duration + s.buffer_after) * 60000;
        if (occupiedStart < start || at < Date.now() + t.min_notice * 60000)
          continue;
        if (
          busy.some(
            (b: Row) =>
              b.id !== ignoreId &&
              b.occupied_start < occupiedEnd &&
              b.occupied_end > occupiedStart,
          )
        )
          continue;
        result.push({
          starts_at: new Date(at).toISOString(),
          professional_id: p.id,
        });
      }
    }
  }
  return [
    ...new Map(
      result.map((x) => [x.starts_at + x.professional_id, x]),
    ).values(),
  ]
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 500);
}
function queue(
  db: DB,
  t: string,
  b: string,
  email: string,
  start: string,
  kind = "confirmation",
) {
  const time = iso();
  const list = [
    stmt(
      db,
      "INSERT INTO notification_jobs(id,tenant_id,appointment_id,kind,recipient,available_at,created_at) VALUES(?,?,?,?,?,?,?)",
      id(),
      t,
      b,
      kind,
      email,
      time,
      time,
    ),
  ];
  if (kind === "confirmation" && Date.parse(start) > Date.now() + 86400000)
    list.push(
      stmt(
        db,
        "INSERT INTO notification_jobs(id,tenant_id,appointment_id,kind,recipient,available_at,created_at) VALUES(?,?,?,?,?,?,?)",
        id(),
        t,
        b,
        "reminder",
        email,
        new Date(Date.parse(start) - 86400000).toISOString(),
        time,
      ),
    );
  return list;
}
async function reserve(req: Request, env: Env, body: unknown) {
  const b = z
    .object({
      slug: z.string().max(100),
      service: uuid,
      professional: uuid,
      start: date,
      name: z.string().trim().min(2).max(100),
      email: z.email().max(254),
      phone: z.string().max(30).default(""),
      key: uuid,
      manual: z.boolean().default(false),
    })
    .parse(body);
  const db = env.DB,
    t = await one(db, "SELECT * FROM tenants WHERE slug=?", b.slug);
  if (!t || (!b.manual && !t.published)) throw Error("Agenda indisponível");
  let actor: string | null = null;
  if (b.manual) actor = (await member(db, req, t.id, ["owner", "admin"])).id;
  const token = await hmac(t.slug + ":" + b.key, env.MANAGEMENT_SECRET),
    manageHash = await digest(token);
  const prior = await one(
    db,
    "SELECT id,starts_at,status,manage_hash FROM appointments WHERE tenant_id=? AND idempotency_key=?",
    t.id,
    b.key,
  );
  if (prior) {
    if (prior.manage_hash !== manageHash)
      throw Error("Solicitação já utilizada");
    return {
      id: prior.id,
      starts_at: prior.starts_at,
      status: prior.status,
      token,
    };
  }
  await limit(
    db,
    "book:ip:" +
      (await digest(req.headers.get("cf-connecting-ip") ?? "unknown")),
    60,
    3600,
  );
  await limit(
    db,
    "book:email:" + (await digest(b.email.toLowerCase())),
    12,
    3600,
  );
  const start = new Date(b.start).toISOString();
  if (
    !(
      await slots(
        db,
        t.slug,
        b.service,
        b.professional,
        formatInTimeZone(start, t.timezone, "yyyy-MM-dd"),
        b.manual ? req : undefined,
      )
    ).some(
      (s: Row) => s.starts_at === start && s.professional_id === b.professional,
    )
  )
    throw Error("Horário indisponível. Escolha outro horário");
  const s = await one(
    db,
    "SELECT * FROM services WHERE id=? AND tenant_id=? AND active=1",
    b.service,
    t.id,
  );
  const customer = id(),
    appointment = id(),
    time = iso();
  const statements = [
    stmt(
      db,
      "INSERT INTO customers(id,tenant_id,name,email,phone) VALUES(?,?,?,?,?) ON CONFLICT(tenant_id,email) DO UPDATE SET name=excluded.name,phone=excluded.phone",
      customer,
      t.id,
      b.name,
      b.email.toLowerCase(),
      b.phone,
    ),
    stmt(
      db,
      "INSERT INTO appointments(id,tenant_id,professional_id,service_id,customer_id,starts_at,ends_at,occupied_start,occupied_end,service_name,duration,price,manage_hash,idempotency_key,created_at) VALUES(?,?,?,?,(SELECT id FROM customers WHERE tenant_id=? AND email=?),?,?,?,?,?,?,?,?,?,?)",
      appointment,
      t.id,
      b.professional,
      s.id,
      t.id,
      b.email.toLowerCase(),
      start,
      new Date(Date.parse(start) + s.duration * 60000).toISOString(),
      Date.parse(start) - s.buffer_before * 60000,
      Date.parse(start) + (s.duration + s.buffer_after) * 60000,
      s.name,
      s.duration,
      s.price,
      manageHash,
      b.key,
      time,
    ),
    ...queue(db, t.id, appointment, b.email.toLowerCase(), start),
    audit(db, t.id, actor, "appointment.created", appointment),
  ];
  try {
    await db.batch(statements);
  } catch (error) {
    const retry = await one(
      db,
      "SELECT id,starts_at,status,manage_hash FROM appointments WHERE tenant_id=? AND idempotency_key=?",
      t.id,
      b.key,
    );
    if (retry && retry.manage_hash === manageHash)
      return {
        id: retry.id,
        starts_at: retry.starts_at,
        status: retry.status,
        token,
      };
    throw error;
  }
  return {
    id: appointment,
    starts_at: start,
    status: "confirmed",
    token,
    emailConfigured: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
  };
}
async function manage(req: Request, env: Env, body: Row, read = false) {
  const token = z.string().min(40).max(100).parse(body.token);
  const db = env.DB;
  const b = await one(
    db,
    "SELECT * FROM appointments WHERE manage_hash=?",
    await digest(token),
  );
  if (!b) throw Error("Link inválido ou expirado");
  const t = await one(db, "SELECT * FROM tenants WHERE id=?", b.tenant_id);
  if (read)
    return {
      id: b.id,
      service_name: b.service_name,
      starts_at: b.starts_at,
      ends_at: b.ends_at,
      status: b.status,
      price: b.price,
      duration: b.duration,
      business: t.name,
      slug: t.slug,
      address: t.address,
      timezone: t.timezone,
      cancel_hours: t.cancel_hours,
      professional_id: b.professional_id,
      service_id: b.service_id,
    };
  if (
    b.status !== "confirmed" ||
    Date.parse(b.starts_at) < Date.now() + t.cancel_hours * 3600000
  )
    throw Error(
      "Prazo de alteração encerrado. Entre em contato com o estabelecimento",
    );
  return changeBooking(
    req,
    env,
    b,
    z.enum(["cancel", "reschedule"]).parse(body.action),
    body.start,
    null,
  );
}
async function changeBooking(
  req: Request,
  env: Env,
  b: Row,
  action: string,
  start: string | undefined,
  actor: string | null,
) {
  const db = env.DB;
  const c = await one(
    db,
    "SELECT email FROM customers WHERE id=?",
    b.customer_id,
  );
  const queries = [
    stmt(
      db,
      "UPDATE notification_jobs SET state='cancelled' WHERE appointment_id=? AND state IN ('pending','sending')",
      b.id,
    ),
  ];
  if (action === "cancel") {
    queries.unshift(
      stmt(
        db,
        "UPDATE appointments SET status='cancelled' WHERE id=? AND status='confirmed'",
        b.id,
      ),
    );
    queries.push(
      ...queue(db, b.tenant_id, b.id, c.email, b.starts_at, "cancellation"),
    );
  } else {
    const t = await one(db, "SELECT * FROM tenants WHERE id=?", b.tenant_id);
    const s = await one(
      db,
      "SELECT * FROM services WHERE id=? AND active=1",
      b.service_id,
    );
    if (!s || s.duration !== b.duration)
      throw Error(
        "O serviço mudou de duração. Entre em contato para ajustar a reserva",
      );
    const next = new Date(date.parse(start)).toISOString();
    const available = await slots(
      db,
      t.slug,
      s.id,
      b.professional_id,
      formatInTimeZone(next, t.timezone, "yyyy-MM-dd"),
      actor ? req : undefined,
      b.id,
    );
    if (!available.some((x: Row) => x.starts_at === next))
      throw Error("Horário indisponível. A reserva original foi preservada");
    queries.unshift(
      stmt(
        db,
        "UPDATE appointments SET starts_at=?,ends_at=?,occupied_start=?,occupied_end=? WHERE id=? AND status='confirmed'",
        next,
        new Date(Date.parse(next) + b.duration * 60000).toISOString(),
        Date.parse(next) - s.buffer_before * 60000,
        Date.parse(next) + (b.duration + s.buffer_after) * 60000,
        b.id,
      ),
    );
    queries.push(...queue(db, b.tenant_id, b.id, c.email, next));
  }
  queries.push(audit(db, b.tenant_id, actor, "appointment." + action, b.id));
  await db.batch(queries);
  return { id: b.id, status: action === "cancel" ? "cancelled" : "confirmed" };
}
async function query(req: Request, env: Env, input: Row) {
  const db = env.DB,
    u = user(req),
    table = z
      .enum([
        "memberships",
        "appointments",
        "services",
        "professionals",
        "customers",
        "subscriptions",
        "payment_events",
        "availability",
      ])
      .parse(input.table);
  const f = input.filters ?? {};
  if (table === "memberships") {
    const ms = await rows(
      db,
      "SELECT * FROM memberships WHERE user_id=?",
      u.id,
    );
    for (const m of ms)
      m.tenants = present(
        await one(db, "SELECT * FROM tenants WHERE id=?", m.tenant_id),
      );
    return ms;
  }
  let tenant = f.tenant_id;
  if (table === "availability") {
    const p = await one(
      db,
      "SELECT tenant_id FROM professionals WHERE id=?",
      uuid.parse(f.professional_id),
    );
    tenant = p?.tenant_id;
  }
  if (!tenant) throw Error("Informe o negócio");
  const m = await member(db, req, uuid.parse(tenant));
  if (["subscriptions", "payment_events"].includes(table) && m.role !== "owner")
    return input.single ? null : [];
  const args: any[] = [tenant];
  let sql = "SELECT * FROM " + table + " WHERE tenant_id=?";
  if (table === "appointments" && m.role === "professional") {
    sql +=
      " AND professional_id IN (SELECT id FROM professionals WHERE user_id=?)";
    args.push(u.id);
  }
  if (table === "customers" && m.role === "professional") {
    sql +=
      " AND id IN (SELECT a.customer_id FROM appointments a JOIN professionals p ON p.id=a.professional_id WHERE p.user_id=?)";
    args.push(u.id);
  }
  if (f.professional_id) {
    sql += " AND professional_id=?";
    args.push(uuid.parse(f.professional_id));
  }
  const sort = input.sorting?.key;
  if (sort && ["name", "created_at", "starts_at", "weekday"].includes(sort))
    sql +=
      " ORDER BY " +
      sort +
      (input.sorting.ascending === false ? " DESC" : " ASC");
  sql += " LIMIT 2000";
  let data = (await rows(db, sql, ...args)).map(present);
  if (table === "appointments")
    for (const b of data) {
      const c = b.customer_id
        ? await one(
            db,
            "SELECT name,email,phone FROM customers WHERE id=? AND tenant_id=?",
            b.customer_id,
            tenant,
          )
        : null;
      b.customers = c;
      delete b.manage_hash;
      delete b.idempotency_key;
    }
  return input.single ? (data[0] ?? null) : data;
}
const number = (v: unknown, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).parse(v);
const short = (v: unknown, min = 2, max = 100) =>
  z.string().trim().min(min).max(max).parse(v);
async function rpc(req: Request, env: Env, name: string, a: Row) {
  const db = env.DB,
    u = user(req);
  if (name === "create_business") {
    const t = id(),
      p = id(),
      s = id(),
      time = iso(),
      zone = short(a.p_timezone, 1, 80);
    try {
      formatInTimeZone(new Date(), zone, "yyyy");
    } catch {
      throw Error("Fuso horário inválido");
    }
    const slug = z
      .string()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .parse(a.p_slug);
    if (
      (
        await one(
          db,
          "SELECT count(*) n FROM memberships WHERE user_id=? AND role='owner'",
          u.id,
        )
      ).n >= 5
    )
      throw Error("Limite de empresas por conta");
    const start = z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .parse(a.p_start),
      end = z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .parse(a.p_end);
    if (end <= start) throw Error("Expediente inválido");
    const statements = [
      stmt(
        db,
        "INSERT INTO users VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name",
        u.id,
        u.email,
        u.name || u.email,
        time,
      ),
      stmt(
        db,
        "INSERT INTO tenants(id,name,slug,segment,address,timezone,created_at) VALUES(?,?,?,?,?,?,?)",
        t,
        short(a.p_name),
        slug,
        short(a.p_segment),
        short(a.p_address, 1, 500),
        zone,
        time,
      ),
      stmt(db, "INSERT INTO memberships VALUES(?,?,?)", t, u.id, "owner"),
      stmt(
        db,
        "INSERT INTO subscriptions VALUES(?,?,?,?,?)",
        t,
        "trial",
        "trial",
        new Date(Date.now() + 14 * 86400000).toISOString(),
        time,
      ),
      stmt(
        db,
        "INSERT INTO professionals(id,tenant_id,user_id,name) VALUES(?,?,?,?)",
        p,
        t,
        u.id,
        short(a.p_name),
      ),
      stmt(
        db,
        "INSERT INTO services(id,tenant_id,name,duration,price) VALUES(?,?,?,?,?)",
        s,
        t,
        short(a.p_service),
        number(a.p_duration, 5, 480),
        number(a.p_price, 0, 10000000),
      ),
      stmt(db, "INSERT INTO professional_services VALUES(?,?,?)", t, p, s),
    ];
    for (let d = 1; d <= 5; d++)
      statements.push(
        stmt(
          db,
          "INSERT INTO availability VALUES(?,?,?,?,?,?)",
          id(),
          t,
          p,
          d,
          start,
          end,
        ),
      );
    await db.batch(statements);
    return t;
  }
  if (
    name === "save_availability" ||
    name === "block_time" ||
    name === "add_exception" ||
    name === "deactivate_professional"
  ) {
    const p = await one(
      db,
      "SELECT * FROM professionals WHERE id=?",
      uuid.parse(a.p_professional),
    );
    if (!p) throw Error("Profissional não encontrado");
    await member(
      db,
      req,
      p.tenant_id,
      name === "deactivate_professional" ? ["owner"] : ["owner", "admin"],
    );
    if (name === "save_availability") {
      const rules = z
        .array(
          z.object({
            weekday: z.number().int().min(0).max(6),
            starts: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
            ends: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
          }),
        )
        .max(21)
        .parse(a.p_rules);
      if (rules.some((r) => r.ends <= r.starts))
        throw Error("O fim do expediente deve ser depois do início");
      await db.batch([
        stmt(db, "DELETE FROM availability WHERE professional_id=?", p.id),
        ...rules.map((r) =>
          stmt(
            db,
            "INSERT INTO availability VALUES(?,?,?,?,?,?)",
            id(),
            p.tenant_id,
            p.id,
            r.weekday,
            r.starts.slice(0, 5),
            r.ends.slice(0, 5),
          ),
        ),
        audit(db, p.tenant_id, u.id, "availability.updated", p.id),
      ]);
      return null;
    }
    if (name === "deactivate_professional") {
      await db.batch([
        stmt(db, "UPDATE professionals SET active=0 WHERE id=?", p.id),
        audit(db, p.tenant_id, u.id, "professional.deactivated", p.id),
      ]);
      return null;
    }
    if (name === "add_exception") {
      await stmt(
        db,
        "INSERT INTO exceptions VALUES(?,?,?,?,?) ON CONFLICT(professional_id,day) DO UPDATE SET reason=excluded.reason",
        id(),
        p.tenant_id,
        p.id,
        z.iso.date().parse(a.p_day),
        short(a.p_reason, 1, 200),
      ).run();
      return null;
    }
    const start = new Date(date.parse(a.p_start)),
      end = new Date(date.parse(a.p_end));
    if (end <= start || end.getTime() - start.getTime() > 90 * 86400000)
      throw Error("Intervalo de bloqueio inválido");
    const b = id();
    await db.batch([
      stmt(
        db,
        "INSERT INTO appointments(id,tenant_id,professional_id,starts_at,ends_at,occupied_start,occupied_end,status,service_name,duration,price,idempotency_key,created_at) VALUES(?,?,?,?,?,?,?,'blocked','Horário bloqueado',?,0,?,?)",
        b,
        p.tenant_id,
        p.id,
        start.toISOString(),
        end.toISOString(),
        start.getTime(),
        end.getTime(),
        Math.round((end.getTime() - start.getTime()) / 60000),
        id(),
        iso(),
      ),
      audit(db, p.tenant_id, u.id, "schedule.blocked", b),
    ]);
    return null;
  }
  if (name === "set_appointment_status" || name === "unblock_time") {
    const b = await one(
      db,
      "SELECT * FROM appointments WHERE id=?",
      uuid.parse(a.p_id),
    );
    if (!b) throw Error("Reserva não encontrada");
    const m = await member(db, req, b.tenant_id);
    if (
      m.role === "professional" &&
      !(await one(
        db,
        "SELECT 1 FROM professionals WHERE id=? AND user_id=?",
        b.professional_id,
        u.id,
      ))
    )
      throw Error("Acesso negado");
    if (name === "unblock_time") {
      if (m.role === "professional" || b.status !== "blocked")
        throw Error("Acesso negado");
      await db.batch([
        stmt(
          db,
          "DELETE FROM appointments WHERE id=? AND status='blocked'",
          b.id,
        ),
        audit(db, b.tenant_id, u.id, "schedule.unblocked", b.id),
      ]);
      return null;
    }
    if (b.status !== "confirmed") throw Error("A reserva não está confirmada");
    const status = z
      .enum(["completed", "cancelled", "no_show"])
      .parse(a.p_status);
    if (status === "cancelled")
      return changeBooking(req, env, b, "cancel", undefined, u.id);
    await db.batch([
      stmt(
        db,
        "UPDATE appointments SET status=? WHERE id=? AND status='confirmed'",
        status,
        b.id,
      ),
      stmt(
        db,
        "UPDATE notification_jobs SET state='cancelled' WHERE appointment_id=? AND state IN ('pending','sending')",
        b.id,
      ),
      audit(db, b.tenant_id, u.id, "appointment." + status, b.id),
    ]);
    return null;
  }
  const tenant = uuid.parse(a.p_tenant);
  await member(
    db,
    req,
    tenant,
    ["save_service"].includes(name) ? ["owner", "admin"] : ["owner"],
  );
  if (name === "publish_business") {
    if (
      a.p_published &&
      !(await one(
        db,
        "SELECT 1 FROM services s JOIN professional_services ps ON ps.service_id=s.id JOIN professionals p ON p.id=ps.professional_id JOIN availability av ON av.professional_id=p.id WHERE s.tenant_id=? AND s.active=1 AND p.active=1 AND ((CAST(substr(av.ends,1,2) AS INTEGER)*60+CAST(substr(av.ends,4,2) AS INTEGER))-(CAST(substr(av.starts,1,2) AS INTEGER)*60+CAST(substr(av.starts,4,2) AS INTEGER)))>=s.duration+s.buffer_before+s.buffer_after",
        tenant,
      ))
    )
      throw Error("Cadastre um serviço, profissional e expediente compatíveis");
    await stmt(
      db,
      "UPDATE tenants SET published=? WHERE id=?",
      Boolean(a.p_published),
      tenant,
    ).run();
    return null;
  }
  if (name === "save_service") {
    const sid = a.p_id ? uuid.parse(a.p_id) : id();
    const values = [
      short(a.p_name),
      number(a.p_duration, 5, 480),
      number(a.p_price, 0, 10000000),
      number(a.p_before, 0, 120),
      number(a.p_after, 0, 120),
      Boolean(a.p_active),
    ];
    if (a.p_id) {
      if (
        !(await one(
          db,
          "SELECT 1 FROM services WHERE id=? AND tenant_id=?",
          sid,
          tenant,
        ))
      )
        throw Error("Serviço não encontrado");
      await stmt(
        db,
        "UPDATE services SET name=?,duration=?,price=?,buffer_before=?,buffer_after=?,active=? WHERE id=? AND tenant_id=?",
        ...values,
        sid,
        tenant,
      ).run();
    } else {
      const pros = await rows(
        db,
        "SELECT id FROM professionals WHERE tenant_id=? AND active=1",
        tenant,
      );
      await db.batch([
        stmt(
          db,
          "INSERT INTO services(id,tenant_id,name,duration,price,buffer_before,buffer_after,active) VALUES(?,?,?,?,?,?,?,?)",
          sid,
          tenant,
          ...values,
        ),
        ...pros.map((p: Row) =>
          stmt(
            db,
            "INSERT INTO professional_services VALUES(?,?,?)",
            tenant,
            p.id,
            sid,
          ),
        ),
      ]);
    }
    return sid;
  }
  if (name === "save_settings") {
    await stmt(
      db,
      "UPDATE tenants SET name=?,address=?,min_notice=?,horizon=?,cancel_hours=? WHERE id=?",
      short(a.p_name),
      short(a.p_address, 1, 500),
      number(a.p_notice, 0, 43200),
      number(a.p_horizon, 1, 365),
      number(a.p_cancel, 0, 168),
      tenant,
    ).run();
    return null;
  }
  if (name === "save_branding") {
    const accent = z
      .enum(["#0071e3", "#004dff", "#267355", "#7251a1", "#954f24"])
      .parse(a.p_accent);
    for (const path of [a.p_logo, a.p_cover])
      if (path && !String(path).startsWith(tenant + "/"))
        throw Error("Arquivo pertence a outra empresa");
    await stmt(
      db,
      "UPDATE tenants SET accent=?,logo_path=?,cover_path=? WHERE id=?",
      accent,
      a.p_logo ?? null,
      a.p_cover ?? null,
      tenant,
    ).run();
    return null;
  }
  if (name === "cancel_subscription") {
    await stmt(
      db,
      "UPDATE subscriptions SET status='cancelled' WHERE tenant_id=?",
      tenant,
    ).run();
    return null;
  }
  throw Error("Operação não disponível");
}
async function provider(env: Env, path: string, options: RequestInit = {}) {
  if (!env.MERCADO_PAGO_ACCESS_TOKEN)
    throw Error("Provedor de pagamento não conectado");
  const response = await fetch("https://api.mercadopago.com" + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + env.MERCADO_PAGO_ACCESS_TOKEN,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  const body = (await response.json()) as Row;
  if (!response.ok)
    throw Error("O provedor não concluiu a cobrança. Tente novamente");
  return body;
}
async function applyPayment(env: Env, p: Row) {
  const db = env.DB,
    e = await one(
      db,
      "SELECT * FROM payment_events WHERE payment_id=?",
      String(p.id),
    );
  if (
    !e ||
    e.id !== p.external_reference ||
    p.currency_id !== "BRL" ||
    Math.round(Number(p.transaction_amount) * 100) !== e.amount
  )
    throw Error("Cobrança não corresponde ao registro");
  if (e.provider_updated_at && e.provider_updated_at >= p.date_last_updated)
    return p;
  const time = iso();
  const queries: any[] = [];
  if (p.status === "approved" && !e.credited_at) {
    queries.push(
      stmt(
        db,
        "UPDATE subscriptions SET plan=?,status='active',cycle_start=?,valid_until=strftime('%Y-%m-%dT%H:%M:%fZ',CASE WHEN status='trial' OR valid_until<? THEN ? ELSE valid_until END,'+1 month') WHERE tenant_id=? AND NOT EXISTS(SELECT 1 FROM payment_events WHERE id=? AND credited_at IS NOT NULL)",
        e.plan,
        time,
        time,
        time,
        e.tenant_id,
        e.id,
      ),
      stmt(
        db,
        "UPDATE payment_events SET credited_at=COALESCE(credited_at,?) WHERE id=?",
        time,
        e.id,
      ),
    );
  }
  if (["refunded", "charged_back"].includes(p.status) && e.credited_at)
    queries.push(
      stmt(
        db,
        "UPDATE subscriptions SET status='past_due',valid_until=? WHERE tenant_id=?",
        time,
        e.tenant_id,
      ),
    );
  queries.push(
    stmt(
      db,
      "UPDATE payment_events SET status=?,provider_updated_at=? WHERE id=? AND (provider_updated_at IS NULL OR provider_updated_at<?)",
      p.status,
      p.date_last_updated,
      e.id,
      p.date_last_updated,
    ),
  );
  await db.batch(queries);
  return p;
}
async function pixSettings(env: Env) {
  const saved = await one(
    env.DB,
    "SELECT value FROM platform_settings WHERE key='pix'",
  );
  if (saved) {
    try {
      return JSON.parse(saved.value);
    } catch {}
  }
  return env.PIX_RECEIVER_NAME && env.PIX_RECEIVER_CITY
    ? { name: env.PIX_RECEIVER_NAME, city: env.PIX_RECEIVER_CITY }
    : null;
}
async function makePix(req: Request, env: Env, body: Row) {
  const b = z
    .object({ tenant: uuid, plan: z.enum(["solo", "team"]), key: uuid })
    .parse(body);
  const m = await member(env.DB, req, b.tenant, ["owner"]);
  const db = env.DB,
    plan = plans[b.plan],
    ref = b.tenant + ":" + b.plan + ":" + b.key;
  const sub = await one(
    db,
    "SELECT * FROM subscriptions WHERE tenant_id=?",
    b.tenant,
  );
  if (sub.status === "active" && sub.valid_until > iso() && sub.plan !== b.plan)
    throw Error("A troca de plano fica disponível após o período atual");
  const counts = await one(
    db,
    "SELECT (SELECT count(*) FROM professionals WHERE tenant_id=? AND active=1) professionals,(SELECT count(*) FROM services WHERE tenant_id=? AND active=1) services",
    b.tenant,
    b.tenant,
  );
  if (
    counts.professionals > plan.professionals ||
    counts.services > plan.services
  )
    throw Error(
      "Desative profissionais ou serviços excedentes antes de trocar de plano",
    );
  if (env.MERCADO_PAGO_ACCESS_TOKEN && env.MERCADO_PAGO_WEBHOOK_SECRET) {
    const payment = await provider(env, "/v1/payments", {
      method: "POST",
      headers: { "X-Idempotency-Key": b.key },
      body: JSON.stringify({
        transaction_amount: plan.price / 100,
        description: "Agenda Clara — " + plan.name + " — um mês",
        payment_method_id: "pix",
        payer: { email: m.email },
        external_reference: ref,
        notification_url: new URL("/api/webhook", req.url).href,
        date_of_expiration: new Date(Date.now() + 1800000).toISOString(),
      }),
    });
    await stmt(
      db,
      "INSERT INTO payment_events(id,tenant_id,payment_id,plan,amount,status,mode,pix_code,created_at,expires_at) VALUES(?,?,?,?,?,'pending','mercadopago',?,?,?) ON CONFLICT(id) DO NOTHING",
      ref,
      b.tenant,
      String(payment.id),
      b.plan,
      plan.price,
      payment.point_of_interaction?.transaction_data?.qr_code,
      iso(),
      payment.date_of_expiration,
    ).run();
    await applyPayment(env, payment);
    return {
      id: String(payment.id),
      status: payment.status,
      code: payment.point_of_interaction?.transaction_data?.qr_code,
      image: payment.point_of_interaction?.transaction_data?.qr_code_base64,
      expires: payment.date_of_expiration,
      mode: "mercadopago",
    };
  }
  const settings = await pixSettings(env);
  if (!settings)
    throw Error(
      "Abra Configurar meu Pix e informe o titular e a cidade para gerar o QR Code",
    );
  const old = await one(db, "SELECT * FROM payment_events WHERE id=?", ref);
  if (old)
    return {
      id: old.id,
      status: old.status,
      code: old.pix_code,
      mode: old.mode,
      expires: old.expires_at,
    };
  const code = pixPayload({
    key: PIX_KEY,
    name: settings.name,
    city: settings.city,
    amount: plan.price,
    reference: b.key.replaceAll("-", "").slice(0, 25),
  });
  const expires = new Date(Date.now() + 86400000).toISOString();
  await stmt(
    db,
    "INSERT INTO payment_events(id,tenant_id,plan,amount,status,mode,pix_code,created_at,expires_at) VALUES(?,?,?,?,'pending','direct',?,?,?)",
    ref,
    b.tenant,
    b.plan,
    plan.price,
    code,
    iso(),
    expires,
  ).run();
  return {
    id: ref,
    status: "pending",
    code,
    expires,
    mode: "direct",
    receiver: settings.name,
    city: settings.city,
  };
}
async function paymentsForOperator(req: Request, env: Env) {
  operator(req, env);
  return rows(
    env.DB,
    "SELECT e.id,e.tenant_id,t.name business,e.plan,e.amount,e.status,e.mode,e.created_at,e.expires_at FROM payment_events e JOIN tenants t ON t.id=e.tenant_id ORDER BY e.created_at DESC LIMIT 1000",
  );
}
async function manualApproval(req: Request, env: Env, body: Row) {
  const u = operator(req, env);
  const eid = z.string().min(1).max(200).parse(body.id);
  if (body.confirmed !== true)
    throw Error("Confirme que conferiu o recebimento no seu banco");
  const e = await one(
    env.DB,
    "SELECT * FROM payment_events WHERE id=? AND mode='direct'",
    eid,
  );
  if (!e) throw Error("Cobrança não encontrada");
  if (e.credited_at) return { status: "approved" };
  const time = iso();
  await env.DB.batch([
    stmt(
      env.DB,
      "UPDATE subscriptions SET plan=?,status='active',cycle_start=?,valid_until=strftime('%Y-%m-%dT%H:%M:%fZ',CASE WHEN status='trial' OR valid_until<? THEN ? ELSE valid_until END,'+1 month') WHERE tenant_id=? AND NOT EXISTS(SELECT 1 FROM payment_events WHERE id=? AND credited_at IS NOT NULL)",
      e.plan,
      time,
      time,
      time,
      e.tenant_id,
      e.id,
    ),
    stmt(
      env.DB,
      "UPDATE payment_events SET status='approved',credited_at=COALESCE(credited_at,?),approved_by=? WHERE id=? AND credited_at IS NULL",
      time,
      u.id,
      e.id,
    ),
    audit(env.DB, e.tenant_id, u.id, "payment.manually_verified", e.id),
  ]);
  return { status: "approved" };
}
async function jobs(req: Request, env: Env) {
  const auth = req.headers.get("Authorization");
  if (!env.CRON_SECRET || auth !== "Bearer " + env.CRON_SECRET)
    throw Error("Acesso negado");
  const db = env.DB;
  let sent = 0;
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const candidates = await rows(
      db,
      "SELECT id FROM notification_jobs WHERE (state='pending' AND available_at<=?) OR (state='sending' AND locked_until<? AND attempts<5) ORDER BY available_at LIMIT 20",
      iso(),
      iso(),
    );
    for (const item of candidates) {
      const job = await one(
        db,
        "UPDATE notification_jobs SET state='sending',attempts=attempts+1,locked_until=? WHERE id=? AND ((state='pending' AND available_at<=?) OR(state='sending' AND locked_until<?)) RETURNING *",
        new Date(Date.now() + 300000).toISOString(),
        item.id,
        iso(),
        iso(),
      );
      if (!job) continue;
      const b = await one(
        db,
        "SELECT a.*,t.name business,t.slug,t.timezone FROM appointments a JOIN tenants t ON t.id=a.tenant_id WHERE a.id=?",
        job.appointment_id,
      );
      if (!b || (job.kind !== "cancellation" && b.status !== "confirmed")) {
        await stmt(
          db,
          "UPDATE notification_jobs SET state='cancelled' WHERE id=?",
          job.id,
        ).run();
        continue;
      }
      const token = await hmac(
        b.slug + ":" + b.idempotency_key,
        env.MANAGEMENT_SECRET,
      );
      const label = formatInTimeZone(
        b.starts_at,
        b.timezone,
        "dd/MM/yyyy 'às' HH:mm",
      );
      const text =
        job.kind === "cancellation"
          ? `Sua reserva de ${b.service_name} em ${b.business} foi cancelada.`
          : `${job.kind === "reminder" ? "Lembrete" : "Agendamento confirmado"}: ${b.service_name} em ${b.business}, ${label} (${b.timezone}). Gerencie sua reserva: ${new URL("/reserva/" + token, req.url).href}`;
      try {
        const current = await one(
          db,
          "SELECT state FROM notification_jobs WHERE id=?",
          job.id,
        );
        if (current.state !== "sending") continue;
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + env.RESEND_API_KEY,
            "Content-Type": "application/json",
            "Idempotency-Key": job.id,
          },
          body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: [job.recipient],
            subject:
              job.kind === "cancellation"
                ? "Reserva cancelada — Agenda Clara"
                : "Seu agendamento — Agenda Clara",
            text,
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) throw Error("Falha no envio");
        await stmt(
          db,
          "UPDATE notification_jobs SET state='sent',locked_until=NULL WHERE id=?",
          job.id,
        ).run();
        sent++;
      } catch {
        await stmt(
          db,
          "UPDATE notification_jobs SET state=?,locked_until=NULL,available_at=? WHERE id=?",
          job.attempts >= 5 ? "failed" : "pending",
          new Date(Date.now() + 2 ** job.attempts * 60000).toISOString(),
          job.id,
        ).run();
      }
    }
  }
  if (env.MERCADO_PAGO_ACCESS_TOKEN)
    for (const p of await rows(
      db,
      "SELECT payment_id FROM payment_events WHERE status='pending' AND mode='mercadopago' ORDER BY created_at DESC LIMIT 20",
    )) {
      try {
        await applyPayment(
          env,
          await provider(
            env,
            "/v1/payments/" + encodeURIComponent(p.payment_id),
          ),
        );
      } catch {}
    }
  return {
    sent,
    emailConfigured: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
  };
}
async function dispatch(req: Request, env: Env, path: string) {
  const db = env.DB,
    url = new URL(req.url);
  if (path === "health") {
    const settings = db ? await pixSettings(env) : null;
    return {
      database: Boolean(db),
      pix: Boolean(
        (env.MERCADO_PAGO_ACCESS_TOKEN && env.MERCADO_PAGO_WEBHOOK_SECRET) ||
        settings,
      ),
      pixMode:
        env.MERCADO_PAGO_ACCESS_TOKEN && env.MERCADO_PAGO_WEBHOOK_SECRET
          ? "mercadopago"
          : "direct",
      pixReceiver: settings?.name ?? null,
      pixCity: settings?.city ?? null,
      email: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM),
      runtime: "sites",
      operator: Boolean(
        identity(req)?.email.toLowerCase() ===
        env.PLATFORM_OWNER_EMAIL?.toLowerCase(),
      ),
    };
  }
  if (!db) throw Error("Banco de dados não foi vinculado à hospedagem");
  if (path === "session") return identity(req);
  if (path === "jobs" && req.method === "POST") return jobs(req, env);
  if (path === "webhook" && req.method === "POST") {
    if (!env.MERCADO_PAGO_WEBHOOK_SECRET)
      throw Error("Webhook não configurado");
    const dataId = url.searchParams.get("data.id") ?? "";
    const requestId = req.headers.get("x-request-id") ?? "";
    const signature = Object.fromEntries(
      (req.headers.get("x-signature") ?? "")
        .split(",")
        .map((v) => v.trim().split("=")),
    );
    const ts = Number(signature.ts);
    const timestamp = ts < 1e12 ? ts * 1000 : ts;
    if (
      !dataId ||
      !requestId ||
      !Number.isFinite(timestamp) ||
      Math.abs(Date.now() - timestamp) > 300000
    )
      throw Error("Assinatura inválida");
    const expected = await hmac(
      `id:${dataId.toLowerCase()};request-id:${requestId};ts:${signature.ts};`,
      env.MERCADO_PAGO_WEBHOOK_SECRET,
    );
    if (signature.v1 !== expected) throw Error("Assinatura inválida");
    const payment = await provider(
      env,
      "/v1/payments/" + encodeURIComponent(dataId),
    );
    await applyPayment(env, payment);
    return { received: true };
  }
  if (req.method === "GET") {
    if (path === "business")
      return business(
        db,
        short(url.searchParams.get("slug"), 1),
        url.searchParams.get("manual") ? req : undefined,
      );
    if (path === "slots")
      return slots(
        db,
        short(url.searchParams.get("slug"), 1),
        uuid.parse(url.searchParams.get("service")),
        url.searchParams.get("professional")
          ? uuid.parse(url.searchParams.get("professional"))
          : null,
        z.iso.date().parse(url.searchParams.get("day")),
        url.searchParams.get("manual") ? req : undefined,
      );
    if (path === "directory")
      return rows(
        db,
        "SELECT name,slug,segment,address FROM tenants WHERE published=1 ORDER BY name LIMIT 100",
      );
    if (path === "manage")
      return manage(req, env, { token: url.searchParams.get("token") }, true);
    if (path === "operations") {
      operator(req, env);
      return {
        tenants: (
          await rows(
            db,
            "SELECT id,name,slug,published,created_at FROM tenants ORDER BY created_at DESC LIMIT 1000",
          )
        ).map(present),
        subscriptions: await rows(
          db,
          "SELECT tenant_id,plan,status,valid_until FROM subscriptions",
        ),
        failedJobs: (
          await one(
            db,
            "SELECT count(*) n FROM notification_jobs WHERE state='failed'",
          )
        ).n,
        pendingPayments: (
          await one(
            db,
            "SELECT count(*) n FROM payment_events WHERE status='pending'",
          )
        ).n,
        payments: await paymentsForOperator(req, env),
      };
    }
    if (path === "export") {
      const tenant = uuid.parse(url.searchParams.get("tenant"));
      await member(db, req, tenant, ["owner"]);
      const result: Row = {};
      for (const table of [
        "tenants",
        "professionals",
        "services",
        "availability",
        "customers",
        "appointments",
        "subscriptions",
        "payment_events",
      ])
        result[table] = (
          await rows(
            db,
            "SELECT * FROM " +
              table +
              " WHERE " +
              (table === "tenants" ? "id" : "tenant_id") +
              "=?",
            tenant,
          )
        ).map((r: Row) => {
          delete r.manage_hash;
          delete r.idempotency_key;
          delete r.pix_code;
          return r;
        });
      return result;
    }
  }
  if (path === "branding" && req.method === "POST") {
    if (!env.BUCKET) throw Error("Armazenamento não conectado");
    const storagePath = z
      .string()
      .regex(/^[a-z0-9-]+\/(logo|cover)-[a-z0-9-]+\.(png|jpg|webp)$/)
      .parse(url.searchParams.get("path"));
    await member(db, req, uuid.parse(storagePath.split("/")[0]), ["owner"]);
    if (Number(req.headers.get("content-length")) > 2097152)
      throw Error("Limite de 2 MB por imagem");
    const type = z
      .enum(["image/png", "image/jpeg", "image/webp"])
      .parse(req.headers.get("Content-Type"));
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.length > 2097152 || bytes.length < 12)
      throw Error("Arquivo inválido ou maior que 2 MB");
    const isPng = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78;
    const isJpg = bytes[0] === 255 && bytes[1] === 216;
    const isWebp =
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    if (
      (type === "image/png" && !isPng) ||
      (type === "image/jpeg" && !isJpg) ||
      (type === "image/webp" && !isWebp)
    )
      throw Error("O conteúdo não corresponde ao tipo de imagem");
    await env.BUCKET.put(storagePath, bytes, {
      httpMetadata: { contentType: type },
    });
    return { path: storagePath };
  }
  if (req.method !== "POST") throw Error("Rota não encontrada");
  const raw = await req.text();
  if (raw.length > 20000) throw Error("Solicitação muito grande");
  const body = JSON.parse(raw);
  if (path === "pix-settings") {
    const u = operator(req, env);
    const p = z
      .object({
        name: z.string().trim().min(2).max(100),
        city: z.string().trim().min(2).max(80),
        registered: z.literal(true),
      })
      .parse(body);
    await stmt(
      db,
      "INSERT INTO platform_settings(key,value,updated_at) VALUES('pix',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
      JSON.stringify({ name: p.name, city: p.city }),
      iso(),
    ).run();
    return { configured: true, key: PIX_KEY };
  }
  if (path === "data/query") return query(req, env, body);
  if (path === "data/rpc")
    return rpc(req, env, z.string().max(60).parse(body.name), body.args ?? {});
  if (path === "book") return reserve(req, env, body);
  if (path === "manage") return manage(req, env, body);
  if (path === "pix") return makePix(req, env, body);
  if (path === "approve-payment") return manualApproval(req, env, body);
  if (path === "payment-status") {
    await member(db, req, uuid.parse(body.tenant), ["owner"]);
    const e = await one(
      db,
      "SELECT * FROM payment_events WHERE tenant_id=? AND (payment_id=? OR id=?)",
      body.tenant,
      String(body.id),
      String(body.id),
    );
    if (!e) throw Error("Cobrança não encontrada");
    if (e.mode === "direct")
      return {
        status: e.status,
        mode: e.mode,
        message:
          "A confirmação é feita pelo responsável após conferir o extrato bancário.",
      };
    const p = await provider(
      env,
      "/v1/payments/" + encodeURIComponent(e.payment_id),
    );
    await applyPayment(env, p);
    return { status: p.status, mode: "mercadopago" };
  }
  if (path === "staff-reschedule") {
    const b = await one(
      db,
      "SELECT * FROM appointments WHERE id=?",
      uuid.parse(body.id),
    );
    if (!b) throw Error("Reserva não encontrada");
    const u = await member(db, req, b.tenant_id, ["owner", "admin"]);
    if (b.status !== "confirmed") throw Error("A reserva não está confirmada");
    return changeBooking(
      req,
      env,
      b,
      "reschedule",
      date.parse(body.start),
      u.id,
    );
  }
  if (path === "invite") {
    const tenant = uuid.parse(body.tenant);
    await member(db, req, tenant, ["owner"]);
    const token = crypto.randomUUID() + crypto.randomUUID();
    await stmt(
      db,
      "INSERT INTO invites VALUES(?,?,?,?,?,?,NULL)",
      id(),
      tenant,
      z.email().parse(body.email).toLowerCase(),
      z.enum(["admin", "professional"]).parse(body.role),
      await digest(token),
      new Date(Date.now() + 7 * 86400000).toISOString(),
    ).run();
    return { url: new URL("/convite/" + token, req.url).href };
  }
  if (path === "accept-invite") {
    const u = user(req);
    const token = z.string().min(40).max(100).parse(body.token);
    const invite = await one(
      db,
      "SELECT * FROM invites WHERE token_hash=? AND accepted_at IS NULL AND expires_at>?",
      await digest(token),
      iso(),
    );
    if (!invite || invite.email !== u.email.toLowerCase())
      throw Error("Entre com o e-mail do convite. O convite pode ter expirado");
    const queries = [
      stmt(
        db,
        "INSERT INTO memberships VALUES(?,?,?)",
        invite.tenant_id,
        u.id,
        invite.role,
      ),
      stmt(
        db,
        "UPDATE invites SET accepted_at=? WHERE id=? AND accepted_at IS NULL",
        iso(),
        invite.id,
      ),
    ];
    if (invite.role === "professional") {
      const pid = id();
      queries.push(
        stmt(
          db,
          "INSERT INTO professionals(id,tenant_id,user_id,name) VALUES(?,?,?,?)",
          pid,
          invite.tenant_id,
          u.id,
          short(body.name),
        ),
      );
      for (const s of await rows(
        db,
        "SELECT id FROM services WHERE tenant_id=? AND active=1",
        invite.tenant_id,
      ))
        queries.push(
          stmt(
            db,
            "INSERT INTO professional_services VALUES(?,?,?)",
            invite.tenant_id,
            pid,
            s.id,
          ),
        );
    }
    await db.batch(queries);
    return invite.tenant_id;
  }
  throw Error("Rota não encontrada");
}
const json = (value: any, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  });
export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith("/api/")) {
        if (
          req.method === "POST" &&
          req.headers.get("Origin") &&
          req.headers.get("Origin") !== url.origin
        )
          return json({ error: "Origem inválida" }, 403);
        const result = await dispatch(req, env, url.pathname.slice(5));
        return result instanceof Response ? result : json(result);
      }
      if (url.pathname.startsWith("/brand/")) {
        const path = decodeURIComponent(url.pathname.slice(7));
        if (
          !/^[a-z0-9-]+\/(logo|cover)-[a-z0-9-]+\.(png|jpg|webp)$/.test(path) ||
          !env.BUCKET
        )
          return new Response("Imagem não encontrada", { status: 404 });
        const asset = await env.BUCKET.get(path);
        if (!asset)
          return new Response("Imagem não encontrada", { status: 404 });
        return new Response(asset.body, {
          headers: {
            "Content-Type": asset.httpMetadata?.contentType ?? "image/png",
            "Cache-Control": "public,max-age=86400",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      const asset = assets[url.pathname];
      if (asset)
        return new Response(asset.content, {
          headers: {
            "Content-Type": asset.type,
            "Cache-Control": "public,max-age=300",
          },
        });
      if (req.method !== "GET") return json({ error: "Método inválido" }, 405);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com",
        },
      });
    } catch (error) {
      const raw =
        error instanceof Error ? error.message : "Não foi possível concluir";
      const safe =
        error instanceof z.ZodError
          ? "Confira os dados informados"
          : raw.includes("UNIQUE constraint failed: tenants.slug")
            ? "Este endereço já está em uso. Escolha outro."
            : raw.includes("UNIQUE constraint failed")
              ? "Esta operação já foi registrada. Atualize a página para conferir."
              : raw.replace(/^D1_ERROR:\s*/, "").replace(/: SQLITE_.*$/, "");
      return json(
        { error: safe },
        safe.includes("Acesso") || safe.includes("Entre com") ? 403 : 400,
      );
    }
  },
};
