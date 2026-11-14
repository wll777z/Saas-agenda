export function whatsappReady(env: Record<string, any>) {
  return Boolean(
    env.META_WHATSAPP_ACCESS_TOKEN &&
    env.META_WHATSAPP_PHONE_NUMBER_ID &&
    env.META_WHATSAPP_TEMPLATE_CONFIRMATION &&
    env.META_WHATSAPP_TEMPLATE_REMINDER &&
    env.META_WHATSAPP_TEMPLATE_CANCELLATION,
  );
}
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const phone =
    digits.length === 10 || digits.length === 11 ? "55" + digits : digits;
  if (!/^\d{11,15}$/.test(phone))
    throw Error("Informe um WhatsApp válido com DDD e código do país");
  return phone;
}
export async function sendWhatsApp(
  env: Record<string, any>,
  job: any,
  booking: any,
  manageUrl: string,
) {
  if (!whatsappReady(env))
    throw Error("WhatsApp oficial ainda não configurado");
  const key =
    job.kind === "confirmation"
      ? "CONFIRMATION"
      : job.kind === "reminder"
        ? "REMINDER"
        : "CANCELLATION";
  const version = env.META_WHATSAPP_API_VERSION ?? "v23.0";
  if (!/^v\d+\.\d+$/.test(version))
    throw Error("Versão da API WhatsApp inválida");
  const label = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: booking.timezone,
  }).format(new Date(booking.starts_at));
  const response = await fetch(
    `https://graph.facebook.com/${version}/${encodeURIComponent(env.META_WHATSAPP_PHONE_NUMBER_ID)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.META_WHATSAPP_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizePhone(job.recipient),
        type: "template",
        template: {
          name: env["META_WHATSAPP_TEMPLATE_" + key],
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: [
                booking.business,
                booking.service_name,
                label,
                manageUrl,
              ].map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
      signal: AbortSignal.timeout(15000),
    },
  );
  const result = (await response.json()) as any;
  if (!response.ok || !result.messages?.[0]?.id)
    throw Error("O provedor não aceitou a mensagem WhatsApp");
  return result.messages[0].id as string;
}
