import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Tela inicial (base — S8c). Login e "minhas consultas" (consumindo
 * /auth/patient/login e /me/appointments) chegam na S8d.
 */
export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>Vero</Text>
        <Text style={styles.tagline}>Sua clínica, sempre com você.</Text>
        <Text style={styles.note}>App do Paciente — base (S8c).</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#14283d" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  brand: { color: "#ffffff", fontSize: 40, fontWeight: "700" },
  tagline: { color: "#9fb3c8", fontSize: 16 },
  note: { color: "#5b7a99", fontSize: 12, marginTop: 24 },
});
