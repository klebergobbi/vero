import { Link } from "expo-router";
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

/** Janela do dia LOCAL como instantes UTC (a API filtra startsAt em [from, to]). */
function dayWindow(): { from: string; to: string; label: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    label: start.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    }),
  };
}

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Agenda do dia" read-only do profissional (consultas do tenant no dia). */
export default function Home() {
  const { accessToken, signOut, refresh } = useAuth();
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [day] = useState(dayWindow);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await api.appointmentsForDay(accessToken, day.from, day.to));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const fresh = await refresh();
        if (fresh) {
          try {
            setItems(await api.appointmentsForDay(fresh, day.from, day.to));
            return;
          } catch {
            // cai no erro abaixo
          }
        }
      }
      setError("Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refresh, day]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Agenda do dia</Text>
          <Text style={styles.subtitle}>{day.label}</Text>
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
            <Text style={styles.empty}>Sem consultas para hoje.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTime}>
                {hhmm(item.startsAt)}–{hhmm(item.endsAt)}
              </Text>
              <Text style={styles.cardStatus}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
          )}
        />
      )}

      <Link href="/delete-account" style={styles.footerLink}>
        Excluir minha conta
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1b2a" },
  footerLink: {
    color: "#9fb3c8",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { color: "#ffffff", fontSize: 22, fontWeight: "700" },
  subtitle: { color: "#9fb3c8", fontSize: 13, textTransform: "capitalize" },
  signOut: { color: "#2dd4bf", fontSize: 15, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  error: { color: "#ff8a80", fontSize: 15 },
  retry: { color: "#2dd4bf", fontSize: 15, fontWeight: "600" },
  list: { padding: 20, gap: 12 },
  empty: { color: "#9fb3c8", textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: "#14283d",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTime: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  cardStatus: {
    color: "#0d1b2a",
    backgroundColor: "#2dd4bf",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
});
