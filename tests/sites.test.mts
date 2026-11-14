import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { crc16, pixPayload } from "../hosted/pix";
execFileSync(process.execPath, ["scripts/build-sites.mjs"], {
  cwd: new URL("..", import.meta.url),
  stdio: "pipe",
});
const worker = (await import("../dist/server/index.js" as string)).default;
class Statement {
  db: DatabaseSync;
  sql: string;
  args: any[] = [];
  constructor(db: DatabaseSync, sql: string) {
    this.db = db;
    this.sql = sql;
  }
  bind(...args: any[]) {
    this.args = args;
    return this;
  }
  async first() {
    return this.db.prepare(this.sql).get(...this.args) ?? null;
  }
  async all() {
    return { results: this.db.prepare(this.sql).all(...this.args) };
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...this.args);
    return { success: true, meta: { changes: Number(r.changes) } };
  }
}
class Database {
  db = new DatabaseSync(":memory:");
  prepare(sql: string) {
    return new Statement(this.db, sql);
  }
  async batch(statements: Statement[]) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const values = statements.map((s) => {
        const q = this.db.prepare(s.sql);
        if (q.columns().length) return { results: q.all(...s.args) };
        const r = q.run(...s.args);
        return { success: true, meta: { changes: Number(r.changes) } };
      });
      this.db.exec("COMMIT");
      return values;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
const base = "https://agenda.example.test";
const owner = { id: "owner-1", email: "owner@example.test" },
  other = { id: "other-2", email: "other@example.test" };
function fixture() {
  const DB = new Database();
  DB.db.exec(
    readFileSync(
      new URL("../hosted/migrations/0000_core.sql", import.meta.url),
      "utf8",
    ),
  );
  DB.db.exec(
    readFileSync(
      new URL("../hosted/migrations/0001_pix_settings.sql", import.meta.url),
      "utf8",
    ),
  );
  const env = {
    DB,
    MANAGEMENT_SECRET: "only-a-local-test-secret",
    PLATFORM_OWNER_EMAIL: owner.email,
    PIX_RECEIVER_NAME: "TITULAR TESTE",
    PIX_RECEIVER_CITY: "SAO PAULO",
  };
  return { DB, env };
}
async function request(
  env: any,
  path: string,
  body?: unknown,
  actor: any = owner,
) {
  const response = await worker.fetch(
    new Request(base + "/api/" + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
        ...(actor
          ? {
              "oai-authenticated-user-id": actor.id,
              "oai-authenticated-user-email": actor.email,
            }
          : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env,
  );
  return { status: response.status, data: await response.json() };
}
const rpc = (env: any, name: string, args: any, actor: any = owner) =>
  request(env, "data/rpc", { name, args }, actor);
async function business(env: any, slug: string, actor: any = owner) {
  const r = await rpc(
    env,
    "create_business",
    {
      p_name: "Negócio de teste",
      p_slug: slug,
      p_segment: "Serviços",
      p_address: "Endereço fictício de teste",
      p_timezone: "America/Sao_Paulo",
      p_service: "Serviço de teste",
      p_duration: 60,
      p_price: 12000,
      p_start: "09:00",
      p_end: "18:00",
    },
    actor,
  );
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const tenant = r.data;
  await rpc(
    env,
    "publish_business",
    { p_tenant: tenant, p_published: true },
    actor,
  );
  const publicBiz = (
    await request(env, "business?slug=" + slug, undefined, null)
  ).data;
  return { tenant, publicBiz };
}
async function freeSlot(env: any, b: any) {
  for (let day = 2; day < 14; day++) {
    const date = new Date(Date.now() + day * 86400000)
      .toISOString()
      .slice(0, 10);
    const r = await request(
      env,
      `slots?slug=${b.slug}&service=${b.services[0].id}&day=${date}`,
      undefined,
      null,
    );
    if (r.data.length) return r.data;
  }
  throw Error("No fixture slot");
}
function input(b: any, slot: any, key = crypto.randomUUID()) {
  return {
    slug: b.slug,
    service: b.services[0].id,
    professional: slot.professional_id,
    start: slot.starts_at,
    name: "Cliente fictício",
    email: "test-client@example.test",
    key,
    phone: "",
  };
}

test("Sites runtime: real API, persistent SQLite/D1 transactions and Pix lifecycle", async (t) => {
  const { env, DB } = fixture();
  const { tenant, publicBiz: b } = await business(env, "negocio-teste");
  const slots = await freeSlot(env, b);
  let saved: any;
  let payload: any;
  await t.test(
    "onboarding persists business and public projection excludes private data",
    async () => {
      assert.ok(tenant);
      assert.equal(
        (await request(env, "directory", undefined, null)).data.length,
        1,
      );
      assert.equal(b.customers, undefined);
      assert.equal(b.appointments, undefined);
      assert.ok(b.services[0].id);
    },
  );
  await t.test(
    "public reservation works without a customer account and survives a new request",
    async () => {
      payload = input(b, slots[0]);
      const r = await request(env, "book", payload, null);
      assert.equal(r.status, 200, JSON.stringify(r.data));
      saved = r.data;
      assert.ok(saved.id);
      assert.ok(saved.token.length >= 40);
      const read = await request(
        env,
        "manage?token=" + saved.token,
        undefined,
        null,
      );
      assert.equal(read.data.id, saved.id);
      const list = await request(env, "data/query", {
        table: "appointments",
        filters: { tenant_id: tenant },
      });
      assert.equal(list.data.length, 1);
      assert.equal(list.data[0].customers.email, "test-client@example.test");
      assert.equal(list.data[0].manage_hash, undefined);
    },
  );
  await t.test(
    "repeated request returns the same booking and no duplicate notification",
    async () => {
      const retry = await request(env, "book", payload, null);
      assert.equal(retry.status, 200);
      assert.equal(retry.data.id, saved.id);
      assert.equal(
        DB.db.prepare("select count(*) n from appointments").get()?.n,
        1,
      );
      assert.equal(
        DB.db
          .prepare(
            "select count(*) n from notification_jobs where kind='confirmation'",
          )
          .get()?.n,
        1,
      );
    },
  );
  await t.test("two users reserving one interval: only one wins", async () => {
    const selected = slots[slots.length - 1];
    const r = await Promise.all([
      request(env, "book", input(b, selected), null),
      request(env, "book", input(b, selected), null),
    ]);
    assert.equal(r.filter((x) => x.status === 200).length, 1);
    assert.equal(r.filter((x) => x.status !== 200).length, 1);
  });
  await t.test(
    "database rejects overlapping appointments even without availability lookup",
    async () => {
      const original = DB.db
        .prepare("select * from appointments limit 1")
        .get() as any;
      assert.throws(
        () =>
          DB.db
            .prepare(
              "insert into appointments(id,tenant_id,professional_id,service_id,customer_id,starts_at,ends_at,occupied_start,occupied_end,service_name,duration,price,manage_hash,idempotency_key,created_at) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            )
            .run(
              crypto.randomUUID(),
              original.tenant_id,
              original.professional_id,
              original.service_id,
              original.customer_id,
              original.starts_at,
              original.ends_at,
              original.occupied_start,
              original.occupied_end,
              "Concorrente",
              60,
              12000,
              "randomhash",
              crypto.randomUUID(),
              new Date().toISOString(),
            ),
        /Horário/,
      );
    },
  );
  await t.test(
    "server rejects cross-tenant reads, service edits and exports",
    async () => {
      await business(env, "outro-negocio", other);
      const list = await request(
        env,
        "data/query",
        { table: "appointments", filters: { tenant_id: tenant } },
        other,
      );
      assert.notEqual(list.status, 200);
      assert.notEqual(
        (await request(env, "export?tenant=" + tenant, undefined, other))
          .status,
        200,
      );
      assert.notEqual(
        (
          await rpc(
            env,
            "save_service",
            {
              p_tenant: tenant,
              p_id: null,
              p_name: "Intrusão",
              p_duration: 60,
              p_price: 0,
              p_before: 0,
              p_after: 0,
              p_active: true,
            },
            other,
          )
        ).status,
        200,
      );
    },
  );
  await t.test("failed reschedule keeps the original booking", async () => {
    const prior = (
      await request(env, "manage?token=" + saved.token, undefined, null)
    ).data.starts_at;
    const r = await request(
      env,
      "manage",
      {
        token: saved.token,
        action: "reschedule",
        start: "2020-01-01T12:00:00Z",
      },
      null,
    );
    assert.notEqual(r.status, 200);
    assert.equal(
      (await request(env, "manage?token=" + saved.token, undefined, null)).data
        .starts_at,
      prior,
    );
  });
  await t.test(
    "successful reschedule changes one booking and replaces reminders",
    async () => {
      const r = await request(
        env,
        "manage",
        { token: saved.token, action: "reschedule", start: slots[5].starts_at },
        null,
      );
      assert.equal(r.status, 200, JSON.stringify(r.data));
      const read = (
        await request(env, "manage?token=" + saved.token, undefined, null)
      ).data;
      assert.equal(read.starts_at, slots[5].starts_at);
      assert.equal(
        DB.db
          .prepare(
            "select count(*) n from notification_jobs where appointment_id=? and kind='confirmation' and state='pending'",
          )
          .get(saved.id)?.n,
        1,
      );
    },
  );
  await t.test(
    "explicit cancellation frees the slot, queues cancellation and invalidates reminders",
    async () => {
      const r = await request(
        env,
        "manage",
        { token: saved.token, action: "cancel" },
        null,
      );
      assert.equal(r.status, 200);
      assert.equal(
        (await request(env, "manage?token=" + saved.token, undefined, null))
          .data.status,
        "cancelled",
      );
      assert.equal(
        DB.db
          .prepare(
            "select count(*) n from notification_jobs where appointment_id=? and kind='reminder' and state='pending'",
          )
          .get(saved.id)?.n,
        0,
      );
      assert.equal(
        DB.db
          .prepare(
            "select count(*) n from notification_jobs where appointment_id=? and kind='cancellation' and state='pending'",
          )
          .get(saved.id)?.n,
        1,
      );
    },
  );
  await t.test(
    "invalid tokens and anonymous admin requests fail closed",
    async () => {
      assert.notEqual(
        (await request(env, "manage?token=" + "a".repeat(64), undefined, null))
          .status,
        200,
      );
      assert.notEqual(
        (
          await request(
            env,
            "data/query",
            { table: "appointments", filters: { tenant_id: tenant } },
            null,
          )
        ).status,
        200,
      );
    },
  );
  await t.test(
    "Pix generates valid BR Code for the registered key, fixed amount and reference",
    async () => {
      const r = await request(env, "pix", {
        tenant,
        plan: "solo",
        key: crypto.randomUUID(),
      });
      assert.equal(r.status, 200, JSON.stringify(r.data));
      assert.equal(r.data.mode, "direct");
      assert.ok(r.data.code.includes("+5511949345361"));
      assert.ok(r.data.code.includes("540549.00"));
      assert.equal(crc16(r.data.code.slice(0, -4)), r.data.code.slice(-4));
      saved.pix = r.data;
    },
  );
  await t.test(
    "client clicking already paid never activates the plan",
    async () => {
      const r = await request(env, "payment-status", {
        tenant,
        id: saved.pix.id,
      });
      assert.equal(r.data.status, "pending");
      assert.equal(
        DB.db
          .prepare("select plan from subscriptions where tenant_id=?")
          .get(tenant)?.plan,
        "trial",
      );
    },
  );
  await t.test(
    "non-operator cannot approve Pix; operator must explicitly confirm bank statement",
    async () => {
      assert.notEqual(
        (
          await request(
            env,
            "approve-payment",
            { id: saved.pix.id, confirmed: true },
            other,
          )
        ).status,
        200,
      );
      assert.notEqual(
        (
          await request(env, "approve-payment", {
            id: saved.pix.id,
            confirmed: false,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request(env, "approve-payment", {
            id: saved.pix.id,
            confirmed: true,
          })
        ).status,
        200,
      );
      assert.equal(
        DB.db
          .prepare("select plan from subscriptions where tenant_id=?")
          .get(tenant)?.plan,
        "solo",
      );
      const end = DB.db
        .prepare("select valid_until from subscriptions where tenant_id=?")
        .get(tenant)?.valid_until;
      await request(env, "approve-payment", {
        id: saved.pix.id,
        confirmed: true,
      });
      assert.equal(
        DB.db
          .prepare("select valid_until from subscriptions where tenant_id=?")
          .get(tenant)?.valid_until,
        end,
      );
    },
  );
  await t.test(
    "expired trial blocks new reservations and preserves existing data",
    async () => {
      DB.db
        .prepare(
          "update subscriptions set valid_until='2020-01-01T00:00:00.000Z' where tenant_id=?",
        )
        .run(tenant);
      const r = await request(env, "book", input(b, slots[8]), null);
      assert.notEqual(r.status, 200);
      assert.match(r.data.error, /sem novas reservas/);
      assert.ok(
        Number(DB.db.prepare("select count(*) n from appointments").get()?.n) >
          0,
      );
    },
  );
  await t.test(
    "CSRF origin mismatch rejected and operator view omits customer data",
    async () => {
      const response = await worker.fetch(
        new Request(base + "/api/book", {
          method: "POST",
          headers: { Origin: "https://evil.example" },
          body: "{}",
        }),
        env,
      );
      assert.equal(response.status, 403);
      const ops = await request(env, "operations");
      assert.equal(ops.status, 200);
      assert.equal(ops.data.customers, undefined);
      assert.equal(ops.data.appointments, undefined);
    },
  );
  DB.db.close();
});
test("Pix payload never invents missing receiver metadata", () => {
  assert.throws(
    () =>
      pixPayload({
        key: "+5511949345361",
        name: "",
        city: "",
        amount: 4900,
        reference: "TESTE",
      }),
    /titular/,
  );
});
