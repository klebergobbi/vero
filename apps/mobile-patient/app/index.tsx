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
import { api, ApiError, type Appointment } from "../lib/api";
import { useAuth } from "../lib/auth";

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  CHECKED_IN: "Check-in",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Faltou",
};

function formatRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const day = start.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  const time = (d: Date) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${day} · ${time(start)}–${time(end)}`;
}

/** "Minhas consultas": só as do próprio paciente (anti-IDOR garantido no backend). */
export default function Home() {
  const { accessToken, signOut, refresh } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await api.myAppointments(accessToken));
    } catch (err) {
      // Access expirou → tenta refresh uma vez e repete.
      if (err instanceof ApiError && err.status === 401) {
        const fresh = await refresh();
        if (fresh) {
          try {
            setItems(await api.myAppointments(fresh));
            return;
          } catch {
            // cai no erro abaixo
          }
        }
      }
      setError("Não foi possível carregar suas consultas.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Minhas consultas</Text>
          <Text style={styles.subtitle}>Vero</Text>
        </View>
        <TouchableOpacity onPress={signOut} accessibilityRole="button">
          <Text style={styles.signOut}>Sair</Text>
        </TouchableOpacity>
      </View>

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
            <Text style={styles.empty}>Você não tem consultas agendadas.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTime}>
                {formatRange(item.startsAt, item.endsAt)}
              </Text>
              <Text style={styles.cardStatus}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#14283d" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { color: "#ffffff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#9fb3c8", fontSize: 13 },
  signOut: { color: "#2dd4bf", fontSize: 15, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  error: { color: "#ff8a80", fontSize: 15 },
  retry: { color: "#2dd4bf", fontSize: 15, fontWeight: "600" },
  list: { padding: 20, gap: 12 },
  empty: { color: "#9fb3c8", textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: "#1b3a5b",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTime: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  cardStatus: {
    color: "#14283d",
    backgroundColor: "#2dd4bf",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
});
