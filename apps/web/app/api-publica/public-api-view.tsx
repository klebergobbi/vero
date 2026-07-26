"use client";

import { useState, useTransition } from "react";
import type {
  ApiKeyCreated,
  ApiKeyItem,
  BrandingData,
  WebhookCreated,
  WebhookItem,
} from "@vero/api-client";
import {
  createApiKeyAction,
  createWebhookAction,
  revokeApiKeyAction,
  revokeWebhookAction,
  updateBrandingAction,
} from "./actions";

/** Escopos hoje suportados pela API pública v1 (§ apps/api/src/public-api). */
const AVAILABLE_SCOPES = [
  { key: "appointments:read", label: "Ler agendamentos" },
  { key: "patients:read", label: "Ler pacientes" },
];

/** Eventos de domínio hoje entregues por webhook. */
const AVAILABLE_EVENTS = [
  { key: "appointment.created", label: "Agendamento criado" },
];

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("pt-BR") : "Nunca usada";
}

export function PublicApiView({
  initialApiKeys,
  initialWebhooks,
  initialBranding,
}: {
  initialApiKeys: ApiKeyItem[];
  initialWebhooks: WebhookItem[];
  initialBranding: BrandingData | null;
}) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [branding, setBranding] = useState(initialBranding);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // criação de chave
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>([]);
  const [keyRateLimit, setKeyRateLimit] = useState("60");
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreated | null>(null);

  // branding
  const [brandColor, setBrandColor] = useState(
    branding?.brandColor ?? "#1a3a5c",
  );
  const [logoUrl, setLogoUrl] = useState(branding?.logoUrl ?? "");

  // webhook
  const [whUrl, setWhUrl] = useState("");
  const [whName, setWhName] = useState("");
  const [whEvents, setWhEvents] = useState<string[]>([]);
  const [revealedWebhook, setRevealedWebhook] = useState<WebhookCreated | null>(
    null,
  );

  function toggle(list: string[], key: string): string[] {
    return list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {/* ── Chaves de API ─────────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Chaves de API ({apiKeys.length})
        </h2>

        {revealedKey ? (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="mb-1 text-sm font-medium text-amber-800">
              Copie a chave agora — ela não será mostrada de novo.
            </p>
            <code className="block break-all rounded bg-white px-2 py-1.5 text-xs text-slate-800">
              {revealedKey.key}
            </code>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="mt-2 text-xs text-amber-700 underline"
            >
              Já copiei, ocultar
            </button>
          </div>
        ) : null}

        <div className="mb-3 space-y-2">
          {apiKeys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {k.name}{" "}
                  <code className="text-xs text-slate-400">{k.keyPrefix}…</code>
                </p>
                <p className="text-xs text-slate-500">
                  {k.scopes.join(", ")} · {k.rateLimit} req/min ·{" "}
                  {fmtDate(k.lastUsedAt)}
                  {!k.isActive ? " · revogada" : ""}
                </p>
              </div>
              {k.isActive ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await revokeApiKeyAction(k.id);
                      if (res.error) setError(res.error);
                      else {
                        setError(null);
                        if (res.apiKeys) setApiKeys(res.apiKeys);
                      }
                    })
                  }
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Revogar
                </button>
              ) : null}
            </div>
          ))}
          {apiKeys.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma chave criada.</p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <input
            type="text"
            placeholder="Nome da integração"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="number"
            placeholder="Req/min"
            value={keyRateLimit}
            onChange={(e) => setKeyRateLimit(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          {AVAILABLE_SCOPES.map((s) => (
            <label
              key={s.key}
              className="flex items-center gap-1.5 text-sm text-slate-600"
            >
              <input
                type="checkbox"
                checked={keyScopes.includes(s.key)}
                onChange={() => setKeyScopes((prev) => toggle(prev, s.key))}
              />
              {s.label}
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createApiKeyAction({
                name: keyName,
                scopes: keyScopes,
                rateLimit: parseInt(keyRateLimit, 10) || 60,
              });
              if (res.error) setError(res.error);
              else {
                setError(null);
                if (res.apiKeys) setApiKeys(res.apiKeys);
                if (res.created) setRevealedKey(res.created);
                setKeyName("");
                setKeyScopes([]);
              }
            })
          }
          className="mt-3 rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
        >
          Criar chave
        </button>
      </section>

      {/* ── Marca (branding) ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Marca (white-label)
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Exibida por terceiros que consomem <code>GET /api/v1/branding</code>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Cor
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-9 w-14 rounded border border-slate-300"
            />
          </label>
          <input
            type="text"
            placeholder="URL do logo (opcional)"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <span
            className="h-9 w-9 rounded-full border border-slate-200"
            style={{ backgroundColor: brandColor }}
            aria-hidden
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await updateBrandingAction({
                brandColor,
                ...(logoUrl ? { logoUrl } : {}),
              });
              if (res.error) setError(res.error);
              else {
                setError(null);
                if (res.branding) setBranding(res.branding);
              }
            })
          }
          className="mt-3 rounded-lg border border-vero-500 px-4 py-2 text-sm font-medium text-vero-700 transition hover:bg-vero-50 disabled:opacity-60"
        >
          Salvar marca
        </button>
      </section>

      {/* ── Webhooks de saída ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">
          Webhooks de saída ({webhooks.length})
        </h2>

        {revealedWebhook ? (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <p className="mb-1 text-sm font-medium text-amber-800">
              Copie o segredo agora — use-o para verificar a assinatura (header{" "}
              <code>X-Vero-Signature</code>, HMAC-SHA256).
            </p>
            <code className="block break-all rounded bg-white px-2 py-1.5 text-xs text-slate-800">
              {revealedWebhook.secret}
            </code>
            <button
              type="button"
              onClick={() => setRevealedWebhook(null)}
              className="mt-2 text-xs text-amber-700 underline"
            >
              Já copiei, ocultar
            </button>
          </div>
        ) : null}

        <div className="mb-3 space-y-2">
          {webhooks.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{w.name}</p>
                <p className="break-all text-xs text-slate-500">
                  {w.url} · {w.events.join(", ")}
                  {!w.isActive ? " · revogado" : ""}
                </p>
              </div>
              {w.isActive ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await revokeWebhookAction(w.id);
                      if (res.error) setError(res.error);
                      else {
                        setError(null);
                        if (res.webhooks) setWebhooks(res.webhooks);
                      }
                    })
                  }
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Revogar
                </button>
              ) : null}
            </div>
          ))}
          {webhooks.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum webhook criado.</p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Nome (opcional)"
            value={whName}
            onChange={(e) => setWhName(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="url"
            placeholder="https://seusistema.com/webhook"
            value={whUrl}
            onChange={(e) => setWhUrl(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          {AVAILABLE_EVENTS.map((ev) => (
            <label
              key={ev.key}
              className="flex items-center gap-1.5 text-sm text-slate-600"
            >
              <input
                type="checkbox"
                checked={whEvents.includes(ev.key)}
                onChange={() => setWhEvents((prev) => toggle(prev, ev.key))}
              />
              {ev.label}
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createWebhookAction({
                url: whUrl,
                events: whEvents,
                ...(whName ? { name: whName } : {}),
              });
              if (res.error) setError(res.error);
              else {
                setError(null);
                if (res.webhooks) setWebhooks(res.webhooks);
                if (res.createdWebhook) setRevealedWebhook(res.createdWebhook);
                setWhUrl("");
                setWhName("");
                setWhEvents([]);
              }
            })
          }
          className="mt-3 rounded-lg bg-vero-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-vero-700 disabled:opacity-60"
        >
          Criar webhook
        </button>
      </section>
    </div>
  );
}
