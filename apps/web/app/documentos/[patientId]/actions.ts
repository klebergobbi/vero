"use server";

import {
  ApiError,
  type ClinicalDocumentSummary,
  type DocumentVerification,
} from "@vero/api-client";
import { serverApi } from "../../../lib/api";
import { apiBaseUrl } from "../../../lib/session";

export async function issueDocumentAction(
  patientId: string,
  type: string,
  title: string,
  content: string,
): Promise<{ doc?: ClinicalDocumentSummary; error?: string }> {
  if (!title.trim() || !content.trim()) {
    return { error: "Preencha título e conteúdo." };
  }
  try {
    const api = await serverApi();
    const doc = await api.issueDocument({ patientId, type, title, content });
    return { doc };
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      return { error: "Sem permissão para emitir." };
    }
    return { error: "Não foi possível emitir agora." };
  }
}

export async function signDocumentAction(
  id: string,
): Promise<{ doc?: ClinicalDocumentSummary; error?: string }> {
  try {
    const api = await serverApi();
    const doc = await api.signDocument(id);
    return { doc };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      return { error: "Documento já assinado." };
    }
    return { error: "Não foi possível assinar agora." };
  }
}

export async function verifyDocumentAction(
  id: string,
): Promise<{ verification?: DocumentVerification; error?: string }> {
  try {
    const api = await serverApi();
    const verification = await api.verifyDocument(id);
    return { verification };
  } catch {
    return { error: "Não foi possível verificar." };
  }
}

/** Devolve a URL ABSOLUTA do PDF (assinada, curta) para abrir em nova aba. */
export async function getPdfUrlAction(
  id: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const api = await serverApi();
    const { url } = await api.getDocumentPdf(id);
    return { url: `${apiBaseUrl}${url}` };
  } catch {
    return { error: "Não foi possível gerar o PDF." };
  }
}
