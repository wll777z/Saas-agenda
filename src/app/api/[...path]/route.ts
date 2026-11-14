import { NextResponse } from "next/server";
import { z } from "zod";
import {
  admin,
  user,
  owner,
  hash,
  managementToken,
  mp,
  origin,
  safeEqual,
  verifyWebhook,
} from "@/lib/server";
import { plans } from "@/lib/config";
export const runtime = "nodejs";
const uuid = z.string().uuid();
const booking = z.object({
  slug: z.string().min(1).max(100),
  service: uuid,
  professional: uuid,
  start: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z.string().max(30).default(""),
  key: uuid,
  manual: z.boolean().default(false),
});
async function rpc(
  db: ReturnType<typeof admin>,
  name: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}
async function reconcile(id: string) {
  const db = admin();
  const p = await mp("/v1/payments/" + encodeURIComponent(id));
  const { data: e } = await db
    .from("payment_events")
    .select("*")
    .eq("payment_id", String(p.id))
    .single();
  if (
    !e ||
    e.id !== p.external_reference ||
    p.currency_id !== "BRL" ||
    Math.round(Number(p.transaction_amount) * 100) !== e.amount
  )
    throw new Error("Cobrança não corresponde ao registro");
  await rpc(db, "apply_payment", {
    p_payment: String(p.id),
    p_status: p.status,
    p_updated: p.date_last_updated,
  });
  return p;
}
async function handle(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await ctx.params;
    const route = path.join("/");
    const url = new URL(req.url);
    if (route === "health")
      return NextResponse.json({
        database: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        pix: Boolean(
          process.env.MERCADO_PAGO_ACCESS_TOKEN &&
          process.env.MERCADO_PAGO_WEBHOOK_SECRET,
        ),
        email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      });
    if (route === "webhook" && req.method === "POST") {
      const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
      if (!secret)
        return NextResponse.json(
          { error: "Webhook não configurado" },
          { status: 503 },
        );
      const id = url.searchParams.get("data.id") ?? "";
      if (
        !verifyWebhook(
          req.headers.get("x-signature") ?? "",
          req.headers.get("x-request-id") ?? "",
          id,
          secret,
        )
      )
        return NextResponse.json(
          { error: "Assinatura inválida" },
          { status: 401 },
        );
      if (
        url.searchParams.get("type") &&
        url.searchParams.get("type") !== "payment"
      )
        return NextResponse.json({ received: true });
      if (!/^\d+$/.test(id))
        return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
      await reconcile(id);
      return NextResponse.json({ received: true });
    }
    if (route === "jobs" && req.method === "POST") {
      if (
        !process.env.CRON_SECRET ||
        !safeEqual(
          req.headers.get("Authorization") ?? "",
          "Bearer " + process.env.CRON_SECRET,
        )
      )
        return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
      const db = admin();
      const emailReady = Boolean(
        process.env.RESEND_API_KEY && process.env.EMAIL_FROM,
      );
      const jobs = emailReady ? await rpc(db, "claim_jobs", {}) : [];
      let sent = 0;
      for (const job of jobs) {
        const { data: currentJob } = await db
          .from("notification_jobs")
          .select("state")
          .eq("id", job.id)
          .single();
        if (currentJob?.state !== "sending") continue;
        const { data: b } = await db
          .from("appointments")
          .select("*,tenants(name,slug,timezone)")
          .eq("id", job.appointment_id)
          .single();
        if (!b || (job.kind !== "cancellation" && b.status !== "confirmed")) {
          await db
            .from("notification_jobs")
            .update({ state: "cancelled" })
            .eq("id", job.id);
          continue;
        }
        const token = managementToken(b.tenants.slug, b.idempotency_key);
        const date = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: b.tenants.timezone,
        }).format(new Date(b.starts_at));
        const text =
          job.kind === "cancellation"
            ? `Sua reserva de ${b.service_name} em ${b.tenants.name} foi cancelada.`
            : `${job.kind === "reminder" ? "Lembrete" : "Agendamento confirmado"}: ${b.service_name} em ${b.tenants.name}, ${date} (${b.tenants.timezone}). Gerencie: ${origin()}/reserva/${token}`;
        try {
          const r = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: "Bearer " + process.env.RESEND_API_KEY,
              "Content-Type": "application/json",
              "Idempotency-Key": job.id,
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM,
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
          await db
            .from("notification_jobs")
            .update({ state: "sent", locked_until: null })
            .eq("id", job.id);
          sent++;
        } catch {
          await db
            .from("notification_jobs")
            .update({
              state: job.attempts >= 5 ? "failed" : "pending",
              available_at: new Date(
                Date.now() + Math.pow(2, job.attempts) * 60000,
              ).toISOString(),
              locked_until: null,
            })
            .eq("id", job.id);
        }
      }
      // Reconcile pending payments even if a webhook was missed.
      const { data: pending } = await db
        .from("payment_events")
        .select("payment_id")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      for (const p of pending ?? []) {
        try {
          await reconcile(p.payment_id);
        } catch {
          /* retry on next run */
        }
      }
      return NextResponse.json({ sent, emailConfigured: emailReady });
    }
    if (req.method === "GET") {
      if (route === "business") {
        const slug = z
          .string()
          .min(1)
          .max(100)
          .parse(url.searchParams.get("slug"));
        if (url.searchParams.get("manual")) {
          const { db, user: u } = await user(req);
          const { data: t } = await db
            .from("tenants")
            .select("*")
            .eq("slug", slug)
            .single();
          if (!t) throw Error("Negócio não encontrado");
          const { data: m } = await db
            .from("memberships")
            .select("role")
            .eq("tenant_id", t.id)
            .eq("user_id", u.id)
            .single();
          if (!m || !["owner", "admin"].includes(m.role))
            throw Error("Acesso negado");
          const { data: s } = await db
            .from("services")
            .select("id,name,duration,price")
            .eq("tenant_id", t.id)
            .eq("active", true);
          const { data: p } = await db
            .from("professionals")
            .select("id,name")
            .eq("tenant_id", t.id)
            .eq("active", true);
          return NextResponse.json({ ...t, services: s, professionals: p });
        }
        return NextResponse.json(
          await rpc(admin(), "public_business", { p_slug: slug }),
        );
      }
      if (route === "slots") {
        let priv = false;
        if (url.searchParams.get("manual")) {
          const { db, user: u } = await user(req);
          const { data: t } = await db
            .from("tenants")
            .select("id")
            .eq("slug", url.searchParams.get("slug"))
            .single();
          const { data: m } = await db
            .from("memberships")
            .select("role")
            .eq("tenant_id", t?.id)
            .eq("user_id", u.id)
            .single();
          if (!m || !["owner", "admin"].includes(m.role))
            throw Error("Acesso negado");
          priv = true;
        }
        return NextResponse.json(
          await rpc(admin(), priv ? "core_slots" : "available_slots", {
            p_slug: z.string().max(100).parse(url.searchParams.get("slug")),
            p_service: uuid.parse(url.searchParams.get("service")),
            p_professional: url.searchParams.get("professional")
              ? uuid.parse(url.searchParams.get("professional"))
              : null,
            p_day: z.iso.date().parse(url.searchParams.get("day")),
            ...(priv ? { p_private: true } : {}),
          }),
        );
      }
      if (route === "manage") {
        const token = z
          .string()
          .min(40)
          .max(100)
          .parse(url.searchParams.get("token"));
        return NextResponse.json(
          await rpc(admin(), "manage_booking", {
            p_hash: hash(token),
            p_action: "read",
          }),
        );
      }
      if (route === "operations") {
        const { db, user: u } = await user(req);
        const { data: op } = await db
          .from("platform_operators")
          .select("user_id")
          .eq("user_id", u.id)
          .single();
        if (!op) throw Error("Acesso restrito ao operador da plataforma");
        const [t, s, j, p] = await Promise.all([
          db
            .from("tenants")
            .select("id,name,slug,published,created_at")
            .order("created_at", { ascending: false })
            .limit(1000),
          db
            .from("subscriptions")
            .select("tenant_id,plan,status,valid_until")
            .limit(1000),
          db
            .from("notification_jobs")
            .select("id", { count: "exact", head: true })
            .eq("state", "failed"),
          db
            .from("payment_events")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending"),
        ]);
        if (t.error || s.error || j.error || p.error)
          throw Error("Falha na consulta operacional");
        return NextResponse.json({
          tenants: t.data,
          subscriptions: s.data,
          failedJobs: j.count,
          pendingPayments: p.count,
        });
      }
      if (route === "export") {
        const tenant = uuid.parse(url.searchParams.get("tenant"));
        const { db } = await owner(req, tenant);
        const output: Record<string, unknown> = {};
        for (const table of [
          "tenants",
          "professionals",
          "services",
          "availability",
          "customers",
          "appointments",
          "subscriptions",
          "payment_events",
        ]) {
          const { data, error } = await db
            .from(table)
            .select("*")
            .eq(table === "tenants" ? "id" : "tenant_id", tenant);
          if (error) throw Error("Falha na exportação");
          output[table] = data?.map(({ manage_hash, ...rest }) => rest);
        }
        return new Response(JSON.stringify(output, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition":
              'attachment; filename="agenda-clara-dados.json"',
          },
        });
      }
    }
    if (req.method !== "POST")
      return NextResponse.json({ error: "Método inválido" }, { status: 405 });
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 20000) throw Error("Solicitação muito grande");
    const raw = await req.text();
    if (raw.length > 20000) throw Error("Solicitação muito grande");
    const body = JSON.parse(raw);
    if (route === "book") {
      const b = booking.parse(body);
      const db = admin();
      // Host must overwrite forwarded headers; no in-memory limiter.
      const ip =
        req.headers.get("x-real-ip") ??
        req.headers.get("x-forwarded-for")?.split(",")[0] ??
        "unknown";
      if (
        !(await rpc(db, "rate_limit", {
          p_key: "booking:" + hash(ip + ":" + b.email.toLowerCase()),
          p_limit: 12,
          p_seconds: 3600,
        }))
      )
        return NextResponse.json(
          { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
          { status: 429 },
        );
      let actor = null;
      if (b.manual) {
        const u = await user(req);
        actor = u.user.id;
      }
      const token = managementToken(b.slug, b.key);
      const data = await rpc(db, "reserve", {
        p_slug: b.slug,
        p_service: b.service,
        p_professional: b.professional,
        p_start: b.start,
        p_name: b.name,
        p_email: b.email,
        p_phone: b.phone,
        p_key: b.key,
        p_hash: hash(token),
        p_manual: b.manual,
        p_actor: actor,
      });
      return NextResponse.json({ ...data, token });
    }
    if (route === "manage") {
      const b = z
        .object({
          token: z.string().min(40).max(100),
          action: z.enum(["cancel", "reschedule"]),
          start: z.iso.datetime({ offset: true }).optional(),
        })
        .parse(body);
      return NextResponse.json(
        await rpc(admin(), "manage_booking", {
          p_hash: hash(b.token),
          p_action: b.action,
          p_start: b.start ?? null,
        }),
      );
    }
    if (route === "pix") {
      const b = z
        .object({ tenant: uuid, plan: z.enum(["solo", "team"]), key: uuid })
        .parse(body);
      const { db, user: u } = await owner(req, b.tenant);
      if (!process.env.MERCADO_PAGO_WEBHOOK_SECRET)
        throw Error("Configure o webhook seguro antes de receber pagamentos");
      const { data: sub } = await db
        .from("subscriptions")
        .select("*")
        .eq("tenant_id", b.tenant)
        .single();
      if (
        sub?.status === "active" &&
        new Date(sub.valid_until) > new Date() &&
        sub.plan !== b.plan
      )
        throw Error(
          "A troca de plano fica disponível ao encerrar o período atual",
        );
      const plan = plans[b.plan];
      const [pros, services] = await Promise.all([
        db
          .from("professionals")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", b.tenant)
          .eq("active", true),
        db
          .from("services")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", b.tenant)
          .eq("active", true),
      ]);
      if (pros.error || services.error)
        throw Error("Falha ao conferir os limites do plano");
      if (
        (pros.count ?? 0) > plan.professionals ||
        (services.count ?? 0) > plan.services
      )
        throw Error(
          "Desative profissionais ou serviços excedentes antes de contratar este plano",
        );
      const ref = b.tenant + ":" + b.plan + ":" + b.key;
      const p = await mp("/v1/payments", {
        method: "POST",
        headers: { "X-Idempotency-Key": b.key },
        body: JSON.stringify({
          transaction_amount: plan.price / 100,
          description: "Agenda Clara — " + plan.name + " — um mês",
          payment_method_id: "pix",
          payer: { email: u.email },
          external_reference: ref,
          notification_url: origin() + "/api/webhook",
          date_of_expiration: new Date(Date.now() + 30 * 60000).toISOString(),
        }),
      });
      const { error } = await db
        .from("payment_events")
        .upsert(
          {
            id: ref,
            tenant_id: b.tenant,
            payment_id: String(p.id),
            plan: b.plan,
            amount: plan.price,
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
      if (error)
        throw Error(
          "Cobrança criada. Tente novamente para recuperar o mesmo Pix.",
        );
      // Recover provider approval even if notification arrived before persistence.
      await reconcile(String(p.id));
      return NextResponse.json({
        id: p.id,
        status: p.status,
        code: p.point_of_interaction?.transaction_data?.qr_code,
        image: p.point_of_interaction?.transaction_data?.qr_code_base64,
        expires: p.date_of_expiration,
      });
    }
    if (route === "payment-status") {
      const b = z
        .object({ tenant: uuid, id: z.string().regex(/^\d+$/) })
        .parse(body);
      const { db } = await owner(req, b.tenant);
      const { data } = await db
        .from("payment_events")
        .select("payment_id")
        .eq("tenant_id", b.tenant)
        .eq("payment_id", b.id)
        .single();
      if (!data) throw Error("Cobrança não encontrada");
      const p = await reconcile(b.id);
      return NextResponse.json({ status: p.status });
    }
    if (route === "staff-reschedule") {
      const b = z
        .object({ id: uuid, start: z.iso.datetime({ offset: true }) })
        .parse(body);
      const { db, user: u } = await user(req);
      await rpc(db, "staff_reschedule", {
        p_id: b.id,
        p_start: b.start,
        p_actor: u.id,
      });
      return NextResponse.json({ ok: true });
    }
    if (route === "invite") {
      const b = z
        .object({
          tenant: uuid,
          email: z.email(),
          role: z.enum(["admin", "professional"]),
        })
        .parse(body);
      const { db } = await owner(req, b.tenant);
      const { randomBytes } = await import("node:crypto");
      const token = randomBytes(32).toString("base64url");
      const { error } = await db
        .from("invites")
        .insert({
          tenant_id: b.tenant,
          email: b.email.toLowerCase(),
          role: b.role,
          token_hash: hash(token),
        });
      if (error) throw Error("Não foi possível criar convite");
      return NextResponse.json({ url: origin() + "/convite/" + token });
    }
    if (route === "accept-invite") {
      const b = z
        .object({
          token: z.string().min(40).max(100),
          name: z.string().trim().min(2).max(100),
        })
        .parse(body);
      const { db, user: u } = await user(req);
      return NextResponse.json(
        await rpc(db, "accept_invitation", {
          p_hash: hash(b.token),
          p_user: u.id,
          p_email: u.email,
          p_name: b.name,
        }),
      );
    }
    return NextResponse.json({ error: "Rota não encontrada" }, { status: 404 });
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? "Confira os dados informados"
        : err instanceof Error
          ? err.message
          : "Não foi possível concluir a operação";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
export const GET = handle;
export const POST = handle;
