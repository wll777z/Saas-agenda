import { test } from "node:test";
import assert from "node:assert/strict";
import { supabase } from "../hosted/client";
test("hosted query transports date bounds to the API", async () => {
  const original = globalThis.fetch;
  let payload: any;
  globalThis.fetch = async (_url: any, options: any) => {
    payload = JSON.parse(options.body);
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const r = await supabase
      .from("appointments")
      .select("*")
      .eq("tenant_id", "test")
      .gte("starts_at", "2026-11-01T03:00:00.000Z")
      .lt("starts_at", "2026-12-01T03:00:00.000Z");
    assert.equal(r.error, null);
    assert.deepEqual(payload.range, {
      from: "2026-11-01T03:00:00.000Z",
      to: "2026-12-01T03:00:00.000Z",
    });
  } finally {
    globalThis.fetch = original;
  }
});
