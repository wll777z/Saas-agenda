import { formatInTimeZone } from "date-fns-tz";
export function aggregateReport(
  bookings: Record<string, any>[],
  from: string,
  to: string,
  timezone: string,
) {
  const selected = bookings.filter(
    (b) =>
      b.status !== "blocked" &&
      formatInTimeZone(new Date(b.starts_at), timezone, "yyyy-MM-dd") >= from &&
      formatInTimeZone(new Date(b.starts_at), timezone, "yyyy-MM-dd") <= to,
  );
  const completed = selected.filter((b) => b.status === "completed");
  const group = new Map<
    string,
    { name: string; count: number; value: number }
  >();
  for (const b of completed) {
    const r = group.get(b.service_name) ?? {
      name: b.service_name,
      count: 0,
      value: 0,
    };
    r.count++;
    r.value += b.price;
    group.set(b.service_name, r);
  }
  return {
    total: selected.length,
    completed: completed.length,
    cancelled: selected.filter((b) => b.status === "cancelled").length,
    noShow: selected.filter((b) => b.status === "no_show").length,
    value: completed.reduce((a, b) => a + b.price, 0),
    services: [...group.values()].sort((a, b) => b.value - a.value),
  };
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
