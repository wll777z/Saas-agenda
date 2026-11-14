import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { safeEqual, verifyWebhook } from "../src/lib/security";
import { plans, money } from "../src/lib/config";
const now = Date.now();
const ts = String(now);
const signature = createHmac("sha256", "sandbox-secret")
  .update(`id:12345;request-id:request-1;ts:${ts};`)
  .digest("hex");
test("webhook accepts authentic signature and rejects altered id, secret and missing request id", () => {
  assert.equal(
    verifyWebhook(
      `ts=${ts},v1=${signature}`,
      "request-1",
      "12345",
      "sandbox-secret",
      now,
    ),
    true,
  );
  assert.equal(
    verifyWebhook(
      `ts=${ts},v1=${signature}`,
      "request-1",
      "12346",
      "sandbox-secret",
      now,
    ),
    false,
  );
  assert.equal(
    verifyWebhook(
      `ts=${ts},v1=${signature}`,
      "request-1",
      "12345",
      "other-secret",
      now,
    ),
    false,
  );
  assert.equal(
    verifyWebhook(
      `ts=${ts},v1=${signature}`,
      "",
      "12345",
      "sandbox-secret",
      now,
    ),
    false,
  );
});
test("expired webhook rejected (reconciliation recovers authoritative state)", () => {
  assert.equal(
    verifyWebhook(
      `ts=${ts},v1=${signature}`,
      "request-1",
      "12345",
      "sandbox-secret",
      now + 301000,
    ),
    false,
  );
});
test("malformed signatures fail closed", () => {
  for (const v of [
    "",
    "v1=x",
    "ts=NaN,v1=abc",
    "ts=0,v1=",
    "ts=" + ts + ",v1=x",
  ])
    assert.equal(
      verifyWebhook(v, "request-1", "12345", "sandbox-secret", now),
      false,
    );
  assert.equal(safeEqual("abc", "ab"), false);
  assert.equal(safeEqual("á", "a"), false);
});
test("plan prices and capacities are centralized", () => {
  assert.equal(plans.solo.price, 4900);
  assert.equal(plans.team.bookings, 500);
  assert.match(money(9900), /99,00/);
});
