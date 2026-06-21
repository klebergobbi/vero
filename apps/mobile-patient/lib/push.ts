/**
 * Push do App do Paciente (§S13c). Pede permissão (sempre a partir de uma AÇÃO do
 * usuário, com contexto — §5 loja), obtém o ExpoPushToken e registra no backend
 * (POST /me/devices). O token fica em expo-secure-store p/ opt-out/remoção depois.
 * Thin client: nenhum segredo aqui; o envio é do backend (PushService, S13b).
 */
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "./api";

const TOKEN_KEY = "vero_patient_push_token";

export type EnableResult = "registered" | "denied" | "unsupported";

function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId
  );
}

/** Pede permissão (com contexto) e registra o device. Idempotente (upsert no backend). */
export async function enablePush(accessToken: string): Promise<EnableResult> {
  if (!Device.isDevice) return "unsupported"; // push não funciona em emulador
  let status = (await Notifications.getPermissionsAsync()).status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return "denied";

  const pid = projectId();
  const { data: token } = await Notifications.getExpoPushTokenAsync(
    pid ? { projectId: pid } : undefined,
  );
  await api.registerDevice(
    accessToken,
    token,
    Platform.OS === "ios" ? "IOS" : "ANDROID",
  );
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return "registered";
}

/** Liga/desliga o recebimento de push deste device (respeitado no envio — S13b). */
export async function setPushOptOut(
  accessToken: string,
  optedOut: boolean,
): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) await api.optOutDevice(accessToken, token, optedOut);
}

/** Remove o device no logout (best-effort) e limpa o token local. */
export async function disablePush(accessToken: string | null): Promise<void> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return;
  if (accessToken) {
    try {
      await api.unregisterDevice(accessToken, token);
    } catch {
      // best-effort: a sessão será encerrada de qualquer forma
    }
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Já existe um token registrado neste device? (reflete o estado na UI). */
export async function hasPushToken(): Promise<boolean> {
  return (await SecureStore.getItemAsync(TOKEN_KEY)) !== null;
}
