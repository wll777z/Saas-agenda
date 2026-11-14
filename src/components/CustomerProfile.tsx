"use client";
import { useEffect, useState } from "react";
import { CalendarCheck, Check, Mail, Phone, User } from "lucide-react";
import { api } from "@/lib/supabase";
import { money, statusLabel } from "@/lib/config";
import { formatInTimeZone } from "date-fns-tz";
type Row = Record<string, any>;
export default function CustomerProfile({
  id,
  timezone,
  demo,
  bookings,
  customer,
}: {
  id: string;
  timezone: string;
  demo: boolean;
  bookings: Row[];
  customer?: Row;
}) {
  const [data, setData] = useState<Row | null>(null),
    [notes, setNotes] = useState(""),
    [msg, setMsg] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (demo) {
      const history = bookings.filter(
        (b) => b.customer_id === id || b.customers?.email === customer?.email,
      );
      setData({
        customer: { ...customer, notes: "" },
        history,
        stats: {
          completed: history.filter((b) => b.status === "completed").length,
          appointments: history.length,
        },
        preferred: [],
        can_edit: true,
      });
      return;
    }
    api("customer?id=" + encodeURIComponent(id))
      .then((d) => {
        if (active) {
          setData(d);
          setNotes(d.customer.notes ?? "");
        }
      })
      .catch((e) => {
        if (active) setMsg(e.message);
      });
    return () => {
      active = false;
    };
  }, [id, demo]);
  if (!data)
    return <p role="status">{msg || "Carregando histórico do cliente…"}</p>;
  return (
    <div className="customer-profile">
      <div className="customer-profile-header">
        <span className="avatar">{data.customer.name?.[0] ?? <User />}</span>
        <div>
          <h3>{data.customer.name}</h3>
          <p>
            <Mail size={14} />
            {data.customer.email}
          </p>
          {data.customer.phone && (
            <p>
              <Phone size={14} />
              {data.customer.phone}
            </p>
          )}
        </div>
      </div>
      <div className="profile-stats">
        <span>
          <b>{data.stats.completed ?? 0}</b> atendimentos concluídos
        </span>
        <span>
          <b>{data.stats.appointments ?? 0}</b> reservas no histórico
        </span>
      </div>
      {Boolean(data.preferred?.length) && (
        <p className="profile-preferred">
          Serviços mais realizados:{" "}
          {data.preferred
            .map((s: Row) => s.service_name + " (" + s.visits + ")")
            .join(", ")}
          .
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMsg("");
          try {
            if (!demo) await api("customer", { id, notes });
            setMsg(
              demo
                ? "Observação exibida somente nesta demonstração."
                : "Observação salva.",
            );
          } catch (error) {
            setMsg((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span>Observações operacionais</span>
          <textarea
            value={notes}
            maxLength={2000}
            readOnly={!data.can_edit}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferências e informações necessárias ao atendimento. Não registre dados clínicos ou informações sensíveis."
          />
        </label>
        {data.can_edit && (
          <button disabled={busy}>
            {busy ? "Salvando…" : "Salvar observação"}
            <Check size={16} />
          </button>
        )}
      </form>
      {msg && (
        <p className="notice" role="status">
          {msg}
        </p>
      )}
      <h3>Últimos atendimentos</h3>
      <div className="profile-history">
        {data.history.length ? (
          data.history.map((b: Row) => (
            <div key={b.id}>
              <CalendarCheck size={18} />
              <section>
                <b>{b.service_name}</b>
                <small>
                  {formatInTimeZone(
                    new Date(b.starts_at),
                    timezone,
                    "dd/MM/yyyy HH:mm",
                  )}{" "}
                  {b.professional_name ? "· " + b.professional_name : ""}
                </small>
                <span className={"status " + b.status}>
                  {statusLabel[b.status]}
                </span>
              </section>
              <span>{money(b.price)}</span>
            </div>
          ))
        ) : (
          <p>Nenhum atendimento encontrado.</p>
        )}
      </div>
      <small>
        Exibidos até 200 registros mais recentes. As métricas consideram o
        histórico autorizado completo.
      </small>
    </div>
  );
}
