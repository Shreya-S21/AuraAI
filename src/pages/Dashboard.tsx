import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Eye, Clock, Target, Layers } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { PRODUCTS, CATEGORIES, Product } from "../data/products";
import { engagementScore, recommend } from "../lib/engagement";
import { Card } from "../components/ui";

export function Dashboard({ onOpen }: { onOpen: (p: Product) => void }) {
  const { state, sessionStart } = useSession();

  const engaged = useMemo(() => {
    return PRODUCTS.map((p) => ({
      product: p,
      score: engagementScore(state.signals[p.id]),
      dwell: state.signals[p.id]?.dwellMs ?? 0,
      views: state.signals[p.id]?.views ?? 0,
    }))
      .filter((x) => x.score > 0 || x.views > 0)
      .sort((a, b) => b.score - a.score);
  }, [state]);

  const totalDwell = Math.round(
    Object.values(state.signals).reduce((s, x) => s + x.dwellMs, 0) / 1000,
  );
  const totalViews = Object.values(state.signals).reduce((s, x) => s + x.views, 0);
  const avgEng = engaged.length
    ? Math.round(engaged.reduce((s, x) => s + x.score, 0) / engaged.length)
    : 0;
  const sessionMin = Math.max(1, Math.round((Date.now() - sessionStart) / 60000));

  // Category engagement radar
  const radar = CATEGORIES.map((c) => {
    const items = PRODUCTS.filter((p) => p.category === c);
    const val = items.reduce((s, p) => s + engagementScore(state.signals[p.id]), 0);
    return { category: c, value: val };
  });

  // Top-engaged bar
  const barData = engaged.slice(0, 6).map((e) => ({
    name: e.product.name.split(" ").slice(0, 2).join(" "),
    engagement: e.score,
  }));

  // Synthetic session timeline (dummy realistic data + live points)
  const timeline = useMemo(() => {
    const base = Array.from({ length: 12 }, (_, i) => ({
      t: `${i * 5}m`,
      engagement: Math.round(30 + Math.sin(i / 1.5) * 18 + Math.random() * 12),
    }));
    if (avgEng > 0) base[base.length - 1].engagement = avgEng;
    return base;
  }, [avgEng]);

  const recPerf = recommend(state, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Behavioral engagement intelligence for your current session
        </p>
      </div>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={<Clock />} label="Total Dwell" value={`${totalDwell}s`} tint="violet" />
        <Kpi icon={<Eye />} label="Product Views" value={`${totalViews}`} tint="sky" />
        <Kpi icon={<TrendingUp />} label="Avg Engagement" value={`${avgEng}%`} tint="emerald" />
        <Kpi icon={<Clock />} label="Session Length" value={`${sessionMin}m`} tint="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top engaged */}
        <Card className="p-5">
          <ChartHeader icon={<Target className="h-4 w-4 text-violet-400" />} title="Top Engaged Products" />
          {barData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "#0b0b12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
                  cursor={{ fill: "rgba(139,92,246,0.08)" }}
                />
                <Bar dataKey="engagement" radius={[6, 6, 0, 0]} fill="url(#barGrad)" />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </Card>

        {/* Category radar */}
        <Card className="p-5">
          <ChartHeader icon={<Layers className="h-4 w-4 text-sky-400" />} title="Category Affinity" />
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radar}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="category" tick={{ fill: "#71717a", fontSize: 11 }} />
              <Radar dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Session timeline */}
        <Card className="p-5 lg:col-span-2">
          <ChartHeader icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} title="Session Engagement Timeline" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeline} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="t" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 11 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#0b0b12", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              <Area type="monotone" dataKey="engagement" stroke="#a78bfa" strokeWidth={2} fill="url(#areaGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Interaction heatmap */}
      <Card className="mt-6 p-5">
        <ChartHeader icon={<Eye className="h-4 w-4 text-amber-400" />} title="Interaction Heatmap" />
        <p className="mb-4 text-xs text-zinc-500">
          Engagement intensity per product (darker → more attention)
        </p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-12">
          {PRODUCTS.map((p) => {
            const sc = engagementScore(state.signals[p.id]);
            return (
              <button
                key={p.id}
                onClick={() => onOpen(p)}
                data-aura-product-id={p.id}
                title={`${p.name} · ${sc}%`}
                className="group relative aspect-square rounded-lg border border-white/5 transition hover:scale-105"
                style={{
                  background: `rgba(139,92,246,${0.08 + (sc / 100) * 0.8})`,
                }}
              >
                <span className="absolute inset-0 grid place-items-center text-lg opacity-70">
                  {p.emoji}
                </span>
                <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white/80">
                  {sc}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Recommendation performance */}
      <Card className="mt-6 p-5">
        <ChartHeader icon={<Target className="h-4 w-4 text-violet-400" />} title="Recommendation Performance" />
        <div className="mt-2 space-y-2">
          {recPerf.map((r, i) => (
            <motion.button
              key={r.product.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onOpen(r.product)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-left transition hover:border-violet-400/30"
            >
              <span className="text-xl">{r.product.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{r.product.name}</p>
                <p className="truncate text-[11px] text-zinc-500">{r.reasons[0]}</p>
              </div>
              <div className="w-28">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
                    style={{ width: `${r.score}%` }}
                  />
                </div>
              </div>
              <span className="w-10 text-right text-sm font-bold text-violet-300">{r.score}%</span>
            </motion.button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: "violet" | "sky" | "emerald" | "amber";
}) {
  const tints = {
    violet: "from-violet-500/20 text-violet-300",
    sky: "from-sky-500/20 text-sky-300",
    emerald: "from-emerald-500/20 text-emerald-300",
    amber: "from-amber-500/20 text-amber-300",
  };
  return (
    <Card className="p-4">
      <div className={`mb-2 inline-grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br to-transparent ${tints[tint]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </Card>
  );
}

function ChartHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {icon}
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  );
}

function Empty() {
  return (
    <div className="grid h-[240px] place-items-center text-center text-sm text-zinc-500">
      Start browsing to populate analytics.
    </div>
  );
}
