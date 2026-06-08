import { cookies } from "next/headers";
import type { TokenPair } from "@vero/api-client";

/**
 * Sessão server-side em cookies httpOnly (CLAUDE.md §5 — token nunca no JS do
 * browser). O middleware renova o access de forma transparente; estes helpers
 * rodam em Server Actions / Server Components.
 */
export const ACCESS_COOKIE = "vero_at";
export const REFRESH_COOKIE = "vero_rt";

const ACCESS_MAX_AGE = 15 * 60; // 15 min (espelha o TTL do access JWT)
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 dias
const isProd = process.env.NODE_ENV === "production";

export const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3333";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProd, // em dev local (http) precisa ser false
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

// Next 15: cookies() é assíncrono.
export async function setAuthCookies(tokens: TokenPair): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(ACCESS_MAX_AGE));
  store.set(
    REFRESH_COOKIE,
    tokens.refreshToken,
    cookieOptions(REFRESH_MAX_AGE),
  );
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(ACCESS_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}
