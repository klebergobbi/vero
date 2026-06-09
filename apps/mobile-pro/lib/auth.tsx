import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type StaffLoginInput } from "./api";

/**
 * Sessão do profissional (User de equipe). Tokens em expo-secure-store
 * (Keychain/Keystore — §5). Access curto; refresh rotaciona no backend (reuso →
 * 401). Em falha de refresh, faz signOut (fail-closed).
 */
const ACCESS_KEY = "vero_pro_at";
const REFRESH_KEY = "vero_pro_rt";

interface AuthValue {
  accessToken: string | null;
  isLoading: boolean;
  signIn: (creds: StaffLoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<string | null>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync(ACCESS_KEY);
        setAccessToken(stored);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (creds: StaffLoginInput) => {
    const tokens = await api.login(creds);
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
    setAccessToken(tokens.accessToken);
  }, []);

  const signOut = useCallback(async () => {
    const rt = await SecureStore.getItemAsync(REFRESH_KEY);
    if (rt) {
      try {
        await api.logout(rt); // best-effort: revoga a sessão no backend
      } catch {
        // mesmo que falhe, limpamos a sessão local
      }
    }
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    setAccessToken(null);
  }, []);

  const refresh = useCallback(async (): Promise<string | null> => {
    const rt = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!rt) {
      setAccessToken(null);
      return null;
    }
    try {
      const tokens = await api.refresh(rt);
      await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
      await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
      setAccessToken(tokens.accessToken);
      return tokens.accessToken;
    } catch {
      await signOut();
      return null;
    }
  }, [signOut]);

  const value = useMemo(
    () => ({ accessToken, isLoading, signIn, signOut, refresh }),
    [accessToken, isLoading, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
