import { motion } from "framer-motion";
import {
  Fingerprint, Palette, Tag, Layers, Store, DollarSign,
  Eye, Clock, Bookmark, Sparkles, TrendingUp,
} from "lucide-react";
import { useSession } from "../context/SessionContext";
import { buildTasteProfile, WeightedItem } from "../lib/tasteProfile";
import { Card } from "./ui";

// A full, data-driven portrait of the user's taste, derived entirely
// from their real browsing behavior.
export function TasteProfile() {
  const { state } = useSession();
  const p = buildTasteProfile(state);

  return (
    <div className="space-y-6">
      {/* Persona hero */}
      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-500 text-4xl shadow-xl shadow-indigo-500/30">
            {p.persona.emoji}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Fingerprint className="h-4 w-4 text-violet-400" />
              <span className="text-[11px] uppercase tracking-widest text-zinc-500">
                Your Style Persona
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white">{p.persona.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">{p.persona.blurb}</p>
          </div>
          {/* Confidence ring */}
          <Confidence value={p.completeness} />
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Eye />} label="Explored" value={`${p.stats.productsExplored}`} />
        <Stat icon={<Bookmark />} label="Saved" value={`${p.stats.saved}`} />
        <Stat icon={<Clock />} label="Dwell" value={`${p.stats.totalDwellSec}s`} />
        <Stat icon={<TrendingUp />} label="Attention" value={`${p.stats.avgAttention}%`} />
      </div>

      {!p.hasData ? (
        <Card className="p-10 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-violet-400" />
          <p className="text-sm text-zinc-400">
            Browse and hover a few products — AuraAI will build your full taste
            profile in real time.
          </p>
        </Card>
      ) : (
        <>
          {/* Insights */}
          <Card className="p-5">
            <Header icon={<Sparkles className="h-4 w-4 text-amber-400" />} title="What we've learned about you" />
            <ul className="space-y-2">
              {p.insights.map((ins, i) => (
                <motion.li
                  key={ins}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-2 text-sm text-zinc-300"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-violet-400 to-sky-400" />
                  {ins}
                </motion.li>
              ))}
            </ul>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <BarList icon={<Tag className="h-4 w-4 text-violet-400" />} title="Aesthetic Signature" items={p.aesthetics} capitalize />
            <BarList icon={<Layers className="h-4 w-4 text-sky-400" />} title="Category Affinity" items={p.categories} />
            <BarList icon={<Store className="h-4 w-4 text-emerald-400" />} title="Brand Affinity" items={p.brands} />

            {/* Color + price */}
            <Card className="p-5">
              <Header icon={<Palette className="h-4 w-4 text-rose-400" />} title="Color & Price DNA" />
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{p.colorMood.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.colorMood.label}</p>
                      <p className="text-[11px] text-zinc-500">Dominant palette</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-rose-300">{p.colorMood.pct}%</span>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      <DollarSign className="h-4 w-4 text-emerald-400" /> {p.priceProfile.label}
                    </span>
                    <span className="text-sm font-bold text-emerald-300">~${p.priceProfile.avg}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span>${p.priceProfile.min}</span>
                    <div className="relative h-1.5 flex-1 rounded-full bg-white/5">
                      <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-sky-400"
                        style={{ width: `${p.priceProfile.max ? (p.priceProfile.avg / p.priceProfile.max) * 100 : 0}%` }} />
                    </div>
                    <span>${p.priceProfile.max}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Top products */}
          <Card className="p-5">
            <Header icon={<TrendingUp className="h-4 w-4 text-violet-400" />} title="Pieces You're Most Drawn To" />
            <div className="space-y-2">
              {p.topProducts.map((tp, i) => (
                <motion.div
                  key={tp.product.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-xl">
                    {tp.product.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{tp.product.name}</p>
                    <p className="text-[11px] text-zinc-500">{tp.product.brand} · {tp.product.category}</p>
                  </div>
                  <div className="w-24">
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400" style={{ width: `${tp.score}%` }} />
                    </div>
                  </div>
                  <span className="w-10 text-right text-sm font-bold text-violet-300">{tp.score}%</span>
                </motion.div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Confidence({ value }: { value: number }) {
  const r = 30, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="url(#cg)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 0.9s ease" }} />
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a78bfa" /><stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold text-white">{value}%</span>
        <span className="text-[8px] uppercase text-zinc-500">profile</span>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3 text-center">
      <span className="mx-auto mb-1 grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-zinc-300">
        {icon}
      </span>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
    </Card>
  );
}

function Header({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {icon}
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  );
}

function BarList({
  icon, title, items, capitalize,
}: {
  icon: React.ReactNode; title: string; items: WeightedItem[]; capitalize?: boolean;
}) {
  const max = Math.max(...items.map((i) => i.weight), 1);
  return (
    <Card className="p-5">
      <Header icon={icon} title={title} />
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">Not enough data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((it, i) => (
            <div key={it.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={`text-zinc-300 ${capitalize ? "capitalize" : ""}`}>{it.label}</span>
                <span className="text-zinc-500">{it.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(it.weight / max) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
