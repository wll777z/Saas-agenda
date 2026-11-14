import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHmac, createHash } from "node:crypto";
export function admin() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw new Error(
      "Banco ainda não conectado. Configure o Supabase para usar dados reais.",
    );
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function user(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!token) throw new Error("Entre na sua conta");
  const db = admin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error("Sessão expirada. Entre novamente.");
  return { db, user: data.user };
}
export async function owner(req: Request, tenant: string) {
  const { db, user: u } = await user(req);
  const { data } = await db
    .from("memberships")
    .select("role")
    .eq("tenant_id", tenant)
    .eq("user_id", u.id)
    .single();
  if (data?.role !== "owner")
    throw new Error("Somente o proprietário pode gerenciar a assinatura");
  return { db, user: u };
}
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function managementToken(slug: string, key: string) {
  if (!process.env.CRON_SECRET)
    throw new Error("Links seguros ainda não configurados");
  return createHmac("sha256", process.env.CRON_SECRET)
    .update(slug + ":" + key)
    .digest("base64url");
}
export async function mp(path: string, options: RequestInit = {}) {
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN)
    throw new Error(
      "Mercado Pago ainda não conectado. O pagamento será habilitado após a configuração segura.",
    );
  const r = await fetch("https://api.mercadopago.com" + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.MERCADO_PAGO_ACCESS_TOKEN,
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  const d = await r.json();
  if (!r.ok)
    throw new Error("O provedor não concluiu a operação. Tente novamente.");
  return d;
}
export const origin = () => {
  const url = process.env.APP_URL;
  if (!url) throw new Error("Endereço da aplicação não configurado");
  return url.replace(/\/$/, "");
};

export { safeEqual, verifyWebhook } from "./security";
