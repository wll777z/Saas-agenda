"use client";
import { useState, useEffect } from "react";
import {
  Download,
  CalendarCheck,
  Wallet,
  Users,
  CalendarDays,
} from "lucide-react";
import { api } from "@/lib/supabase";
import { aggregateReport, csvCell } from "@/lib/reports";
import { money } from "@/lib/config";
import { formatInTimeZone } from "date-fns-tz";
export default function Reports({
  bookings,
  timezone,
  tenantId,
  demo,
}: {
  bookings: Record<string, any>[];
  timezone: string;
  tenantId: string;
  demo: boolean;
}) {
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  const [from, setFrom] = useState(today.slice(0, 7) + "-01"),
    [to, setTo] = useState(today);
  const [remote, setRemote] = useState<ReturnType<
      typeof aggregateReport
    > | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (demo || process.env.NEXT_PUBLIC_SITES_RUNTIME !== "true") return;
    let active = true;
    setLoading(true);
    setError("");
    api(`reports?tenant=${tenantId}&from=${from}&to=${to}`)
      .then((r) => {
        if (active) setRemote(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [from, to, tenantId, demo]);
  const report = remote ?? aggregateReport(bookings, from, to, timezone);
  function download() {
    const rows = [
      ["Período inicial", from],
      ["Período final", to],
      [],
      ["Serviço", "Atendimentos concluídos", "Valor dos serviços (R$)"],
      ...report.services.map((s) => [
        s.name,
        s.count,
        (s.value / 100).toFixed(2).replace(".", ","),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "agenda-clara-servicos-" + from + "-" + to + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="reports">
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="report-loading">
          Calculando o período no servidor…
        </p>
      )}
      <div className="report-toolbar">
        <label className="field">
          <span>De</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            max={to}
          />
        </label>
        <label className="field">
          <span>Até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from}
          />
        </label>
        <button
          onClick={download}
          disabled={from > to || loading || Boolean(error)}
        >
          <Download size={17} /> Exportar resumo CSV
        </button>
      </div>
      {from > to || !from || !to ? (
        <div role="alert" className="notice">
          A data final deve ser depois da inicial.
        </div>
      ) : error ? (
        <p className="muted">
          Não foi possível calcular o relatório. Ajuste o período ou tente
          novamente.
        </p>
      ) : loading ? (
        <p role="status">Aguardando o cálculo completo do servidor.</p>
      ) : (
        <>
          <div className="stats-grid">
            {[
              {
                label: "Agendamentos no período",
                value: report.total,
                I: CalendarDays,
              },
              {
                label: "Serviços concluídos",
                value: report.completed,
                I: CalendarCheck,
              },
              {
                label: "Valor dos serviços realizados",
                value: money(report.value),
                I: Wallet,
              },
              {
                label: "Cancelamentos e faltas",
                value: report.cancelled + report.noShow,
                I: Users,
              },
            ].map(({ label, value, I }) => (
              <article key={label}>
                <div>
                  <span>{label}</span>
                  <I size={18} />
                </div>
                <strong>{value}</strong>
                <small>
                  {label.includes("Valor")
                    ? "Não representa recebimento financeiro"
                    : "Calculado dos registros da agenda"}
                </small>
              </article>
            ))}
          </div>
          <section className="data-panel padded">
            <h2>Serviços realizados</h2>
            <p className="muted small-text">
              Valores históricos dos atendimentos marcados como concluídos, no
              fuso {timezone}. O sistema não processa o pagamento dos
              atendimentos.
            </p>
            {report.services.length ? (
              <div
                className="report-table"
                role="table"
                aria-label="Resumo por serviço"
              >
                <div role="row" className="report-table-head">
                  <span role="columnheader">Serviço</span>
                  <span role="columnheader">Concluídos</span>
                  <span role="columnheader">Valor</span>
                </div>
                {report.services.map((s) => (
                  <div role="row" key={s.name}>
                    <span role="cell">{s.name}</span>
                    <span role="cell">{s.count}</span>
                    <b role="cell">{money(s.value)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">
                <CalendarCheck />
                <h3>Nenhum serviço concluído neste período.</h3>
                <p>
                  Os valores aparecem após marcar os atendimentos como
                  concluídos.
                </p>
              </div>
            )}
            <div className="report-breakdown">
              <span>
                Cancelamentos: <b>{report.cancelled}</b>
              </span>
              <span>
                Não compareceram: <b>{report.noShow}</b>
              </span>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
