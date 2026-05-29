import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User2, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;
  const initials = user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-1 pr-2 transition hover:bg-white/[0.07]"
      >
        <span className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white ${user.avatarColor}`}>
          {initials}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b12]/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-white/5 p-4">
              <span className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${user.avatarColor}`}>
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-[11px] text-zinc-500">{user.email}</p>
              </div>
            </div>
            {user.guest && (
              <div className="border-b border-white/5 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-300">
                You're browsing as a guest.
              </div>
            )}
            <div className="p-1.5">
              <MenuItem icon={<User2 className="h-4 w-4" />} label="Taste Profile" />
              <MenuItem icon={<Settings className="h-4 w-4" />} label="Settings" />
              <button
                onClick={signOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white">
      {icon} {label}
    </button>
  );
}
