import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, Zap, Cpu } from "lucide-react";
import { PRODUCTS, CATEGORIES, Product, Category } from "../data/products";
import { ProductCard } from "../components/ProductCard";
import { EngagementTracker } from "../components/EngagementTracker";
import { Recommendations } from "../components/Recommendations";
import { ExplainPanel } from "../components/ExplainPanel";
import { Badge } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export function Browse({ onOpen }: { onOpen: (p: Product) => void }) {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "All">("All");

  const filtered = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchCat = cat === "All" || p.category === cat;
      const q = query.toLowerCase().trim();
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.tags.some((t) => t.includes(q));
      return matchCat && matchQ;
    });
  }, [query, cat]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* Hero */}
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-white/5 p-8 md:p-12">
        <div className="absolute inset-0 aura-grid-bg opacity-40" />
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet-600/20 blur-3xl aura-glow" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl aura-glow" />
        <div className="relative max-w-2xl">
          <Badge className="mb-4 border-violet-400/30 bg-violet-500/10 text-violet-200">
            <Sparkles className="h-3 w-3" /> Welcome back, {firstName} · CLIP + FAISS · Real-time
          </Badge>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl"
          >
            Shopping that{" "}
            <span className="aura-text-gradient">understands</span> how you browse.
          </motion.h1>
          <p className="mt-4 max-w-xl text-sm text-zinc-400 md:text-base">
            AuraAI analyzes your engagement and attention as you explore — then
            surfaces visually and semantically similar products using vector
            search. Privacy-first behavioral intelligence, not emotion detection.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-violet-400" /> Live engagement scoring
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-sky-400" /> Explainable recommendations
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          {/* Search + categories */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products, brands, or aesthetics…"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-400/40 focus:bg-white/[0.05]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["All", ...CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                    cat === c
                      ? "border-violet-400/40 bg-violet-500/20 text-white"
                      : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <Recommendations onOpen={onOpen} />

          {/* Grid */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">
                {cat === "All" ? "All Products" : cat}
              </h2>
              <span className="text-xs text-zinc-500">{filtered.length} items</span>
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-zinc-500">
                No products match your search.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {filtered.map((p, i) => (
                  <ProductCard key={p.id} product={p} onOpen={onOpen} index={i} />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <EngagementTracker />
          <ExplainPanel />
        </aside>
      </div>
    </div>
  );
}
