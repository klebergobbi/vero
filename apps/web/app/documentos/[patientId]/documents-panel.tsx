"use client";

import { useState, useTransition } from "react";
import type {
  ClinicalDocumentSummary,
  DocumentVerification,
} from "@vero/api-client";
import {
  getPdfUrlAction,
  issueDocumentAction,
  signDocumentAction,
  verifyDocumentAction,
} from "./actions";

const TYPE_LABELS: Record<string, string> = {
  ATTESTATION: "Atestado",
  PRESCRIPTION: "Receituário",
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function DocumentsPanel({
  patientId,
  initialDocs,
}: {
  patientId: string;
  initialDocs: ClinicalDocumentSummary[];
}) {
  const [docs, setDocs] = useState(initialDocs);
  const [type, setType] = useState("ATTESTATION");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifications, setVerifications] = useState<
    Record<string, DocumentVerification>
  >({});
  const [pending, start] = useTransition();

  const upsert = (doc: ClinicalDocumentSummary) =>
    setDocs((list) => {
      const idx = list.findIndex((d) => d.id === doc.id);
      if (idx === -1) return [doc, ...list];
      const copy = [...list];
      copy[idx] = doc;
      return copy;
    });

  const issue = () => {
    setError(null);
    start(async () => {
      const res = await issueDocumentAction(patientId, type, title, content);
      if (res.error) setError(res.error);
      else if (res.doc) {
        upsert(res.doc);
        setTitle("");
        setContent("");
      }
    });
  };

  const sign = (id: string) => {
    setError(null);
    start(async () => {
      const res = await signDocumentAction(id);
      if (res.error) setError(res.error);
      else if (res.doc) upsert(res.doc);
    });
  };

  const verify = (id: string) => {
    start(async () => {
      const res = await verifyDocumentAction(id);
      if (res.verification) {
        setVerifications((v) => ({ ...v, [id]: res.verification! }));
      }
    });
  };

  const openPdf = (id: string) => {
    // Abre a aba SINCRONAMENTE (na ação do usuário) e navega após buscar a URL
    // assinada — evita o bloqueio de popup que ocorre ao chamar window.open após await.
    const win = window.open("", "_blank");
    start(async () => {
      const res = await getPdfUrlAction(id);
      if (res.url && win) win.location.href = res.url;
      else if (win) win.close();
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Novo documento
        </h2>
        <div className="space-y-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ATTESTATION">Atestado</option>
            <option value="PRESCRIPTION">Receituário</option>
          </select>
          <input
            type="text"
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            rows={4}
            placeholder="Conteúdo do documento"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={issue}
            disabled={pending}
            className="rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
          >
            Emitir
          </button>
        </div>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">
          Documentos ({docs.length})
        </h2>
        {docs.map((doc) => {
          const signed = doc.status === "SIGNED";
          const v = verifications[doc.id];
          return (
            <div
              key={doc.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">
                    {doc.title}{" "}
                    <span className="text-xs text-slate-400">
                      ({TYPE_LABELS[doc.type] ?? doc.type})
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {signed
                      ? `Assinado por ${doc.signerName ?? "—"}${
                          doc.signedAt ? ` em ${fmt(doc.signedAt)}` : ""
                        }`
                      : "Rascunho — não assinado"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    signed
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {signed ? "Assinado" : "Rascunho"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {!signed ? (
                  <button
                    type="button"
                    onClick={() => sign(doc.id)}
                    disabled={pending}
                    className="rounded-lg bg-vero-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-vero-700 disabled:opacity-60"
                  >
                    Assinar
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => verify(doc.id)}
                  disabled={pending}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Verificar validade
                </button>
                <button
                  type="button"
                  onClick={() => openPdf(doc.id)}
                  disabled={pending}
                  className="rounded-lg border border-vero-500 px-3 py-1.5 text-sm font-medium text-vero-700 transition hover:bg-vero-50"
                >
                  Abrir PDF
                </button>
              </div>

              {v ? (
                <p
                  className={`mt-2 text-xs ${
                    v.valid ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {v.valid
                    ? `✓ Válido — integridade e assinatura conferidas.`
                    : `Inválido — ${
                        v.integrityOk ? "" : "corpo adulterado; "
                      }${v.signedOk ? "" : "não assinado."}`}
                </p>
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
}
