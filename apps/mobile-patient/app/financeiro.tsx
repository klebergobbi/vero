import * as Clipboard from "expo-clipboard";
import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type InstallmentSummary } from "../lib/api";
import { useAuth } from "../lib/auth";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Em aberto",
  PAID: "Pago",
  OVERDUE: "Vencida",
  CANCELLED: "Cancelada",
};

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** Financeiro do paciente: ver parcelas e copiar PIX/boleto (§S21). */
export default function Financeiro() {
  const { accessToken, refresh } = useAuth();
  const [items, setItems] = useState<InstallmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await api.myInstallments(accessToken));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const fresh = await refresh();
        if (fresh) {
          try {
            setItems(await api.myInstallments(fresh));
            return;
          } catch {
            // cai no erro abaixo
          }
        }
      }
      setError("Não foi possível carregar suas parcelas.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  const copy = useCallback(async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert("Copiado", `${label} copiado para a área de transferência.`);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Financeiro" }} />
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
            <Text style={styles.empty}>Você não tem parcelas.</Text>
          }
          renderItem={({ item }) => {
            const paid = item.status === "PAID";
            return (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>
                    Parcela {item.number} · {brl(item.amountCents)}
                  </Text>
                  <Text style={[styles.badge, paid ? styles.badgePaid : null]}>
                    {STATUS_LABELS[item.status] ?? item.status}
                  </Text>
                </View>
                <Text style={styles.cardSub}>
                  Vence em {formatDate(item.dueDate)}
                </Text>
                {!paid && item.pixPayload ? (
                  <TouchableOpacity
                    style={styles.copyBtn}
                    accessibilityRole="button"
                    onPress={() => void copy("PIX", item.pixPayload!)}
                  >
                    <Text style={styles.copyText}>Copiar PIX copia-e-cola</Text>
                  </TouchableOpacity>
                ) : null}
                {!paid && item.boletoBarcode ? (
                  <TouchableOpacity
                    style={styles.copyBtnOutline}
                    accessibilityRole="button"
                    onPress={() => void copy("Boleto", item.boletoBarcode!)}
                  >
                    <Text style={styles.copyTextOutline}>
                      Copiar código do boleto
                    </Text>
                  </TouchableOpacity>
                ) : null}
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
  cardTitle: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
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
  badgePaid: { backgroundColor: "#2dd4bf" },
  copyBtn: {
    backgroundColor: "#2dd4bf",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  copyText: { color: "#14283d", fontSize: 14, fontWeight: "700" },
  copyBtnOutline: {
    borderWidth: 1,
    borderColor: "#2dd4bf",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  copyTextOutline: { color: "#2dd4bf", fontSize: 14, fontWeight: "700" },
});
