"use server";

import type { ReportItem } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { apiBaseUrl } from "../../lib/session";

export async function requestReportAction(input: {
  type: string;
  format: string;
  periodStart: string;
  periodEnd: string;
}): Promise<{ reports?: ReportItem[]; error?: string }> {
  if (!input.periodStart || !input.periodEnd) {
    return { error: "Informe o período." };
  }
  try {
    const api = await serverApi();
    await api.requestReport(input);
    return { reports: await api.listReports() };
  } catch {
    return { error: "Não foi possível solicitar o relatório." };
  }
}

export async function refreshReportsAction(): Promise<{
  reports?: ReportItem[];
  error?: string;
}> {
  try {
    const api = await serverApi();
    return { reports: await api.listReports() };
  } catch {
    return { error: "Não foi possível atualizar." };
  }
}

/** Devolve a URL ABSOLUTA do arquivo (assinada) para baixar em nova aba. */
export async function downloadReportAction(
  id: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const api = await serverApi();
    const report = await api.getReport(id);
    if (report.status !== "READY" || !report.url) {
      return { error: "Relatório ainda não está pronto." };
    }
    return { url: `${apiBaseUrl}${report.url}` };
  } catch {
    return { error: "Não foi possível baixar o relatório." };
  }
}
