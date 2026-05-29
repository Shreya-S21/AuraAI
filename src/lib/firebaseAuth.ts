import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";

const env = (import.meta as any).env ?? {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || "",
};

export const FIREBASE_READY = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain);

let app: any = null;
let authInstance: any = null;

const getAuthInstance = () => {
  if (!FIREBASE_READY) throw new Error("Firebase config is missing");
  if (!app) app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  if (!authInstance) authInstance = getAuth(app);
  return authInstance;
};

export const fbProviderSignIn = async (provider: "google" | "github") => {
  const auth = getAuthInstance();
  const prov = provider === "google" ? new GoogleAuthProvider() : new GithubAuthProvider();
  const result = await signInWithPopup(auth, prov);
  return {
    name: result.user.displayName || result.user.email?.split("@")[0] || "User",
    email: result.user.email!,
    provider,
  };
};

export const fbSignUp = async (name: string, email: string, password: string) => {
  const auth = getAuthInstance();
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(result.user, { displayName: name });
  return { name: name || email.split("@")[0], email, provider: "password" as const };
};

export const fbSignIn = async (email: string, password: string) => {
  const auth = getAuthInstance();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return {
    name: result.user.displayName || email.split("@")[0],
    email: result.user.email!,
    provider: "password" as const,
  };
};

export const fbSignOut = async () => {
  if (FIREBASE_READY) await signOut(getAuthInstance());
};
