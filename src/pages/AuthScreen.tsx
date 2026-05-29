import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Aperture, Mail, Lock, User2, Loader2, ArrowRight, Sparkles, Shield } from "lucide-react";
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
      setError("Please enter a valid email and password (min 6 characters).");
      return;
    }
    setLoading("form");
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(null);
    }
  };

  const provider = async (p: "google" | "github") => {
    setError(null);
    setLoading(p);
    try {
      await signInWithProvider(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setLoading(null);
    }
  };

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2 bg-[#07070b]">
      {/* Left Brand Panel */}
      <div className="relative hidden overflow-hidden border-r border-white/5 lg:block">
        <div className="absolute inset-0 aura-grid-bg opacity-30" />
        <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-sky-600/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500">
              <Aperture className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AuraAI</span>
          </div>

          <div>
            <h1 className="text-5xl font-bold leading-tight text-white">
              Shopping that <span className="aura-text-gradient">understands you</span>.
            </h1>
            <p className="mt-6 text-lg text-zinc-400">
              Real behavioral intelligence. Your taste profile is built from how you actually engage.
            </p>
          </div>

          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <Shield className="h-4 w-4" /> On-device • Private • Real-time
          </div>
        </div>
      </div>

      {/* Auth Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-sky-500">
              <Aperture className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">AuraAI</span>
          </div>

          <h2 className="text-3xl font-bold text-white">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h2>
          <p className="mt-2 text-zinc-400">
            {mode === "signin" 
              ? "Sign in to see your taste profile" 
              : "Start building your behavioral profile"}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => provider("google")} disabled={!!loading}>
              {loading === "google" ? <Loader2 className="animate-spin" /> : "Google"}
            </Button>
            <Button variant="outline" onClick={() => provider("github")} disabled={!!loading}>
              {loading === "github" ? <Loader2 className="animate-spin" /> : "GitHub"}
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-zinc-500">OR</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-400 outline-none"
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-400 outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-zinc-500 focus:border-violet-400 outline-none"
            />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" className="w-full py-3 text-base" disabled={!!loading}>
              {loading === "form" ? <Loader2 className="animate-spin mx-auto" /> : 
                mode === "signin" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <button
            onClick={continueAsGuest}
            className="mt-4 w-full py-3 text-sm text-zinc-400 hover:text-white transition"
          >
            Continue as Guest
          </button>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
              className="text-violet-400 hover:text-violet-300 font-medium"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>

          <p className="mt-8 text-center text-[10px] text-zinc-600">
            {backend === "firebase" 
              ? "🔥 Connected to Firebase Authentication" 
              : "Using secure local demo authentication"}
          </p>
        </div>
      </div>
    </div>
  );
}
