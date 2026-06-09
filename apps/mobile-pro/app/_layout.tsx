import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

/**
 * Layout raiz do App do Profissional. Inicializa o Sentry (crash reporting, §5) —
 * o DSN é uma chave PÚBLICA de cliente (não segredo), vinda de env EXPO_PUBLIC_*.
 * Em dev sem DSN, o Sentry simplesmente fica inativo. O gate de auth + agenda do
 * dia chegam na S9b.
 */
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false, // sem PII por padrão (§4 observabilidade)
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default Sentry.wrap(RootLayout);
