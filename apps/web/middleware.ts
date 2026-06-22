import { NextResponse, type NextRequest } from "next/server";

/**
 * Guard de rota + REFRESH TRANSPARENTE (CLAUDE.md S7). Quando o cookie de access
 * expira (~15min) ele some; havendo refresh, o middleware renova no backend e
 * regrava os cookies antes de a página renderizar — o usuário não percebe.
 * Deny-by-default: rota protegida sem sessão → /login.
 */
const ACCESS_COOKIE = "vero_at";
const REFRESH_COOKIE = "vero_rt";
// Rotas públicas (sem sessão): login e a página de exclusão de conta exigida
// pelas lojas (Apple 5.1.1 / Google), que precisa de URL pública sem autenticação.
const PUBLIC_PATHS = ["/login", "/exclusao-de-conta", "/agendar", "/anamnese"];
const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3333";
const isProd = process.env.NODE_ENV === "production";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const access = req.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  if (isPublic) {
    // Já autenticado visitando /login → manda para a agenda. Outras rotas
    // públicas (ex.: exclusão de conta) ficam acessíveis logado ou não.
    const isLogin = pathname === "/login" || pathname.startsWith("/login/");
    if (isLogin && access) {
      return NextResponse.redirect(new URL("/agenda", req.url));
    }
    return NextResponse.next();
  }

  if (access) return NextResponse.next();

  // Access expirou, mas há refresh → renova de forma transparente.
  if (refresh) {
    try {
      const res = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (res.ok) {
        const tokens = (await res.json()) as {
          accessToken: string;
          refreshToken: string;
        };
        const response = NextResponse.next();
        response.cookies.set(
          ACCESS_COOKIE,
          tokens.accessToken,
          cookieOptions(15 * 60),
        );
        response.cookies.set(
          REFRESH_COOKIE,
          tokens.refreshToken,
          cookieOptions(7 * 24 * 60 * 60),
        );
        return response;
      }
    } catch {
      // cai para o fluxo de logout abaixo
    }
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }

  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // Roda em tudo, menos assets estáticos do Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
