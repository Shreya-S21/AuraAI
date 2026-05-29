import { motion } from "framer-motion";
import { Aperture, LayoutGrid, BarChart3, User2, RotateCcw } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { Button } from "./ui";
import { UserMenu } from "./UserMenu";

export type Page = "browse" | "dashboard" | "profile";

export function Navbar({
  page,
  setPage,
}: {
  page: Page;
  setPage: (p: Page) => void;
}) {
  const { cameraActive, attention, resetSession } = useSession();
  const nav: { id: Page; label: string; icon: React.ReactNode }[] = [
    { id: "browse", label: "Browse", icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "dashboard", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "profile", label: "Style Memory", icon: <User2 className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#07070b]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <button
          onClick={() => setPage("browse")}
          className="flex items-center gap-2.5"
        >
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-500 shadow-lg shadow-indigo-500/30">
            <Aperture className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <span className="block text-base font-bold leading-none tracking-tight text-white">
              Aura<span className="aura-text-gradient">AI</span>
            </span>
            <span className="block text-[10px] text-zinc-500">
              Behavioral Recommendation Intelligence
            </span>
          </div>
        </button>

        <nav className="hidden items-center gap-1 rounded-full border border-white/5 bg-white/[0.03] p-1 md:flex">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                page === n.id ? "text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {page === n.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/30 to-indigo-500/30 ring-1 ring-violet-400/30"
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {n.icon}
                {n.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1.5 sm:flex">
            <span
              className={`h-1.5 w-1.5 rounded-full ${cameraActive ? "bg-emerald-400 aura-glow" : "bg-zinc-600"}`}
            />
            <span className="text-[11px] text-zinc-400">
              {cameraActive ? `Attention ${Math.round(attention * 100)}%` : "Tracker off"}
            </span>
          </div>
          <Button
            variant="ghost"
            className="px-2.5 py-1.5"
            onClick={resetSession}
            title="Reset session"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <UserMenu />
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 border-t border-white/5 px-2 py-1.5 md:hidden">
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition ${
              page === n.id ? "bg-white/5 text-white" : "text-zinc-400"
            }`}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
