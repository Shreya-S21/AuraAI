import { Product } from "../data/products";

// Deterministic gradient "product image" — no external assets required,
// keeps the demo fast and self-contained while looking premium.
export function ProductImage({
  product,
  className = "",
  big = false,
}: {
  product: Product;
  className?: string;
  big?: boolean;
}) {
  const [a, b, c] = product.palette;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 25%, ${a}, ${b} 55%, ${c})`,
      }}
    >
      <div className="absolute inset-0 aura-grid-bg opacity-30" />
      <div
        className="absolute -right-8 -top-10 h-32 w-32 rounded-full blur-2xl opacity-40"
        style={{ background: a }}
      />
      <span
        className={`relative drop-shadow-lg ${big ? "text-7xl" : "text-5xl"}`}
        style={{ filter: "grayscale(0.1)" }}
      >
        {product.emoji}
      </span>
    </div>
  );
}
