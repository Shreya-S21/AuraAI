import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, ShoppingBag, Clock, Eye, Activity } from "lucide-react";
import { Product, PRODUCTS, cosineSimilarity } from "../data/products";
import { ProductImage } from "./ProductImage";
import { Badge, Button } from "./ui";
import { useSession } from "../context/SessionContext";
import { useDwell } from "../hooks/useDwell";
import { engagementScore, affinityScore } from "../lib/engagement";

// Detail drawer: tracks dwell, shows live engagement, and surfaces
// visually-similar items via CLIP-embedding nearest neighbours.
export function ProductDetail({
  product,
  onClose,
  onOpen,
}: {
  product: Product | null;
  onClose: () => void;
  onOpen: (p: Product) => void;
}) {
  return (
    <AnimatePresence>
      {product && <Inner product={product} onClose={onClose} onOpen={onOpen} />}
    </AnimatePresence>
  );
}

function Inner({
  product,
  onClose,
  onOpen,
}: {
  product: Product;
  onClose: () => void;
  onOpen: (p: Product) => void;
}) {
  useDwell(product.id);
  const { state, toggleLike } = useSession();
  const liked = !!state.liked[product.id];
  const sig = state.signals[product.id];
  const eng = engagementScore(sig);
  const aff = affinityScore(state, product.id);
  const dwellSec = sig ? Math.round(sig.dwellMs / 1000) : 0;

  const similar = PRODUCTS.filter((p) => p.id !== product.id)
    .map((p) => ({ p, s: cosineSimilarity(product.embedding, p.embedding) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 60 }}
        transition={{ type: "spring", damping: 26, stiffness: 240 }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0b0b12] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0b0b12]/90 px-5 py-3 backdrop-blur">
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Product Detail
          </span>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <ProductImage product={product} className="h-60 w-full rounded-2xl" big />

          <div className="mt-4 flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-zinc-500">
                {product.brand}
              </p>
              <h2 className="text-xl font-bold text-white">{product.name}</h2>
            </div>
            <span className="text-xl font-bold text-white">${product.price}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{product.category}</Badge>
            <span className="text-xs text-amber-300">★ {product.rating}</span>
            {product.tags.map((t) => (
              <Badge key={t} className="capitalize">
                {t}
              </Badge>
            ))}
          </div>

          {/* Live engagement on this product */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Metric icon={<Clock className="h-3.5 w-3.5" />} label="Dwell" value={`${dwellSec}s`} />
            <Metric icon={<Eye className="h-3.5 w-3.5" />} label="Engagement" value={`${eng}%`} />
            <Metric icon={<Activity className="h-3.5 w-3.5" />} label="Affinity" value={`${aff}%`} />
          </div>

          <div className="mt-5 flex gap-2">
            <Button className="flex-1">
              <ShoppingBag className="h-4 w-4" /> Add to Bag
            </Button>
            <Button
              variant="outline"
              onClick={() => toggleLike(product.id)}
              className="px-3"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
            </Button>
          </div>

          {/* Visually similar (CLIP) */}
          <div className="mt-7">
            <h3 className="mb-3 text-sm font-semibold text-white">
              Visually similar <span className="text-zinc-500">· CLIP embedding</span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {similar.map(({ p, s }) => (
                <button
                  key={p.id}
                  onClick={() => onOpen(p)}
                  className="group overflow-hidden rounded-xl border border-white/5 text-left transition hover:border-violet-400/30"
                >
                  <ProductImage product={p} className="h-20 w-full" />
                  <div className="p-1.5">
                    <p className="truncate text-[11px] font-medium text-white">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-violet-300">
                      {Math.round(s * 100)}% similar
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 text-center">
      <span className="flex items-center justify-center gap-1 text-[10px] uppercase text-zinc-500">
        {icon}
        {label}
      </span>
      <p className="mt-1 text-base font-bold text-white">{value}</p>
    </div>
  );
}
