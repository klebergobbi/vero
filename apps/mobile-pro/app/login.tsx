import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

/** Login do profissional (equipe). Erro genérico (espelha o backend §4). */
export default function Login() {
  const { signIn } = useAuth();
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!tenantSlug || !email || !password) {
      setError("Preencha clínica, e-mail e senha.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn({ tenantSlug, email, password });
      // O AuthGate redireciona para "/" ao detectar a sessão.
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) {
        setError("Serviço indisponível. Tente novamente.");
      } else {
        setError("Credenciais inválidas.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>Vero Pro</Text>
        <Text style={styles.tagline}>Sua clínica inteira, num app.</Text>

        <Field
          label="Clínica"
          value={tenantSlug}
          onChangeText={setTenantSlug}
          placeholder="vero-demo"
          autoCapitalize="none"
        />
        <Field
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          placeholder="voce@clinica.com.br"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field
          label="Senha"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color="#0d1b2a" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences";
  keyboardType?: "default" | "email-address";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#5b7a99"
        secureTextEntry={props.secureTextEntry}
        autoCapitalize={props.autoCapitalize}
        keyboardType={props.keyboardType}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d1b2a" },
  content: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  brand: { color: "#ffffff", fontSize: 36, fontWeight: "700" },
  tagline: { color: "#9fb3c8", fontSize: 15, marginBottom: 16 },
  field: { gap: 6 },
  label: { color: "#c7d6e5", fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: "#14283d",
    color: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  error: { color: "#ff8a80", fontSize: 14 },
  button: {
    backgroundColor: "#2dd4bf",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#0d1b2a", fontSize: 16, fontWeight: "700" },
});
