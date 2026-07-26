import Link from "next/link";
import type { ApiKeyItem, BrandingData, WebhookItem } from "@vero/api-client";
import { serverApi } from "../../lib/api";
import { PublicApiView } from "./public-api-view";

export const dynamic = "force-dynamic";

export default async function ApiPublicaPage() {
  const api = await serverApi();

  let apiKeys: ApiKeyItem[] = [];
  let webhooks: WebhookItem[] = [];
  let branding: BrandingData | null = null;
  try {
    [apiKeys, webhooks, branding] = await Promise.all([
      api.listApiKeys(),
      api.listWebhooks(),
      api.getManageBranding(),
    ]);
  } catch {
    // fail-soft
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/agenda"
        className="mb-6 inline-block text-sm text-vero-700 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-vero-700">
        API pública &amp; white-label
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Chaves de API para integrações de terceiros, webhooks de saída e a marca
        (cor/logo) exibida na API pública.
      </p>
      <PublicApiView
        initialApiKeys={apiKeys}
        initialWebhooks={webhooks}
        initialBranding={branding}
      />
    </main>
  );
}
