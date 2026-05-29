import {
  createContext, useContext, useState, useCallback, useMemo, type ReactNode,
} from "react";
import {
  registerAccount, verifyAccount, upsertProviderAccount,
  colorFor, AuthError, type StoredAccount,
} from "../lib/authStore";
import {
  FIREBASE_READY, fbSignIn, fbSignUp, fbProviderSignIn, fbSignOut,
  type FbUser,
} from "../lib/firebaseAuth";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  provider: "password" | "google" | "github" | "guest";
  guest: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  backend: "firebase" | "local";
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: "google" | "github") => Promise<void>;
  continueAsGuest: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = "auraai_auth_v2";

function fromStored(acc: StoredAccount): AuthUser {
  return {
    id: acc.id, name: acc.name, email: acc.email,
    avatarColor: acc.avatarColor, provider: acc.provider, guest: false,
  };
}

function fromFirebase(u: FbUser): AuthUser {
  return {
    id: u.email, name: u.name, email: u.email,
    avatarColor: colorFor(u.email), provider: u.provider, guest: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const backend: "firebase" | "local" = FIREBASE_READY ? "firebase" : "local";

  const persist = useCallback((u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (FIREBASE_READY) {
      persist(fromFirebase(await fbSignIn(email, password)));
    } else {
      persist(fromStored(await verifyAccount(email, password)));
    }
  }, [persist]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    if (FIREBASE_READY) {
      persist(fromFirebase(await fbSignUp(name, email, password)));
    } else {
      persist(fromStored(await registerAccount(name, email, password)));
    }
  }, [persist]);

  const signInWithProvider = useCallback(async (provider: "google" | "github") => {
    if (FIREBASE_READY) {
      persist(fromFirebase(await fbProviderSignIn(provider)));
    } else {
      const email = `you@${provider === "google" ? "gmail.com" : "github.io"}`;
      const acc = upsertProviderAccount(
        provider === "google" ? "Google User" : "GitHub User", email, provider);
      persist(fromStored(acc));
    }
  }, [persist]);

  const continueAsGuest = useCallback(() => {
    persist({
      id: "guest", name: "Guest", email: "guest@auraai.local",
      avatarColor: colorFor("guest"), provider: "guest", guest: true,
    });
  }, [persist]);

  const signOut = useCallback(() => {
    if (FIREBASE_READY) void fbSignOut();
    persist(null);
  }, [persist]);

  const value = useMemo(
    () => ({ user, backend, signIn, signUp, signInWithProvider, continueAsGuest, signOut }),
    [user, backend, signIn, signUp, signInWithProvider, continueAsGuest, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { AuthError };
