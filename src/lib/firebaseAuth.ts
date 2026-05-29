// =============================================================
// REAL authentication via Firebase Auth.
// -------------------------------------------------------------
// Provides genuine Google & GitHub OAuth popups AND real
// email/password accounts backed by Firebase.
//
// SETUP (one time):
//   1) Go to https://console.firebase.google.com → create a project.
//   2) Build → Authentication → Get started.
//      • Enable "Email/Password"
//      • Enable "Google"
//      • Enable "GitHub" (needs a GitHub OAuth app — see README note)
//   3) Project settings → Your apps → Web app → copy the config.
//   4) Paste the values into .env (see .env.example) OR directly below.
//   5) Add your dev/prod domains under Authentication → Settings →
//      Authorized domains (localhost is allowed by default).
//
// If the config is missing, the app automatically falls back to the
// local demo auth store so it still runs.
// =============================================================

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";

// Read config from Vite env vars (recommended) with safe fallbacks.
const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "",
  appId: env.VITE_FIREBASE_APP_ID ?? "",
};

// Firebase is "configured" only when the essential keys are present.
export const FIREBASE_READY = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.appId,
);

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function auth(): Auth {
  if (!FIREBASE_READY) throw new Error("Firebase is not configured.");
  if (!_app) _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  if (!_auth) _auth = getAuth(_app);
  return _auth;
}

export interface FbUser {
  name: string;
  email: string;
  provider: "google" | "github" | "password";
}

function mapUser(u: User, provider: FbUser["provider"]): FbUser {
  return {
    name: u.displayName || u.email?.split("@")[0] || "AuraAI User",
    email: u.email ?? `${u.uid}@auraai.user`,
    provider,
  };
}

// Friendly messages for the common Firebase error codes.
function friendly(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/user-not-found": "No account found with that email.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/popup-closed-by-user": "Sign-in popup was closed before completing.",
    "auth/popup-blocked": "Popup blocked — allow popups for this site and retry.",
    "auth/account-exists-with-different-credential":
      "This email is already linked to a different sign-in method.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] ?? "Authentication failed. Please try again.";
}

function wrap(e: unknown): never {
  const code = (e as { code?: string })?.code ?? "";
  throw new Error(friendly(code));
}

// ---- Public API ----
export async function fbProviderSignIn(provider: "google" | "github"): Promise<FbUser> {
  try {
    const p = provider === "google" ? new GoogleAuthProvider() : new GithubAuthProvider();
    const res = await signInWithPopup(auth(), p);
    return mapUser(res.user, provider);
  } catch (e) {
    wrap(e);
  }
}

export async function fbSignUp(name: string, email: string, password: string): Promise<FbUser> {
  try {
    const res = await createUserWithEmailAndPassword(auth(), email, password);
    if (name.trim()) await updateProfile(res.user, { displayName: name.trim() });
    return { name: name.trim() || email.split("@")[0], email, provider: "password" };
  } catch (e) {
    wrap(e);
  }
}

export async function fbSignIn(email: string, password: string): Promise<FbUser> {
  try {
    const res = await signInWithEmailAndPassword(auth(), email, password);
    return mapUser(res.user, "password");
  } catch (e) {
    wrap(e);
  }
}

export async function fbSignOut(): Promise<void> {
  if (FIREBASE_READY && _auth) await firebaseSignOut(_auth).catch(() => {});
}
