import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Config do App do Paciente (CLAUDE.md S8c / §0 / §5).
 * - Bundle/package: br.com.vero.paciente (§0).
 * - Targets de loja (§3): Android targetSdk 36 (Android 16) + AAB; iOS via EAS
 *   com SDK do iOS 26+ (definido na imagem de build do EAS, não aqui).
 * - Thin client: NENHUM segredo no bundle. A URL da API e o DSN do Sentry (que é
 *   uma chave pública de cliente, não segredo) vêm de env EXPO_PUBLIC_*.
 * - Permissões mínimas: o app base (login + consultas) não pede câmera/localização;
 *   push entra na S13. Sem usage strings desnecessárias.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Vero",
  slug: "vero-paciente",
  scheme: "vero",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  runtimeVersion: { policy: "appVersion" },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "br.com.vero.paciente",
    supportsTablet: true,
  },
  android: {
    package: "br.com.vero.paciente",
    adaptiveIcon: {
      backgroundColor: "#14283d",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-notifications", // push (S13c) — APNs+FCM via Expo; permissão pedida com contexto
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#14283d",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 36, // §3 — exigido p/ apps novos a partir de 31/08/2026
        },
        ios: {
          deploymentTarget: "16.4", // mínimo exigido pelo Expo SDK 56
        },
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
  ],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3333",
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
