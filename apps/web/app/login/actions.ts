"use server";

import { redirect } from "next/navigation";
import { ApiError, createApiClient } from "@vero/api-client";
import {
  apiBaseUrl,
  clearAuthCookies,
  getRefreshToken,
  setAuthCookies,
} from "../../lib/session";

export interface LoginState {
  error?: string;
}

/** Login: troca credenciais por tokens no backend e grava cookies httpOnly. */
export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!tenantSlug || !email || !password) {
    return { error: "Preencha clínica, e-mail e senha." };
  }

  try {
    const tokens = await createApiClient({ baseUrl: apiBaseUrl }).login({
      tenantSlug,
      email,
      password,
    });
    await setAuthCookies(tokens);
  } catch (err) {
    // Erro genérico (não revela usuário vs senha — espelha o backend §4).
    if (err instanceof ApiError && err.status >= 500) {
      return { error: "Serviço indisponível. Tente novamente." };
    }
    return { error: "Credenciais inválidas." };
  }

  // redirect() lança internamente — fica FORA do try/catch.
  redirect("/agenda");
}

/** Logout: revoga o refresh no backend e limpa os cookies. */
export async function logoutAction(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await createApiClient({ baseUrl: apiBaseUrl }).logout(refreshToken);
    } catch {
      // best-effort: mesmo que falhe, limpamos a sessão local.
    }
  }
  await clearAuthCookies();
  redirect("/login");
}
