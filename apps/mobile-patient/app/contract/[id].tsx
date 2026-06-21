import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type ContractDetail } from "../../lib/api";
import { useAuth } from "../../lib/auth";

/** Detalhe do contrato + assinatura (§S18b). */
export default function ContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, refresh } = useAuth();
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const withAuth = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!accessToken) throw new Error("sem sessão");
      try {
        return await fn(accessToken);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const fresh = await refresh();
          if (fresh) return fn(fresh);
        }
        throw err;
      }
    },
    [accessToken, refresh],
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setContract(await withAuth((t) => api.getContract(t, id)));
    } catch {
      setError("Não foi possível carregar o contrato.");
    } finally {
      setLoading(false);
    }
  }, [id, withAuth]);

  useEffect(() => {
    void load();
  }, [load]);

  const doSign = useCallback(() => {
    if (!id) return;
    Alert.alert(
      "Assinar contrato",
      "Ao assinar, você declara estar de acordo com o documento. A assinatura é registrada com data, hora e IP.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Assinar",
          onPress: () => {
            setSigning(true);
            void (async () => {
              try {
                const signed = await withAuth((t) => api.signContract(t, id));
                setContract(signed);
                Alert.alert("Pronto!", "Contrato assinado com sucesso.");
              } catch (err) {
                const msg =
                  err instanceof ApiError && err.status === 409
                    ? "Este contrato já foi assinado."
                    : "Não foi possível assinar agora.";
                Alert.alert("Erro", msg);
              } finally {
                setSigning(false);
              }
            })();
          },
        },
      ],
    );
  }, [id, withAuth]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Contrato" }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2dd4bf" />
        </View>
      ) : error || !contract ? (
        <View style={styles.center}>
          <Text style={styles.error}>
            {error ?? "Contrato não encontrado."}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.bodyText}>{contract.body}</Text>
            {contract.status === "SIGNED" ? (
              <Text style={styles.signedNote}>
                ✓ Assinado
                {contract.signatures[0]
                  ? ` por ${contract.signatures[0].signerName}`
                  : ""}
                {contract.signedAt
                  ? ` em ${new Date(contract.signedAt).toLocaleString("pt-BR")}`
                  : ""}
                .
              </Text>
            ) : null}
          </ScrollView>
          {contract.status === "DRAFT" ? (
            <TouchableOpacity
              style={styles.signBtn}
              onPress={doSign}
              disabled={signing}
              accessibilityRole="button"
            >
              {signing ? (
                <ActivityIndicator color="#14283d" />
              ) : (
                <Text style={styles.signText}>Assinar contrato</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#14283d" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  error: { color: "#ff8a80", fontSize: 15 },
  body: { padding: 20 },
  bodyText: {
    color: "#e6edf3",
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "monospace",
  },
  signedNote: {
    color: "#2dd4bf",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 20,
  },
  signBtn: {
    backgroundColor: "#2dd4bf",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    margin: 20,
  },
  signText: { color: "#14283d", fontSize: 16, fontWeight: "700" },
});
