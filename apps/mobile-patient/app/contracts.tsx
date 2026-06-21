import { Link, Stack } from "expo-router";
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
import { api, ApiError, type ContractSummary } from "../lib/api";
import { useAuth } from "../lib/auth";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Aguardando assinatura",
  SIGNED: "Assinado",
  CANCELLED: "Cancelado",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** Lista de contratos do paciente (§S18b). */
export default function Contracts() {
  const { accessToken, refresh } = useAuth();
  const [items, setItems] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await api.myContracts(accessToken));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const fresh = await refresh();
        if (fresh) {
          try {
            setItems(await api.myContracts(fresh));
            return;
          } catch {
            // cai no erro abaixo
          }
        }
      }
      setError("Não foi possível carregar seus contratos.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Meus contratos" }} />
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
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>Você não tem contratos.</Text>
          }
          renderItem={({ item }) => (
            <Link href={`/contract/${item.id}`} asChild>
              <TouchableOpacity style={styles.card} accessibilityRole="button">
                <View style={styles.cardRow}>
                  <Text style={styles.cardDate}>
                    {formatDate(item.createdAt)}
                  </Text>
                  <Text
                    style={[
                      styles.badge,
                      item.status === "SIGNED" ? styles.badgeSigned : null,
                    ]}
                  >
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
              </TouchableOpacity>
            </Link>
          )}
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
  card: { backgroundColor: "#1b3a5b", borderRadius: 12, padding: 16 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDate: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
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
  badgeSigned: { backgroundColor: "#2dd4bf" },
});
