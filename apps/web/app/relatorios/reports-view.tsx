"use client";

import { useState, useTransition } from "react";
import type { ReportItem } from "@vero/api-client";
import {
  downloadReportAction,
  refreshReportsAction,
  requestReportAction,
} from "./actions";

const TYPE_LABELS: Record<string, string> = {
  BILLING: "Faturamento",
  NO_SHOW: "Faltas e desmarcações",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Gerando…",
  READY: "Pronto",
  FAILED: "Falhou",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function ReportsView({
  initialReports,
}: {
  initialReports: ReportItem[];
}) {
  const [reports, setReports] = useState(initialReports);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("BILLING");
  const [format, setFormat] = useState("CSV");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pending, start] = useTransition();

  const request = () =>
    start(async () => {
      setError(null);
      const res = await requestReportAction({
        type,
        format,
        periodStart: from ? `${from}T00:00:00.000Z` : "",
        periodEnd: to ? `${to}T23:59:59.000Z` : "",
      });
      if (res.error) setError(res.error);
      else if (res.reports) setReports(res.reports);
    });

  const refresh = () =>
    start(async () => {
      const res = await refreshReportsAction();
      if (res.reports) setReports(res.reports);
    });

  const download = (id: string) => {
    const win = window.open("", "_blank");
    start(async () => {
      const res = await downloadReportAction(id);
      if (res.url && win) win.location.href = res.url;
      else {
        if (win) win.close();
        if (res.error) setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Novo relatório
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="BILLING">Faturamento</option>
            <option value="NO_SHOW">Faltas e desmarcações</option>
          </select>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="CSV">CSV</option>
            <option value="PDF">PDF</option>
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={request}
          disabled={pending}
          className="mt-3 rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
        >
          Gerar relatório
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">
            Relatórios ({reports.length})
          </h2>
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            className="text-xs text-vero-700 hover:underline"
          >
            Atualizar
          </button>
        </div>
        {reports.map((r) => {
          const ready = r.status === "READY";
          return (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {TYPE_LABELS[r.type] ?? r.type}{" "}
                  <span className="text-xs text-slate-400">· {r.format}</span>
                </p>
                <p className="text-xs text-slate-500">
                  {fmt(r.periodStart)} – {fmt(r.periodEnd)}
                  {r.rowCount != null ? ` · ${r.rowCount} linhas` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium ${
                    ready
                      ? "text-emerald-600"
                      : r.status === "FAILED"
                        ? "text-red-600"
                        : "text-slate-400"
                  }`}
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
                {ready ? (
                  <button
                    type="button"
                    onClick={() => download(r.id)}
                    disabled={pending}
                    className="rounded-lg border border-vero-500 px-3 py-1.5 text-sm font-medium text-vero-700 transition hover:bg-vero-50"
                  >
                    Baixar
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
