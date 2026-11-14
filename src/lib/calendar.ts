export type CalendarMode = "day" | "week" | "month" | "list";
export const shiftDay = (day: string, n: number) => {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export function calendarPeriod(day: string, mode: CalendarMode) {
  if (mode === "month") {
    const d = new Date(day + "T12:00:00Z");
    return {
      start: day.slice(0, 7) + "-01",
      end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12))
        .toISOString()
        .slice(0, 10),
    };
  }
  if (mode === "week") {
    const offset = (new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7;
    const start = shiftDay(day, -offset);
    return { start, end: shiftDay(start, 6) };
  }
  return { start: day, end: mode === "list" ? shiftDay(day, 29) : day };
}
export function monthCells(day: string) {
  const start = day.slice(0, 7) + "-01",
    offset = (new Date(start + "T12:00:00Z").getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => shiftDay(start, i - offset));
}
export const dayText = (day: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(
    new Date(day + "T12:00:00Z"),
  );
