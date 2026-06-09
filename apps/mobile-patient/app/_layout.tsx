import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

/**
 * Layout raiz do App do Paciente. Inicializa o Sentry (crash reporting, §5) —
 * o DSN é uma chave PÚBLICA de cliente (não segredo), vinda de env EXPO_PUBLIC_*.
 * Em dev sem DSN, o Sentry simplesmente fica inativo.
 */
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // Sem PII por padrão (§4 observabilidade); ajustar amostragem em produção.
  sendDefaultPii: false,
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
