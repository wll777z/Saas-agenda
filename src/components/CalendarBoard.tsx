"use client";
import { Plus } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { calendarPeriod, monthCells, shiftDay, dayText } from "@/lib/calendar";
import { statusLabel } from "@/lib/config";
type Row = Record<string, any>;
export default function CalendarBoard({
  mode,
  day,
  bookings,
  timezone,
  canCreate,
  onDay,
  onCreate,
  onAppointment,
}: {
  mode: "week" | "month";
  day: string;
  bookings: Row[];
  timezone: string;
  canCreate: boolean;
  onDay: (day: string) => void;
  onCreate: (day: string, time: string) => void;
  onAppointment: (b: Row) => void;
}) {
  const period = calendarPeriod(day, mode);
  const byDay = (d: string) =>
    bookings.filter(
      (b) =>
        formatInTimeZone(new Date(b.starts_at), timezone, "yyyy-MM-dd") === d,
    );
  const event = (b: Row) => (
    <button
      className={"calendar-event " + b.status}
      key={b.id}
      onClick={() => onAppointment(b)}
      aria-label={`${statusLabel[b.status]}: ${b.customers?.name ?? "Bloqueio"}, ${formatInTimeZone(b.starts_at, timezone, "HH:mm")}`}
    >
      <span>
        {formatInTimeZone(b.starts_at, timezone, "HH:mm")} ·{" "}
        {b.customers?.name ?? "Bloqueio"}
      </span>
      <small>{b.service_name}</small>
      <small>{statusLabel[b.status]}</small>
    </button>
  );
  if (mode === "month")
    return (
      <div className="month-board">
        <div className="month-name">
          {dayText(day, { month: "long", year: "numeric" })}
        </div>
        <div className="month-weekdays">
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <div className="month-grid">
          {monthCells(day).map((d) => {
            const list = byDay(d);
            return (
              <section
                className={
                  "month-cell " +
                  (d.slice(0, 7) !== day.slice(0, 7) ? "outside-month" : "") +
                  (d === day ? " selected-day" : "")
                }
                key={d}
              >
                <div className="month-cell-top">
                  <button
                    className="calendar-date"
                    onClick={() => onDay(d)}
                    aria-label={"Ver dia " + dayText(d, { dateStyle: "full" })}
                  >
                    {Number(d.slice(-2))}
                  </button>
                  {canCreate && (
                    <button
                      className="calendar-add"
                      aria-label={
                        "Novo agendamento em " +
                        dayText(d, { dateStyle: "short" })
                      }
                      onClick={() => onCreate(d, "09:00")}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                {list.slice(0, 2).map(event)}
                {list.length > 2 && (
                  <button className="calendar-more" onClick={() => onDay(d)}>
                    +{list.length - 2} compromissos
                  </button>
                )}
              </section>
            );
          })}
        </div>
        <p className="calendar-hint">
          Selecione uma data para ver a lista diária. O sinal + abre o
          agendamento; a disponibilidade será conferida no servidor.
        </p>
      </div>
    );
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(period.start, i));
  const hours = bookings.map((b) =>
    Number(formatInTimeZone(new Date(b.starts_at), timezone, "H")),
  );
  const first = Math.min(8, ...hours),
    last = Math.max(19, ...hours);
  return (
    <div className="week-board-wrap">
      <div className="week-board">
        <div className="week-board-heading">
          <span>Horário</span>
          {days.map((d) => (
            <button
              className={d === day ? "selected-day" : ""}
              onClick={() => onDay(d)}
              key={d}
            >
              <small>{dayText(d, { weekday: "short" })}</small>
              <b>{Number(d.slice(-2))}</b>
            </button>
          ))}
        </div>
        {Array.from({ length: last - first + 1 }, (_, i) => first + i).map(
          (hour) => (
            <div className="week-board-row" key={hour}>
              <span>{String(hour).padStart(2, "0")}:00</span>
              {days.map((d) => {
                const list = byDay(d).filter(
                  (b) =>
                    Number(
                      formatInTimeZone(new Date(b.starts_at), timezone, "H"),
                    ) === hour,
                );
                return (
                  <div className="week-cell" key={d}>
                    {list.map(event)}
                    {!list.length && canCreate && (
                      <button
                        className="week-empty"
                        aria-label={
                          "Criar agendamento em " +
                          dayText(d, { dateStyle: "short" }) +
                          " às " +
                          hour +
                          "h"
                        }
                        onClick={() =>
                          onCreate(d, String(hour).padStart(2, "0") + ":00")
                        }
                      >
                        <Plus size={14} />
                        <span>Agendar</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ),
        )}
      </div>
      <p className="calendar-hint">
        A grade permite criar uma reserva rapidamente. Um espaço vazio não
        garante disponibilidade: expediente e conflitos são validados ao
        confirmar.
      </p>
    </div>
  );
}
