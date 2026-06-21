import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiError, type NamedRef, type OpenSlot } from "../lib/api";
import { useAuth } from "../lib/auth";

function slotLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Agendamento online do paciente logado (§S15c): escolher → horários → confirmar. */
export default function Book() {
  const { accessToken, refresh } = useAuth();
  const router = useRouter();
  const [units, setUnits] = useState<NamedRef[]>([]);
  const [professionals, setProfessionals] = useState<NamedRef[]>([]);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<OpenSlot[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Recarrega com refresh-on-401 (uma vez).
  const withAuth = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T | null> => {
      if (!accessToken) return null;
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

  useEffect(() => {
    void (async () => {
      try {
        const [u, p] = await Promise.all([
          withAuth((t) => api.meUnits(t)),
          withAuth((t) => api.meProfessionals(t)),
        ]);
        if (u) {
          setUnits(u);
          setUnitId(u[0]?.id ?? null);
        }
        if (p) {
          setProfessionals(p);
          setProfessionalId(p[0]?.id ?? null);
        }
      } catch {
        Alert.alert("Erro", "Não foi possível carregar a clínica.");
      }
    })();
  }, [withAuth]);

  const loadSlots = useCallback(async () => {
    if (!unitId || !professionalId || !date) {
      Alert.alert("Atenção", "Escolha profissional e data (AAAA-MM-DD).");
      return;
    }
    setBusy(true);
    setSlots(null);
    setSelected(null);
    try {
      const res = await withAuth((t) =>
        api.meSlots(t, { unitId, professionalId, date }),
      );
      setSlots(res ?? []);
    } catch {
      Alert.alert("Erro", "Não foi possível buscar horários.");
    } finally {
      setBusy(false);
    }
  }, [unitId, professionalId, date, withAuth]);

  const confirm = useCallback(async () => {
    if (!unitId || !professionalId || !selected) return;
    setBusy(true);
    try {
      await withAuth((t) =>
        api.meBook(t, { unitId, professionalId, startsAt: selected }),
      );
      Alert.alert("Pronto!", "Consulta agendada.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 409
          ? "Esse horário acabou de ser ocupado. Escolha outro."
          : "Não foi possível agendar. Tente novamente.";
      Alert.alert("Erro", msg);
      void loadSlots(); // atualiza a lista
    } finally {
      setBusy(false);
    }
  }, [unitId, professionalId, selected, withAuth, router, loadSlots]);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Agendar consulta" }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Profissional</Text>
        <View style={styles.chips}>
          {professionals.map((p) => (
            <Chip
              key={p.id}
              label={p.name}
              active={p.id === professionalId}
              onPress={() => setProfessionalId(p.id)}
            />
          ))}
        </View>

        {units.length > 1 ? (
          <>
            <Text style={styles.label}>Unidade</Text>
            <View style={styles.chips}>
              {units.map((u) => (
                <Chip
                  key={u.id}
                  label={u.name}
                  active={u.id === unitId}
                  onPress={() => setUnitId(u.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>Data (AAAA-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="2026-07-10"
          placeholderTextColor="#5b7088"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => void loadSlots()}
          disabled={busy}
          accessibilityRole="button"
        >
          {busy && slots === null ? (
            <ActivityIndicator color="#14283d" />
          ) : (
            <Text style={styles.primaryText}>Ver horários</Text>
          )}
        </TouchableOpacity>

        {slots !== null ? (
          slots.length > 0 ? (
            <>
              <Text style={styles.label}>Horários livres</Text>
              <View style={styles.chips}>
                {slots.map((s) => (
                  <Chip
                    key={s.start}
                    label={slotLabel(s.start)}
                    active={s.start === selected}
                    onPress={() => setSelected(s.start)}
                  />
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.empty}>
              Nenhum horário livre nessa data. Tente outro dia.
            </Text>
          )
        ) : null}

        {selected ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => void confirm()}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#14283d" />
            ) : (
              <Text style={styles.primaryText}>
                Confirmar {slotLabel(selected)}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <Text style={active ? styles.chipTextActive : styles.chipText}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#14283d" },
  content: { padding: 20, gap: 12 },
  label: { color: "#9fb3c8", fontSize: 13, marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#3a4a5d",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#2dd4bf", borderColor: "#2dd4bf" },
  chipText: { color: "#cdd9e5", fontSize: 14 },
  chipTextActive: { color: "#14283d", fontSize: 14, fontWeight: "700" },
  input: {
    backgroundColor: "#1b3a5b",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: "#2dd4bf",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { color: "#14283d", fontSize: 15, fontWeight: "700" },
  empty: { color: "#9fb3c8", fontSize: 14, marginTop: 4 },
});
