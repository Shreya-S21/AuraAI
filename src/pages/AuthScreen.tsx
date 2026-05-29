import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Aperture, Mail, Lock, User2, Loader2, ArrowRight, Sparkles,
  ScanFace, Brain, Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const { signIn, signUp, signInWithProvider, continueAsGuest, backend } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setLoading("form");
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(name, email, password);
    } catch (err) {
      // Surface real validation errors (wrong password, duplicate email, etc.)
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(null);
    }
  };

  const provider = async (p: "google" | "github") => {
    setError(null);
    setLoading(p);
    try {
      await signInWithProvider(p);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? `${p === "google" ? "Google" : "GitHub"} sign-in failed: ${err.message}`
          : `${p === "google" ? "Google" : "GitHub"} sign-in was cancelled.`,
      );
      setLoading(null);
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Left: brand / value panel */}
      <div className="relative hidden overflow-hidden border-r border-white/5 lg:block">
        <div className="absolute inset-0 aura-grid-bg opacity-40" />
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-violet-700/25 blur-3xl aura-glow" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-sky-600/20 blur-3xl aura-glow" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-500 shadow-lg shadow-indigo-500/30">
              <Aperture className="h-6 w-6 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Aura<span className="aura-text-gradient">AI</span>
            </span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
              Shopping that{" "}
              <span className="aura-text-gradient">understands</span> how you browse.
            </h1>
            <p className="mt-4 text-sm text-zinc-400">
              Real-time behavioral recommendation intelligence. Sign in to build
              your living taste profile.
            </p>
            <div className="mt-8 space-y-4">
              <Feature icon={<ScanFace className="h-4 w-4" />} title="Live engagement tracking"
                desc="On-device MediaPipe face-mesh attention analysis." />
              <Feature icon={<Brain className="h-4 w-4" />} title="Explainable recommendations"
                desc="CLIP + FAISS vector search with plain-English reasons." />
              <Feature icon={<Sparkles className="h-4 w-4" />} title="Your taste, decoded"
                desc="A style persona derived from your real behavior." />
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-zinc-600">
            <Shield className="h-3.5 w-3.5" /> Privacy-first · behavioral analysis, not emotion detection
          </p>
        </div>
      </div>

      {/* Right: auth form */}
      <div className="relative flex items-center justify-center px-5 py-12">
        <div className="absolute inset-0 -z-10 lg:hidden">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-700/20 blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-sky-500">
              <Aperture className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold text-white">
              Aura<span className="aura-text-gradient">AI</span>
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {mode === "signin"
              ? "Sign in to continue to your taste profile."
              : "Start building your AuraAI style identity."}
          </p>

          {/* Providers */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <ProviderBtn label="Google" loading={loading === "google"}
              onClick={() => provider("google")} icon={<GoogleIcon />} />
            <ProviderBtn label="GitHub" loading={loading === "github"}
              onClick={() => provider("github")} icon={<GitHubIcon />} />
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] uppercase tracking-wide text-zinc-600">or</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <AnimatePresence mode="popLayout">
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Field icon={<User2 className="h-4 w-4" />} placeholder="Full name"
                    value={name} onChange={setName} />
                </motion.div>
              )}
            </AnimatePresence>
            <Field icon={<Mail className="h-4 w-4" />} placeholder="Email" type="email"
              value={email} onChange={setEmail} />
            <Field icon={<Lock className="h-4 w-4" />} placeholder="Password" type="password"
              value={password} onChange={setPassword} />

            {error && <p className="text-[12px] text-amber-400">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading === "form"}>
              {loading === "form" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <button
            onClick={continueAsGuest}
            className="mt-3 w-full rounded-xl border border-white/10 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5"
          >
            Continue as Guest
          </button>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {mode === "signin" ? "New to AuraAI? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
              className="font-semibold text-violet-300 hover:text-violet-200"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-zinc-600">
            <span
              className={`h-1.5 w-1.5 rounded-full ${backend === "firebase" ? "bg-emerald-400" : "bg-amber-400"}`}
            />
            {backend === "firebase"
              ? "Connected to Firebase Authentication"
              : "Local demo auth — add Firebase keys to .env for real OAuth"}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-violet-300">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-zinc-500">{desc}</p>
      </div>
    </div>
  );
}

function Field({
  icon, placeholder, value, onChange, type = "text",
}: {
  icon: React.ReactNode; placeholder: string; value: string;
  onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">{icon}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-400/40 focus:bg-white/[0.05]"
      />
    </div>
  );
}

function ProviderBtn({
  label, icon, onClick, loading,
}: {
  label: string; icon: React.ReactNode; onClick: () => void; loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.07] disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.27 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.32 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.78-4.57 5.03.36.32.68.94.68 1.9v2.82c0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}
