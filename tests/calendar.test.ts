import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarPeriod, monthCells, shiftDay } from "../src/lib/calendar";
import { aggregateReport, csvCell } from "../src/lib/reports";
import { normalizePhone, whatsappReady } from "../hosted/whatsapp";
test("calendar periods handle Monday start, leap months and year boundaries", () => {
  assert.deepEqual(calendarPeriod("2028-02-17", "month"), {
    start: "2028-02-01",
    end: "2028-02-29",
  });
  assert.deepEqual(calendarPeriod("2026-11-18", "week"), {
    start: "2026-11-16",
    end: "2026-11-22",
  });
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  const cells = monthCells("2028-02-01");
  assert.equal(cells.length, 42);
  assert.equal(cells[0], "2028-01-31");
  assert.ok(cells.includes("2028-02-29"));
});
test("reports use business timezone and historic prices, and exclude blocked intervals", () => {
  const rows = [
    {
      starts_at: "2026-11-02T01:00:00Z",
      status: "completed",
      price: 12000,
      service_name: "Corte",
    },
    {
      starts_at: "2026-11-01T15:00:00Z",
      status: "cancelled",
      price: 8000,
      service_name: "Corte",
    },
    {
      starts_at: "2026-11-01T14:00:00Z",
      status: "blocked",
      price: 990000,
      service_name: "Bloqueio",
    },
  ];
  const report = aggregateReport(
    rows,
    "2026-11-01",
    "2026-11-01",
    "America/Sao_Paulo",
  );
  assert.equal(report.total, 2);
  assert.equal(report.completed, 1);
  assert.equal(report.value, 12000);
  assert.equal(report.cancelled, 1);
  assert.deepEqual(report.services, [
    { name: "Corte", count: 1, value: 12000 },
  ]);
  assert.equal(
    aggregateReport(rows, "2026-11-01", "2026-11-01", "UTC").value,
    0,
  );
});
test("CSV export escapes quotes and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell("Design; corte"), '"Design; corte"');
});
test("WhatsApp requires every approved template and valid phone normalization", () => {
  assert.equal(whatsappReady({}), false);
  assert.equal(
    whatsappReady({
      META_WHATSAPP_ACCESS_TOKEN: "fixture",
      META_WHATSAPP_PHONE_NUMBER_ID: "fixture",
    }),
    false,
  );
  assert.equal(normalizePhone("(11) 99999-9999"), "5511999999999");
  assert.throws(() => normalizePhone("1234"), /válido/);
});
