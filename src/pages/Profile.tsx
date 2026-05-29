import { motion } from "framer-motion";
import { Heart, History } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { PRODUCTS, Product } from "../data/products";
import { engagementScore } from "../lib/engagement";
import { Card } from "../components/ui";
import { ProductImage } from "../components/ProductImage";
import { Recommendations } from "../components/Recommendations";
import { TasteProfile } from "../components/TasteProfile";

export function Profile({ onOpen }: { onOpen: (p: Product) => void }) {
  const { state } = useSession();
  const liked = PRODUCTS.filter((p) => state.liked[p.id]);

  const history = PRODUCTS.map((p) => ({
    product: p,
    score: engagementScore(state.signals[p.id]),
    views: state.signals[p.id]?.views ?? 0,
    dwell: state.signals[p.id]?.dwellMs ?? 0,
  }))
    .filter((x) => x.views > 0)
    .sort((a, b) => b.dwell - a.dwell);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Your Taste Profile</h1>
        <p className="text-sm text-zinc-500">
          A living portrait of your aesthetic, derived from how you actually browse.
        </p>
      </div>

      {/* The rich taste profile */}
      <TasteProfile />

      {/* Saved items */}
      <Card className="mt-8 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-400" />
          <h3 className="text-sm font-semibold text-white">Saved to Memory</h3>
        </div>
        {liked.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {liked.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpen(p)}
                className="group overflow-hidden rounded-xl border border-white/5 text-left transition hover:border-violet-400/30"
              >
                <ProductImage product={p} className="h-24 w-full" />
                <div className="p-2">
                  <p className="truncate text-xs font-medium text-white">{p.name}</p>
                  <p className="text-[11px] text-zinc-500">${p.price}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">
            Tap the ♥ on products to save them here.
          </div>
        )}
      </Card>

      {/* History */}
      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Engagement History</h3>
        </div>
        {history.length ? (
          <div className="space-y-2">
            {history.slice(0, 12).map((h, i) => (
              <motion.button
                key={h.product.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onOpen(h.product)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-left transition hover:border-white/15"
              >
                <span className="text-xl">{h.product.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{h.product.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    {Math.round(h.dwell / 1000)}s dwell · {h.views} view{h.views > 1 ? "s" : ""}
                  </p>
                </div>
                <span className="text-sm font-bold text-violet-300">{h.score}%</span>
              </motion.button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No browsing history yet.</p>
        )}
      </Card>

      <div className="mt-8">
        <Recommendations onOpen={onOpen} limit={4} title="Curated for your taste profile" />
      </div>
    </div>
  );
}
