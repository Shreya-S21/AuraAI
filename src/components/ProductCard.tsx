import { motion } from "framer-motion";
import { Heart, Eye } from "lucide-react";
import { Product } from "../data/products";
import { ProductImage } from "./ProductImage";
import { Badge } from "./ui";
import { useSession } from "../context/SessionContext";
import { engagementScore } from "../lib/engagement";

// Card tracks "dwell" via hover (proxy for attention on a grid item)
// and records views/dwell into the session engagement engine.
export function ProductCard({
  product,
  onOpen,
  index = 0,
}: {
  product: Product;
  onOpen: (p: Product) => void;
  index?: number;
}) {
  const { state, recordDwell, toggleLike } = useSession();
  const liked = !!state.liked[product.id];
  const eng = engagementScore(state.signals[product.id]);

  let hoverStart = 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ y: -6 }}
      onMouseEnter={() => (hoverStart = Date.now())}
      onMouseLeave={() => {
        if (hoverStart) recordDwell(product.id, Date.now() - hoverStart);
      }}
      className="group cursor-pointer"
      onClick={() => onOpen(product)}
    >
      <div className="aura-glass overflow-hidden rounded-2xl transition-all duration-300 group-hover:border-violet-400/30 group-hover:shadow-2xl group-hover:shadow-violet-500/10">
        <div className="relative">
          <ProductImage product={product} className="h-52 w-full" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(product.id);
            }}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 backdrop-blur transition hover:bg-black/60"
          >
            <Heart
              className={`h-4 w-4 transition ${liked ? "fill-rose-500 text-rose-500" : "text-white"}`}
            />
          </button>
          {eng > 0 && (
            <div className="absolute left-3 top-3">
              <Badge className="border-violet-400/30 bg-violet-500/15 text-violet-200">
                <Eye className="h-3 w-3" /> {eng}% engaged
              </Badge>
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-zinc-500">
              {product.brand}
            </span>
            <span className="text-xs text-amber-300">★ {product.rating}</span>
          </div>
          <h3 className="font-semibold leading-tight text-white">{product.name}</h3>
          <div className="flex items-center justify-between pt-1">
            <span className="text-lg font-bold text-white">${product.price}</span>
            <Badge>{product.category}</Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
