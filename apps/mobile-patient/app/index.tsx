import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type Appointment } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  disablePush,
  enablePush,
  hasPushToken,
  setPushOptOut,
} from "../lib/push";

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
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [optedOut, setOptedOut] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    void hasPushToken().then(setPushOn);
  }, []);

  // Permissão pedida SÓ a partir desta ação do usuário, com contexto (§5 loja).
  const handleEnablePush = useCallback(async () => {
    if (!accessToken) return;
    setPushBusy(true);
    try {
      const result = await enablePush(accessToken);
      if (result === "registered") {
        setPushOn(true);
        setOptedOut(false);
      } else if (result === "denied") {
        Alert.alert(
          "Permissão necessária",
          "Ative as notificações nas configurações do sistema para receber lembretes.",
        );
      } else {
        Alert.alert("Indisponível", "Push só funciona em um aparelho físico.");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível ativar os lembretes.");
    } finally {
      setPushBusy(false);
    }
  }, [accessToken]);

  const handleToggleOptOut = useCallback(
    async (receive: boolean) => {
      if (!accessToken) return;
      setOptedOut(!receive);
      try {
        await setPushOptOut(accessToken, !receive);
      } catch {
        setOptedOut(receive); // reverte em falha
        Alert.alert("Erro", "Não foi possível atualizar a preferência.");
      }
    },
    [accessToken],
  );

  const handleSignOut = useCallback(async () => {
    await disablePush(accessToken);
    await signOut();
  }, [accessToken, signOut]);

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

  const confirm = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      setConfirmingId(id);
      const apply = (status: string) =>
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, status } : it)),
        );
      try {
        const res = await api.confirmAppointment(accessToken, id);
        apply(res.status);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const fresh = await refresh();
          if (fresh) {
            try {
              const res = await api.confirmAppointment(fresh, id);
              apply(res.status);
              return;
            } catch {
              // cai no alerta abaixo
            }
          }
        }
        Alert.alert(
          "Não foi possível confirmar",
          "Tente novamente em instantes.",
        );
      } finally {
        setConfirmingId(null);
      }
    },
    [accessToken, refresh],
  );

  const checkIn = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      setCheckingId(id);
      const apply = (status: string) =>
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, status } : it)),
        );
      try {
        const res = await api.checkIn(accessToken, id);
        apply(res.status);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const fresh = await refresh();
          if (fresh) {
            try {
              const res = await api.checkIn(fresh, id);
              apply(res.status);
              return;
            } catch {
              // cai no alerta abaixo
            }
          }
        }
        Alert.alert(
          "Não foi possível fazer check-in",
          "Tente novamente em instantes.",
        );
      } finally {
        setCheckingId(null);
      }
    },
    [accessToken, refresh],
  );

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
        <TouchableOpacity onPress={handleSignOut} accessibilityRole="button">
          <Text style={styles.signOut}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pushCard}>
        <View style={styles.pushText}>
          <Text style={styles.pushTitle}>Lembretes</Text>
          <Text style={styles.pushSubtitle}>
            {pushOn
              ? "Receba avisos das suas consultas."
              : "Ative para ser avisado das suas consultas."}
          </Text>
        </View>
        {pushOn ? (
          <Switch
            value={!optedOut}
            onValueChange={handleToggleOptOut}
            trackColor={{ true: "#2dd4bf", false: "#3a4a5d" }}
          />
        ) : (
          <TouchableOpacity
            style={styles.pushBtn}
            onPress={handleEnablePush}
            disabled={pushBusy}
            accessibilityRole="button"
          >
            {pushBusy ? (
              <ActivityIndicator color="#14283d" />
            ) : (
              <Text style={styles.pushBtnText}>Ativar</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Link href="/book" asChild>
          <TouchableOpacity style={styles.bookBtn} accessibilityRole="button">
            <Text style={styles.bookBtnText}>+ Agendar consulta</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/contracts" asChild>
          <TouchableOpacity style={styles.bookBtn} accessibilityRole="button">
            <Text style={styles.bookBtnText}>Contratos</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/financeiro" asChild>
          <TouchableOpacity style={styles.bookBtn} accessibilityRole="button">
            <Text style={styles.bookBtnText}>Financeiro</Text>
          </TouchableOpacity>
        </Link>
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
              <View style={styles.cardRow}>
                <Text style={styles.cardTime}>
                  {formatRange(item.startsAt, item.endsAt)}
                </Text>
                <Text style={styles.cardStatus}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </Text>
              </View>
              {item.status === "SCHEDULED" ? (
                <TouchableOpacity
                  style={styles.confirmBtn}
                  accessibilityRole="button"
                  disabled={confirmingId === item.id}
                  onPress={() => void confirm(item.id)}
                >
                  {confirmingId === item.id ? (
                    <ActivityIndicator color="#14283d" />
                  ) : (
                    <Text style={styles.confirmText}>Confirmar presença</Text>
                  )}
                </TouchableOpacity>
              ) : null}
              {item.status === "SCHEDULED" || item.status === "CONFIRMED" ? (
                <TouchableOpacity
                  style={styles.checkInBtn}
                  accessibilityRole="button"
                  disabled={checkingId === item.id}
                  onPress={() => void checkIn(item.id)}
                >
                  {checkingId === item.id ? (
                    <ActivityIndicator color="#2dd4bf" />
                  ) : (
                    <Text style={styles.checkInText}>Fazer check-in</Text>
                  )}
                </TouchableOpacity>
              ) : null}
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
  container: { flex: 1, backgroundColor: "#14283d" },
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
  subtitle: { color: "#9fb3c8", fontSize: 13 },
  signOut: { color: "#2dd4bf", fontSize: 15, fontWeight: "600" },
  pushCard: {
    marginHorizontal: 20,
    marginBottom: 4,
    padding: 16,
    backgroundColor: "#1b3a5b",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pushText: { flex: 1 },
  pushTitle: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  pushSubtitle: { color: "#9fb3c8", fontSize: 13, marginTop: 2 },
  pushBtn: {
    backgroundColor: "#2dd4bf",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: "center",
  },
  pushBtnText: { color: "#14283d", fontSize: 14, fontWeight: "700" },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
  },
  bookBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2dd4bf",
  },
  bookBtnText: { color: "#2dd4bf", fontSize: 15, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  error: { color: "#ff8a80", fontSize: 15 },
  retry: { color: "#2dd4bf", fontSize: 15, fontWeight: "600" },
  list: { padding: 20, gap: 12 },
  empty: { color: "#9fb3c8", textAlign: "center", marginTop: 40 },
  card: {
    backgroundColor: "#1b3a5b",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTime: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  confirmBtn: {
    backgroundColor: "#2dd4bf",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmText: { color: "#14283d", fontSize: 15, fontWeight: "700" },
  checkInBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2dd4bf",
  },
  checkInText: { color: "#2dd4bf", fontSize: 15, fontWeight: "700" },
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
