import { createHmac, timingSafeEqual } from "node:crypto";
export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function verifyWebhook(
  signature: string,
  requestId: string,
  dataId: string,
  secret: string,
  now = Date.now(),
) {
  const parts = Object.fromEntries(
    signature.split(",").map((x) => x.trim().split("=")),
  );
  if (!parts.ts || !parts.v1 || !requestId || !dataId) return false;
  const timestamp = Number(parts.ts);
  const milliseconds = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  if (!Number.isFinite(milliseconds) || Math.abs(now - milliseconds) > 300000)
    return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  return safeEqual(
    parts.v1,
    createHmac("sha256", secret).update(manifest).digest("hex"),
  );
}
