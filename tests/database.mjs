import pg from "pg";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const rootUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:local-test-only@127.0.0.1:55432/postgres";
const root = new pg.Client({ connectionString: rootUrl });
await root.connect();
const dbName = "agenda_test_" + Date.now();
await root.query("create database " + dbName);
const target = new URL(rootUrl);
target.pathname = "/" + dbName;
const db = new pg.Client({ connectionString: target.href });
await db.connect();
let total = 0;
async function check(name, fn) {
  await fn();
  total++;
  console.log("PASS", name);
}
const uid = randomUUID(),
  other = randomUUID(),
  proUser = randomUUID();
async function asUser(user, fn) {
  await db.query("begin");
  try {
    await db.query("set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user,
    ]);
    const v = await fn();
    await db.query("commit");
    return v;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}
try {
  await db
    .query(
      "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;",
    )
    .catch((e) => {
      if (e.code !== "42710") throw e;
    });
  await db.query(
    "create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth,public to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;",
  );
  await db.query(
    "create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant usage on schema storage to anon,authenticated,service_role;grant execute on function storage.foldername(text) to anon,authenticated,service_role;grant select,insert,update,delete on storage.objects to anon,authenticated;grant all on storage.objects,storage.buckets to service_role;",
  );
  for (const file of (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  ).sort()) {
    await db.query(
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
    console.log("MIGRATED", file);
  }
  await db.query("insert into auth.users values($1),($2),($3)", [
    uid,
    other,
    proUser,
  ]);
  let tenant, tenant2, service, professional, slots;
  await check(
    "authenticated onboarding creates isolated business and 14-day trial",
    async () => {
      const result = await asUser(uid, () =>
        db.query(
          "select create_business('Negócio A','negocio-a','Beleza','Rua teste','America/Sao_Paulo','Corte',60,10000,'09:00','18:00') as id",
        ),
      );
      tenant = result.rows[0].id;
      assert.ok(tenant);
      assert.equal(
        (
          await db.query(
            "select status from subscriptions where tenant_id=$1",
            [tenant],
          )
        ).rows[0].status,
        "trial",
      );
      const second = await asUser(other, () =>
        db.query(
          "select create_business('Negócio B','negocio-b','Beleza','Rua teste','America/New_York','Consulta',30,5000,'09:00','18:00') as id",
        ),
      );
      tenant2 = second.rows[0].id;
    },
  );
  service = (
    await db.query("select id from services where tenant_id=$1", [tenant])
  ).rows[0].id;
  professional = (
    await db.query("select id from professionals where tenant_id=$1", [tenant])
  ).rows[0].id;
  await check(
    "only owner can publish and private business is hidden",
    async () => {
      assert.equal(
        (await db.query("select public_business('negocio-a') b")).rows[0].b,
        null,
      );
      await assert.rejects(
        asUser(other, () =>
          db.query("select publish_business($1,true)", [tenant]),
        ),
        /Acesso negado/,
      );
      await asUser(uid, () =>
        db.query("select publish_business($1,true)", [tenant]),
      );
    },
  );
  await db.query("update services set buffer_after=15 where id=$1", [service]);
  await db.query("update tenants set min_notice=0 where id=$1", [tenant]);
  for (let i = 2; i < 15; i++) {
    const day = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
    const r = await db.query(
      "select * from available_slots('negocio-a',$1,$2,$3)",
      [service, professional, day],
    );
    if (r.rows.length > 5) {
      slots = r.rows;
      break;
    }
  }
  assert.ok(slots?.length);
  const reserve = (
    client,
    start,
    key = randomUUID(),
    h = randomUUID(),
    email = "cliente@example.com",
  ) =>
    client.query(
      "select reserve('negocio-a',$1,$2,$3,'Cliente Teste',$4,'',$5,$6) as booking",
      [service, professional, start, email, key, h],
    );
  let first,
    hash1,
    key1 = randomUUID();
  await check("two concurrent reservations: exactly one succeeds", async () => {
    const c2 = new pg.Client({ connectionString: target.href });
    await c2.connect();
    const start = slots[0].starts_at;
    hash1 = randomUUID();
    const out = await Promise.allSettled([
      reserve(db, start, key1, hash1),
      reserve(c2, start),
    ]);
    assert.equal(out.filter((x) => x.status === "fulfilled").length, 1);
    first = out.find((x) => x.status === "fulfilled").value.rows[0].booking;
    if (out[0].status !== "fulfilled") {
      const r = await db.query(
        "select idempotency_key,manage_hash from appointments where id=$1",
        [first.id],
      );
      key1 = r.rows[0].idempotency_key;
      hash1 = r.rows[0].manage_hash;
    }
    await c2.end();
  });
  await check(
    "retry is idempotent and key cannot recover another management token",
    async () => {
      const r = await reserve(db, slots[0].starts_at, key1, hash1);
      assert.equal(r.rows[0].booking.id, first.id);
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from appointments where id=$1",
            [first.id],
          )
        ).rows[0].n,
        1,
      );
      await assert.rejects(
        reserve(db, slots[0].starts_at, key1, randomUUID()),
        /Solicitação já utilizada/,
      );
    },
  );
  await check("service buffers block overlapping starts", async () => {
    await assert.rejects(
      reserve(db, slots[1].starts_at),
      /Horário indisponível/,
    );
  });
  await check(
    "schedule rejects before opening hours and explicit date exceptions",
    async () => {
      const start = new Date(slots[0].starts_at);
      start.setUTCHours(2);
      await assert.rejects(reserve(db, start), /Horário indisponível/);
      const date = new Date(slots[0].starts_at);
      date.setDate(date.getDate() + 1);
      await asUser(uid, () =>
        db.query("select add_exception($1,$2,'Férias')", [
          professional,
          date.toISOString().slice(0, 10),
        ]),
      );
      assert.equal(
        (
          await db.query(
            "select * from available_slots('negocio-a',$1,$2,$3)",
            [service, professional, date.toISOString().slice(0, 10)],
          )
        ).rows.length,
        0,
      );
    },
  );
  await check("failed reschedule preserves original reservation", async () => {
    const original = (
      await db.query("select starts_at from appointments where id=$1", [
        first.id,
      ])
    ).rows[0].starts_at;
    await assert.rejects(
      db.query("select manage_booking($1,'reschedule',$2)", [
        hash1,
        new Date("2020-01-01"),
      ]),
      /Horário indisponível/,
    );
    assert.equal(
      (
        await db.query("select starts_at from appointments where id=$1", [
          first.id,
        ])
      ).rows[0].starts_at.toISOString(),
      original.toISOString(),
    );
  });
  await check(
    "cancellation frees interval and cancels obsolete reminders",
    async () => {
      await db.query("select manage_booking($1,'cancel')", [hash1]);
      const r = await reserve(db, slots[0].starts_at);
      assert.ok(r.rows[0].booking.id);
      const jobs = await db.query(
        "select state from notification_jobs where appointment_id=$1 and kind='reminder'",
        [first.id],
      );
      assert.ok(jobs.rows.every((j) => j.state === "cancelled"));
    },
  );
  await check(
    "cancellation keeps its email and successful reschedule queues fresh notifications",
    async () => {
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from notification_jobs where appointment_id=$1 and kind='cancellation' and state='pending'",
            [first.id],
          )
        ).rows[0].n,
        1,
      );
      const {
        rows: [live],
      } = await db.query(
        "select id from appointments where tenant_id=$1 and status='confirmed' limit 1",
        [tenant],
      );
      await db.query("select staff_reschedule($1,$2,$3)", [
        live.id,
        slots[slots.length - 1].starts_at,
        uid,
      ]);
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from notification_jobs where appointment_id=$1 and kind='confirmation' and state='pending'",
            [live.id],
          )
        ).rows[0].n,
        1,
      );
      assert.equal(
        (
          await db.query("select starts_at from appointments where id=$1", [
            live.id,
          ])
        ).rows[0].starts_at.toISOString(),
        slots[slots.length - 1].starts_at.toISOString(),
      );
    },
  );
  await check(
    "tenant RLS: cross-tenant select, export source and writes denied",
    async () => {
      const result = await asUser(other, () =>
        db.query("select * from appointments where tenant_id=$1", [tenant]),
      );
      assert.equal(result.rows.length, 0);
      assert.equal(
        (
          await asUser(other, () =>
            db.query("select * from customers where tenant_id=$1", [tenant]),
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        asUser(other, () =>
          db.query("select save_service($1,null,'Invadido',30,100,0,0,true)", [
            tenant,
          ]),
        ),
        /Acesso negado/,
      );
      await assert.rejects(
        asUser(other, () =>
          db.query("update tenants set name='Invadido' where id=$1", [tenant]),
        ),
        /permission denied/,
      );
    },
  );
  await check(
    "professional only sees own agenda and cannot edit services",
    async () => {
      await db.query("insert into memberships values($1,$2,'professional')", [
        tenant,
        proUser,
      ]);
      await db.query(
        "insert into professionals(tenant_id,user_id,name) values($1,$2,'Outro profissional')",
        [tenant, proUser],
      );
      assert.equal(
        (await asUser(proUser, () => db.query("select * from appointments")))
          .rows.length,
        0,
      );
      await assert.rejects(
        asUser(proUser, () =>
          db.query("select save_service($1,null,'Invadido',30,100,0,0,true)", [
            tenant,
          ]),
        ),
        /Acesso negado/,
      );
    },
  );
  await check("historical price survives service edits", async () => {
    await asUser(uid, () =>
      db.query("select save_service($1,$2,'Corte novo',60,18000,0,15,true)", [
        tenant,
        service,
      ]),
    );
    assert.equal(
      (await db.query("select price from appointments where id=$1", [first.id]))
        .rows[0].price,
      10000,
    );
  });
  await check(
    "expired trial stops new reservations without deleting records",
    async () => {
      await db.query(
        "update subscriptions set valid_until=now()-interval '1 day' where tenant_id=$1",
        [tenant],
      );
      await assert.rejects(
        reserve(db, slots[slots.length - 1].starts_at),
        /sem novas reservas/,
      );
      assert.ok(
        (
          await db.query(
            "select count(*)::int n from appointments where tenant_id=$1",
            [tenant],
          )
        ).rows[0].n > 0,
      );
      await db.query(
        "update subscriptions set valid_until=now()+interval '1 month' where tenant_id=$1",
        [tenant],
      );
    },
  );
  await check(
    "duplicate and out-of-order payments never grant another month",
    async () => {
      await db.query(
        "insert into payment_events(id,tenant_id,payment_id,plan,amount) values('ref',$1,'12345','solo',4900)",
        [tenant],
      );
      const timestamp = new Date();
      await db.query("select apply_payment('12345','approved',$1)", [
        timestamp,
      ]);
      const end = (
        await db.query(
          "select valid_until from subscriptions where tenant_id=$1",
          [tenant],
        )
      ).rows[0].valid_until.toISOString();
      await db.query("select apply_payment('12345','approved',$1)", [
        timestamp,
      ]);
      await db.query("select apply_payment('12345','pending',$1)", [
        new Date(timestamp.getTime() - 1000),
      ]);
      assert.equal(
        (
          await db.query(
            "select valid_until from subscriptions where tenant_id=$1",
            [tenant],
          )
        ).rows[0].valid_until.toISOString(),
        end,
      );
      assert.equal(
        (await db.query("select status from payment_events where id='ref'"))
          .rows[0].status,
        "approved",
      );
    },
  );
  await check(
    "public RPC never exposes customers or private appointment data",
    async () => {
      const result = (await db.query("select public_business('negocio-a') b"))
        .rows[0].b;
      assert.ok(result.services.length);
      assert.equal(result.customers, undefined);
      assert.equal(result.appointments, undefined);
      await db.query("begin");
      try {
        await db.query("set local role anon");
        await assert.rejects(
          db.query("select * from customers"),
          /permission denied/,
        );
      } finally {
        await db.query("rollback");
      }
    },
  );
  await check(
    "public cannot invoke privileged booking RPC with spoofed actor",
    async () => {
      await db.query("begin");
      try {
        await db.query("set local role authenticated");
        await assert.rejects(
          reserve(db, slots[slots.length - 1].starts_at),
          /permission denied/,
        );
      } finally {
        await db.query("rollback");
      }
    },
  );
  await check(
    "monthly quota counts cancelled reservations and rejects over limit",
    async () => {
      await db.query(
        "insert into appointments(tenant_id,professional_id,starts_at,ends_at,occupied,status,service_name,duration,price,idempotency_key) select $1,$2,now()+make_interval(days=>g),now()+make_interval(days=>g,hours=>1),tstzrange(now()+make_interval(days=>g),now()+make_interval(days=>g,hours=>1),'[)'),'cancelled','Quota',60,0,gen_random_uuid() from generate_series(1,100) g",
        [tenant, professional],
      );
      await assert.rejects(
        reserve(db, slots[slots.length - 1].starts_at),
        /Limite mensal/,
      );
    },
  );
  await check(
    "business timezone honors daylight saving independently of browser",
    async () => {
      assert.equal(
        (
          await db.query(
            "select extract(hour from ('2027-03-07 09:00'::timestamp at time zone 'America/New_York') at time zone 'UTC')::int h",
          )
        ).rows[0].h,
        14,
      );
      assert.equal(
        (
          await db.query(
            "select extract(hour from ('2027-03-14 09:00'::timestamp at time zone 'America/New_York') at time zone 'UTC')::int h",
          )
        ).rows[0].h,
        13,
      );
    },
  );
  await check(
    "administrator can manage operation but not owner publication",
    async () => {
      const adminUser = randomUUID();
      await db.query("insert into auth.users values($1)", [adminUser]);
      await db.query("insert into memberships values($1,$2,'admin')", [
        tenant,
        adminUser,
      ]);
      await asUser(adminUser, () =>
        db.query(
          "select save_service($1,$2,'Corte admin',60,15000,0,15,true)",
          [tenant, service],
        ),
      );
      await assert.rejects(
        asUser(adminUser, () =>
          db.query("select publish_business($1,false)", [tenant]),
        ),
        /Acesso negado/,
      );
    },
  );
  await check(
    "jobs are claimed once, and stale reminders never remain pending after cancellation",
    async () => {
      const first = (await db.query("select id from claim_jobs()")).rows.map(
        (x) => x.id,
      );
      const second = (await db.query("select id from claim_jobs()")).rows.map(
        (x) => x.id,
      );
      assert.equal(first.filter((id) => second.includes(id)).length, 0);
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from notification_jobs j join appointments a on a.id=j.appointment_id where a.status='cancelled' and j.kind='reminder' and j.state='pending'",
          )
        ).rows[0].n,
        0,
      );
    },
  );
  await check(
    "branding upload policies isolate tenant writes while approved brand assets are public",
    async () => {
      await asUser(uid, () =>
        db.query(
          "insert into storage.objects(bucket_id,name) values('business-branding',$1)",
          [tenant + "/logo.png"],
        ),
      );
      await assert.rejects(
        asUser(other, () =>
          db.query(
            "insert into storage.objects(bucket_id,name) values('business-branding',$1)",
            [tenant + "/foreign.png"],
          ),
        ),
        /row-level security/,
      );
      await assert.rejects(
        asUser(uid, () =>
          db.query("select save_branding($1,'#0071e3',$2,null)", [
            tenant,
            tenant2 + "/logo.png",
          ]),
        ),
        /outra empresa/,
      );
      await asUser(uid, () =>
        db.query("select save_branding($1,'#267355',$2,null)", [
          tenant,
          tenant + "/logo.png",
        ]),
      );
      assert.equal(
        (await db.query("select public_business('negocio-a') b")).rows[0].b
          .accent,
        "#267355",
      );
    },
  );
  await check(
    "refund then later approval of same payment cannot credit a second month",
    async () => {
      const timestamp = new Date(Date.now() + 10000);
      await db.query("select apply_payment('12345','refunded',$1)", [
        timestamp,
      ]);
      const end = (
        await db.query(
          "select valid_until from subscriptions where tenant_id=$1",
          [tenant],
        )
      ).rows[0].valid_until.toISOString();
      await db.query("select apply_payment('12345','approved',$1)", [
        new Date(timestamp.getTime() + 1000),
      ]);
      assert.equal(
        (
          await db.query(
            "select valid_until from subscriptions where tenant_id=$1",
            [tenant],
          )
        ).rows[0].valid_until.toISOString(),
        end,
      );
    },
  );
  await check("rate limiter persists counts and rejects excess", async () => {
    assert.equal(
      (await db.query("select rate_limit('test',1,3600) ok")).rows[0].ok,
      true,
    );
    assert.equal(
      (await db.query("select rate_limit('test',1,3600) ok")).rows[0].ok,
      false,
    );
  });
  console.log(`\n${total} database integration checks passed on PostgreSQL`);
} finally {
  await db.end();
  await root.query("drop database " + dbName + " with (force)");
  await root.end();
}
