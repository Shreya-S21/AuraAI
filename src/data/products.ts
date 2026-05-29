// =============================================================
// Product Catalog — PROCEDURALLY GENERATED, attribute-derived embeddings
// -------------------------------------------------------------
// Instead of hand-writing vectors, every product's embedding is DERIVED
// from real, structured attributes along interpretable style axes:
//
//   [ dark, neutral, bright, formal, casual, techwear, minimal,
//     streetwear, premium, utility, warmth(seasonal), priceTier ]
//
// Because the vector is a deterministic function of attributes, cosine
// similarity is genuinely meaningful: two "dark minimalist premium"
// items WILL be near each other in the space. This is the honest
// stand-in for learned CLIP embeddings used on the backend.
// =============================================================

export type Category =
  | "Streetwear"
  | "Minimalist"
  | "Footwear"
  | "Accessories"
  | "Outerwear"
  | "Tech"
  | "Denim"
  | "Activewear";

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  rating: number;
  tags: string[];
  palette: [string, string, string];
  embedding: number[];
  emoji: string;
}

// ---- Style axes (the "feature space") ----
const AXES = [
  "dark", "neutral", "bright", "formal", "casual", "techwear",
  "minimal", "streetwear", "premium", "utility", "seasonal", "priceTier",
] as const;
type Axis = (typeof AXES)[number];

// Each "archetype" defines attribute weights. Products inherit + vary these.
interface Archetype {
  category: Category;
  brand: string;
  emoji: string;
  palette: [string, string, string];
  baseTags: string[];
  weights: Partial<Record<Axis, number>>;
  priceRange: [number, number];
  names: string[];
}

const ARCHETYPES: Archetype[] = [
  {
    category: "Streetwear", brand: "VOID Studios", emoji: "🧥",
    palette: ["#1f2937", "#111827", "#0b0f19"],
    baseTags: ["monochrome", "streetwear", "oversized"],
    weights: { dark: 0.9, casual: 0.8, streetwear: 1, utility: 0.4, minimal: 0.3 },
    priceRange: [55, 150],
    names: ["Null Hoodie", "Boxy Heavyweight Tee", "Cargo Joggers", "Layered Longsleeve",
            "Distressed Crew", "Graphic Oversized Tee", "Utility Overshirt", "Drop-Shoulder Knit"],
  },
  {
    category: "Minimalist", brand: "Atelier Nord", emoji: "👔",
    palette: ["#e7e5e4", "#d6d3d1", "#a8a29e"],
    baseTags: ["minimalist", "neutral", "tailored"],
    weights: { neutral: 1, formal: 0.7, minimal: 1, premium: 0.7, dark: 0.1 },
    priceRange: [90, 280],
    names: ["Linen Structured Blazer", "Pleated Wide Trousers", "Merino Crewneck",
            "Silk-Blend Shirt", "Tailored Vest", "Relaxed Chinos", "Cashmere Polo", "Mock-Neck Sweater"],
  },
  {
    category: "Outerwear", brand: "Atelier Nord", emoji: "🧥",
    palette: ["#f5f5f4", "#e7e5e4", "#c7c3bf"],
    baseTags: ["minimalist", "premium", "tailored", "seasonal"],
    weights: { neutral: 0.8, formal: 0.6, minimal: 0.8, premium: 0.9, seasonal: 0.9 },
    priceRange: [220, 480],
    names: ["Sculpted Wool Coat", "Belted Trench", "Double-Breasted Overcoat", "Wrap Cardigan-Coat"],
  },
  {
    category: "Outerwear", brand: "Kinetic", emoji: "🧥",
    palette: ["#020617", "#0f172a", "#1e293b"],
    baseTags: ["techwear", "monochrome", "utility", "futuristic"],
    weights: { dark: 0.9, techwear: 1, utility: 0.9, casual: 0.5, seasonal: 0.7 },
    priceRange: [160, 360],
    names: ["Technical Shell Jacket", "Trail Tech Vest", "Sealed-Seam Parka", "Modular Field Jacket"],
  },
  {
    category: "Footwear", brand: "Kinetic", emoji: "👟",
    palette: ["#0f172a", "#1e293b", "#334155"],
    baseTags: ["techwear", "performance", "monochrome"],
    weights: { dark: 0.7, techwear: 0.8, casual: 0.6, utility: 0.4, premium: 0.5 },
    priceRange: [110, 240],
    names: ["Runner 0X", "Trail GTX Low", "Knit Speed Trainer", "Carbon Racer", "Court Classic Mono"],
  },
  {
    category: "Footwear", brand: "Atelier Nord", emoji: "👞",
    palette: ["#3f3f46", "#27272a", "#18181b"],
    baseTags: ["minimalist", "premium", "leather"],
    weights: { neutral: 0.6, formal: 0.8, minimal: 0.7, premium: 0.9 },
    priceRange: [180, 340],
    names: ["Leather Derby", "Minimal Sneaker", "Chelsea Boot", "Penny Loafer"],
  },
  {
    category: "Denim", brand: "VOID Studios", emoji: "👖",
    palette: ["#1e3a8a", "#1e40af", "#172554"],
    baseTags: ["denim", "casual", "streetwear"],
    weights: { casual: 0.9, streetwear: 0.7, utility: 0.5, dark: 0.5 },
    priceRange: [70, 170],
    names: ["Raw Selvedge Jeans", "Baggy Carpenter Denim", "Tapered Black Denim",
            "Denim Trucker Jacket", "Washed Wide-Leg Jeans"],
  },
  {
    category: "Accessories", brand: "Meridian", emoji: "⌚",
    palette: ["#e2e8f0", "#cbd5e1", "#94a3b8"],
    baseTags: ["minimalist", "premium", "timeless"],
    weights: { neutral: 0.7, minimal: 0.9, premium: 0.9, formal: 0.5 },
    priceRange: [120, 420],
    names: ["Quartz Field Watch", "Geometric Tote", "Leather Card Holder",
            "Brushed Steel Bracelet", "Minimal Sunglasses", "Wool Scarf"],
  },
  {
    category: "Tech", brand: "Meridian", emoji: "🎧",
    palette: ["#0b0f19", "#111827", "#1f2937"],
    baseTags: ["techwear", "futuristic", "premium"],
    weights: { dark: 0.7, techwear: 0.9, premium: 0.8, minimal: 0.6 },
    priceRange: [90, 300],
    names: ["Carbon Wireless Buds", "Matte Smartwatch", "Compact Power Bank",
            "Over-Ear Studio Set", "Mechanical Keypad"],
  },
  {
    category: "Activewear", brand: "Kinetic", emoji: "🩳",
    palette: ["#064e3b", "#065f46", "#047857"],
    baseTags: ["activewear", "performance", "casual"],
    weights: { casual: 0.8, techwear: 0.5, utility: 0.4, bright: 0.3 },
    priceRange: [45, 140],
    names: ["Seamless Training Top", "2-in-1 Run Shorts", "Compression Tee",
            "Lightweight Track Pants", "Mesh Performance Hoodie"],
  },
];

// Deterministic pseudo-random so the catalog is stable across reloads.
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function buildEmbedding(weights: Partial<Record<Axis, number>>, jitter: () => number, priceTier: number) {
  const vec = AXES.map((axis) => {
    if (axis === "priceTier") return priceTier;
    const base = weights[axis] ?? 0.05;
    // small deterministic jitter so siblings aren't identical
    return Math.max(0, base + (jitter() - 0.5) * 0.18);
  });
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => +(v / norm).toFixed(4));
}

const TAG_POOL = ["monochrome", "oversized", "neutral", "premium", "utility",
  "futuristic", "tailored", "cozy", "everyday", "performance", "drapey", "timeless"];

function generateCatalog(): Product[] {
  const out: Product[] = [];
  let id = 1;
  ARCHETYPES.forEach((arch, ai) => {
    arch.names.forEach((name, ni) => {
      const rand = rng((ai + 1) * 1000 + ni * 37);
      const [lo, hi] = arch.priceRange;
      const price = Math.round((lo + rand() * (hi - lo)) / 5) * 5;
      const priceTier = +((price - 40) / 460).toFixed(3); // ~0..1
      const rating = +(4.2 + rand() * 0.8).toFixed(1);
      const extraTag = TAG_POOL[Math.floor(rand() * TAG_POOL.length)];
      const tags = Array.from(new Set([...arch.baseTags, extraTag]));
      out.push({
        id: `p${id++}`,
        name: name,
        brand: arch.brand,
        category: arch.category,
        price,
        rating,
        tags,
        palette: arch.palette,
        emoji: arch.emoji,
        embedding: buildEmbedding(arch.weights, rand, priceTier),
      });
    });
  });
  return out;
}

export const PRODUCTS: Product[] = generateCatalog();

export const CATEGORIES: Category[] = [
  "Streetwear", "Minimalist", "Outerwear", "Footwear",
  "Denim", "Accessories", "Tech", "Activewear",
];

// ---- Vector math: cosine similarity (mirrors FAISS inner-product index) ----
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
