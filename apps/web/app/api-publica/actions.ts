"use server";

import type {
  ApiKeyCreated,
  ApiKeyItem,
  BrandingData,
  WebhookCreated,
  WebhookItem,
} from "@vero/api-client";
import { serverApi } from "../../lib/api";

interface Result {
  apiKeys?: ApiKeyItem[];
  created?: ApiKeyCreated;
  webhooks?: WebhookItem[];
  createdWebhook?: WebhookCreated;
  branding?: BrandingData;
  error?: string;
}

export async function createApiKeyAction(input: {
  name: string;
  scopes: string[];
  rateLimit?: number;
}): Promise<Result> {
  if (!input.name.trim() || input.scopes.length === 0) {
    return { error: "Informe um nome e ao menos um escopo." };
  }
  try {
    const api = await serverApi();
    const created = await api.createApiKey(input);
    return { created, apiKeys: await api.listApiKeys() };
  } catch {
    return { error: "Não foi possível criar a chave." };
  }
}

export async function revokeApiKeyAction(id: string): Promise<Result> {
  try {
    const api = await serverApi();
    await api.revokeApiKey(id);
    return { apiKeys: await api.listApiKeys() };
  } catch {
    return { error: "Não foi possível revogar a chave." };
  }
}

export async function updateBrandingAction(input: {
  brandColor?: string;
  logoUrl?: string;
}): Promise<Result> {
  try {
    const api = await serverApi();
    const branding = await api.updateBranding(input);
    return { branding };
  } catch {
    return { error: "Não foi possível atualizar a marca (cor inválida?)." };
  }
}

export async function createWebhookAction(input: {
  url: string;
  events: string[];
  name?: string;
}): Promise<Result> {
  if (!input.url.trim() || input.events.length === 0) {
    return { error: "Informe a URL e ao menos um evento." };
  }
  try {
    const api = await serverApi();
    const createdWebhook = await api.createWebhook(input);
    return { createdWebhook, webhooks: await api.listWebhooks() };
  } catch {
    return {
      error:
        "Não foi possível criar o webhook (URL inválida ou host interno bloqueado).",
    };
  }
}

export async function revokeWebhookAction(id: string): Promise<Result> {
  try {
    const api = await serverApi();
    await api.revokeWebhook(id);
    return { webhooks: await api.listWebhooks() };
  } catch {
    return { error: "Não foi possível revogar o webhook." };
  }
}
