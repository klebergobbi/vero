import * as Sentry from "@sentry/react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth";

/**
 * Layout raiz do App do Profissional. Inicializa o Sentry (crash reporting, §5) —
 * o DSN é uma chave PÚBLICA de cliente (não segredo), vinda de env EXPO_PUBLIC_*.
 * Em dev sem DSN, o Sentry simplesmente fica inativo.
 */
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false, // sem PII por padrão (§4 observabilidade)
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

/** Gate deny-by-default: sem sessão → /login; logado em /login → agenda. */
function AuthGate() {
  const { accessToken, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const onLogin = segments[0] === "login";
    if (!accessToken && !onLogin) {
      router.replace("/login");
    } else if (accessToken && onLogin) {
      router.replace("/");
    }
  }, [accessToken, isLoading, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AuthGate />
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
