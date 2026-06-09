import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

/**
 * Exclusão de conta in-app (§5 — Apple 5.1.1 + Google). Explica o que é apagado
 * vs retido por lei, confirma a intenção e chama DELETE /me; depois faz signOut
 * (a sessão já é bloqueada no backend). Ação permanente.
 */
export default function DeleteAccount() {
  const { accessToken, signOut, refresh } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function runDelete() {
    let token = accessToken;
    if (!token) {
      await signOut();
      return;
    }
    setSubmitting(true);
    try {
      try {
        await api.deleteAccount(token);
      } catch (err) {
        // Access expirou → refresh uma vez e repete a exclusão.
        if (err instanceof ApiError && err.status === 401) {
          const fresh = await refresh();
          if (!fresh) return; // refresh já fez signOut
          token = fresh;
          await api.deleteAccount(token);
        } else {
          throw err;
        }
      }
      // Sucesso: limpa a sessão local (o AuthGate manda para /login).
      await signOut();
    } catch {
      setSubmitting(false);
      Alert.alert("Não foi possível excluir", "Tente novamente em instantes.");
    }
  }

  function confirm() {
    Alert.alert("Excluir conta", "Esta ação é permanente. Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Excluir minha conta</Text>

        <Text style={styles.paragraph}>
          Ao excluir sua conta, seus dados pessoais (nome, contato e documentos)
          são anonimizados e você não conseguirá mais acessar o app.
        </Text>
        <Text style={styles.paragraph}>
          Registros do seu atendimento que a clínica é obrigada a manter por lei
          podem ser retidos pelo prazo legal, desvinculados da sua identidade
          quando possível.
        </Text>
        <Text style={styles.warning}>Esta ação é permanente.</Text>

        <TouchableOpacity
          style={[styles.deleteBtn, submitting && styles.disabled]}
          onPress={confirm}
          disabled={submitting}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.deleteText}>Excluir minha conta</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          disabled={submitting}
          accessibilityRole="button"
        >
          <Text style={styles.cancel}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#14283d" },
  content: { padding: 24, gap: 16 },
  title: { color: "#ffffff", fontSize: 24, fontWeight: "700", marginTop: 8 },
  paragraph: { color: "#c7d6e5", fontSize: 15, lineHeight: 22 },
  warning: { color: "#ff8a80", fontSize: 15, fontWeight: "600" },
  deleteBtn: {
    backgroundColor: "#c0392b",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  disabled: { opacity: 0.6 },
  deleteText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  cancel: { color: "#9fb3c8", fontSize: 15, textAlign: "center", padding: 8 },
});
