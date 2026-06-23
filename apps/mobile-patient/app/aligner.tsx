import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type AlignerCaseSummary } from "../lib/api";
import { useAuth } from "../lib/auth";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** Acompanhamento de alinhadores: etapa atual e próxima troca (§S31). */
export default function Aligner() {
  const { accessToken, refresh } = useAuth();
  const [cases, setCases] = useState<AlignerCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      setCases(await api.myAligner(accessToken));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const fresh = await refresh();
        if (fresh) {
          try {
            setCases(await api.myAligner(fresh));
            return;
          } catch {
            // cai no erro abaixo
          }
        }
      }
      setError("Não foi possível carregar seus alinhadores.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Meus alinhadores" }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2dd4bf" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={load} accessibilityRole="button">
            <Text style={styles.retry}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Você ainda não tem um caso de alinhadores.
            </Text>
          }
          renderItem={({ item }) => {
            const done = item.status === "COMPLETED";
            return (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={[styles.badge, done ? styles.badgeDone : null]}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
                <Text style={styles.step}>
                  Alinhador {item.currentStep} de {item.totalSteps}
                </Text>
                {item.nextChangeDate ? (
                  <Text style={styles.cardSub}>
                    Próxima troca: {formatDate(item.nextChangeDate)} (alinhador{" "}
                    {item.nextStep})
                  </Text>
                ) : (
                  <Text style={styles.cardSub}>
                    {done
                      ? "Tratamento concluído 🎉"
                      : "Você está no último alinhador."}
                  </Text>
                )}
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#14283d" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  error: { color: "#ff8a80", fontSize: 15 },
  retry: { color: "#2dd4bf", fontSize: 15, fontWeight: "600" },
  list: { padding: 20, gap: 12 },
  empty: { color: "#9fb3c8", textAlign: "center", marginTop: 40 },
  card: { backgroundColor: "#1b3a5b", borderRadius: 12, padding: 16, gap: 8 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { color: "#ffffff", fontSize: 16, fontWeight: "700", flex: 1 },
  step: { color: "#2dd4bf", fontSize: 15, fontWeight: "600" },
  cardSub: { color: "#9fb3c8", fontSize: 13 },
  badge: {
    color: "#14283d",
    backgroundColor: "#f0b429",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  badgeDone: { backgroundColor: "#2dd4bf" },
});
