import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Config do App do Profissional (CLAUDE.md S9 / §0 / §5).
 * - Bundle/package: br.com.vero.pro (§0). Mesmo símbolo da marca, variação mais
 *   sólida/escura (App Pro).
 * - Targets de loja (§3): Android targetSdk 36 (Android 16) + AAB; iOS via EAS
 *   com SDK do iOS 26+ (na imagem de build do EAS, não aqui).
 * - Thin client: NENHUM segredo no bundle. URL da API e DSN do Sentry (chave
 *   pública de cliente, não segredo) vêm de env EXPO_PUBLIC_*.
 * - Permissões mínimas: o app base (login + agenda read-only) não pede
 *   câmera/localização; sem usage strings desnecessárias.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Vero Pro",
  slug: "vero-pro",
  scheme: "vero-pro",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  runtimeVersion: { policy: "appVersion" },
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "br.com.vero.pro",
    supportsTablet: true,
  },
  android: {
    package: "br.com.vero.pro",
    adaptiveIcon: {
      backgroundColor: "#0d1b2a",
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
        backgroundColor: "#0d1b2a",
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
