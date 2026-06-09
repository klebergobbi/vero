import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Tela inicial (base — S9a). Login de equipe e "agenda do dia" (consumindo
 * /auth/login e /me... GET /appointments do dia) chegam na S9b.
 */
export default function Home() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>Vero Pro</Text>
        <Text style={styles.tagline}>
          Sua clínica inteira, de verdade, num app.
        </Text>
        <Text style={styles.note}>App do Profissional — base (S9a).</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1b2a" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  brand: { color: "#ffffff", fontSize: 40, fontWeight: "700" },
  tagline: { color: "#9fb3c8", fontSize: 16, textAlign: "center" },
  note: { color: "#5b7a99", fontSize: 12, marginTop: 24 },
});
