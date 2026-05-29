import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { recommend } from "../lib/engagement";
import { Product } from "../data/products";
import { ProductImage } from "./ProductImage";
import { Badge } from "./ui";

// AI recommendation carousel — re-computes via FAISS-style vector
// search whenever engagement signals change, with explainable reasons.
export function Recommendations({
  onOpen,
  limit = 4,
  title = "Recommended for You",
}: {
  onOpen: (p: Product) => void;
  limit?: number;
  title?: string;
}) {
  const { state } = useSession();
  const recs = recommend(state, limit);

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-white">{title}</h2>
          <p className="text-xs text-zinc-500">
            Generated from your live behavioral profile · CLIP + FAISS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {recs.map((r) => (
            <motion.button
              key={r.product.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ y: -4 }}
              onClick={() => onOpen(r.product)}
              className="group aura-glass overflow-hidden rounded-2xl text-left"
            >
              <div className="relative">
                <ProductImage product={r.product} className="h-32 w-full" />
                <div className="absolute right-2 top-2">
                  <Badge className="border-violet-400/40 bg-violet-500/20 text-violet-100">
                    {r.score}% match
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5 p-3">
                <h3 className="truncate text-sm font-semibold text-white">
                  {r.product.name}
                </h3>
                <p className="line-clamp-2 text-[11px] leading-snug text-violet-300/80">
                  {r.reasons[0]}
                </p>
                <span className="flex items-center gap-1 pt-1 text-[11px] font-medium text-zinc-400 group-hover:text-white">
                  View <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
