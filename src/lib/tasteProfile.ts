// =============================================================
// Taste Profile Engine
// -------------------------------------------------------------
// Turns raw behavioral signals into a rich, human-readable portrait
// of the shopper: a named style persona, dominant aesthetics, price
// sensitivity, brand & color affinity, and category breakdown.
//
// Everything here is DERIVED from measured behavior (dwell, views,
// attention, likes) — no made-up numbers.
// =============================================================

import { PRODUCTS, Product } from "../data/products";
import {
  EngagementState,
  engagementScore,
  topTags,
  topCategory,
} from "./engagement";

export interface WeightedItem {
  label: string;
  weight: number;
  pct: number; // 0..100 share
}

export interface StylePersona {
  name: string;
  emoji: string;
  blurb: string;
}

export interface TasteProfile {
  hasData: boolean;
  completeness: number;        // 0..100 — how confident the profile is
  persona: StylePersona;
  headline: string;            // one-line summary
  aesthetics: WeightedItem[];  // top style tags
  categories: WeightedItem[];
  brands: WeightedItem[];
  colorMood: { label: string; emoji: string; pct: number };
  priceProfile: { label: string; avg: number; min: number; max: number };
  topProducts: { product: Product; score: number }[];
  stats: {
    productsExplored: number;
    saved: number;
    totalDwellSec: number;
    avgAttention: number;
  };
  insights: string[];          // bullet-point discoveries
}

// ---- helper: weight per product = engagement + like boost ----
function weightOf(state: EngagementState, p: Product): number {
  return engagementScore(state.signals[p.id]) + (state.liked[p.id] ? 25 : 0);
}

function toWeighted(map: Record<string, number>, limit = 6): WeightedItem[] {
  const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
  return Object.entries(map)
    .map(([label, weight]) => ({ label, weight, pct: Math.round((weight / total) * 100) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

// ---- color mood inferred from palette darkness of engaged items ----
function colorMood(state: EngagementState): { label: string; emoji: string; pct: number } {
  let darkW = 0, neutralW = 0, totalW = 0;
  for (const p of PRODUCTS) {
    const w = weightOf(state, p);
    if (w <= 0) continue;
    totalW += w;
    // estimate luminance of primary palette colour
    const hex = p.palette[0].replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (lum < 0.35) darkW += w;
    else if (lum < 0.7) neutralW += w;
  }
  if (totalW === 0) return { label: "Undefined", emoji: "🎨", pct: 0 };
  const darkPct = Math.round((darkW / totalW) * 100);
  const neutralPct = Math.round((neutralW / totalW) * 100);
  if (darkPct >= 50) return { label: "Dark & Monochrome", emoji: "🖤", pct: darkPct };
  if (neutralPct >= 45) return { label: "Neutral & Earthy", emoji: "🤎", pct: neutralPct };
  return { label: "Bright & Varied", emoji: "🌈", pct: 100 - darkPct };
}

// ---- persona selection from dominant aesthetic signals ----
function pickPersona(tags: string[], cat: string | null, mood: string): StylePersona {
  const has = (t: string) => tags.includes(t);
  if (has("techwear") || has("futuristic"))
    return { name: "The Techwear Futurist", emoji: "🛰️",
      blurb: "Drawn to function-forward, monochrome, future-facing design." };
  if (has("minimalist") || has("tailored") || cat === "Minimalist")
    return { name: "The Quiet Minimalist", emoji: "◻️",
      blurb: "You gravitate to clean lines, neutral tones, and considered tailoring." };
  if (has("streetwear") || has("oversized") || cat === "Streetwear")
    return { name: "The Street Curator", emoji: "🧩",
      blurb: "Oversized silhouettes and monochrome streetwear are your signature." };
  if (has("premium") || has("timeless"))
    return { name: "The Refined Collector", emoji: "💎",
      blurb: "You gravitate toward premium, timeless pieces over trends." };
  if (cat === "Activewear" || has("performance"))
    return { name: "The Performance Mover", emoji: "⚡",
      blurb: "Comfort, motion, and performance fabrics lead your choices." };
  if (mood.includes("Dark"))
    return { name: "The Monochrome Modernist", emoji: "🌑",
      blurb: "A dark, disciplined palette defines your aesthetic." };
  return { name: "The Eclectic Explorer", emoji: "🧭",
    blurb: "You're still defining your signature — broad, curious taste." };
}

export function buildTasteProfile(state: EngagementState): TasteProfile {
  const engaged = PRODUCTS.filter((p) => (state.signals[p.id]?.views ?? 0) > 0);
  const saved = PRODUCTS.filter((p) => state.liked[p.id]);

  const tagMap: Record<string, number> = {};
  const catMap: Record<string, number> = {};
  const brandMap: Record<string, number> = {};
  let priceWeighted = 0, priceW = 0, attSum = 0, attN = 0, dwellMs = 0;
  const prices: number[] = [];

  for (const p of engaged) {
    const w = Math.max(weightOf(state, p), 1);
    for (const t of p.tags) tagMap[t] = (tagMap[t] || 0) + w;
    catMap[p.category] = (catMap[p.category] || 0) + w;
    brandMap[p.brand] = (brandMap[p.brand] || 0) + w;
    priceWeighted += p.price * w;
    priceW += w;
    prices.push(p.price);
    const sig = state.signals[p.id];
    if (sig) {
      dwellMs += sig.dwellMs;
      if (sig.attention > 0) { attSum += sig.attention; attN++; }
    }
  }

  const aesthetics = toWeighted(tagMap, 6);
  const categories = toWeighted(catMap, 6);
  const brands = toWeighted(brandMap, 4);
  const mood = colorMood(state);
  const tags = topTags(state, 4).map((t) => t.tag);
  const cat = topCategory(state);
  const persona = pickPersona(tags, cat, mood.label);

  const avgPrice = priceW ? Math.round(priceWeighted / priceW) : 0;
  const priceLabel =
    avgPrice === 0 ? "Undefined"
      : avgPrice < 90 ? "Value-conscious"
      : avgPrice < 200 ? "Mid-range"
      : avgPrice < 320 ? "Premium-leaning"
      : "Luxury-oriented";

  const topProducts = engaged
    .map((p) => ({ product: p, score: engagementScore(state.signals[p.id]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const avgAttention = attN ? Math.round((attSum / attN) * 100) : 0;

  // confidence grows with breadth of exploration + explicit saves + attention data
  const completeness = Math.min(100, Math.round(
    engaged.length * 9 + saved.length * 6 + (attN > 0 ? 18 : 0)));

  // ---- generated insight bullets ----
  const insights: string[] = [];
  if (aesthetics[0]) insights.push(
    `Your strongest aesthetic pull is "${aesthetics[0].label}" (${aesthetics[0].pct}% of attention).`);
  if (categories[0]) insights.push(
    `${categories[0].label} dominates your browsing at ${categories[0].pct}%.`);
  if (brands[0] && brands.length > 1) insights.push(
    `You lean toward ${brands[0].label} over other brands.`);
  if (avgPrice) insights.push(
    `Your engaged price point averages $${avgPrice} — a ${priceLabel.toLowerCase()} profile.`);
  if (mood.pct) insights.push(
    `${mood.pct}% of what you engage with sits in a ${mood.label.toLowerCase()} palette.`);
  if (avgAttention) insights.push(
    `When the camera is on, your sustained attention averages ${avgAttention}%.`);
  if (insights.length === 0) insights.push(
    "Browse a few products to unlock your personalized taste profile.");

  const headline = engaged.length
    ? `${persona.name} with ${priceLabel.toLowerCase()} tastes`
    : "Your taste profile is waiting to be discovered";

  return {
    hasData: engaged.length > 0,
    completeness,
    persona,
    headline,
    aesthetics,
    categories,
    brands,
    colorMood: mood,
    priceProfile: {
      label: priceLabel,
      avg: avgPrice,
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
    topProducts,
    stats: {
      productsExplored: engaged.length,
      saved: saved.length,
      totalDwellSec: Math.round(dwellMs / 1000),
      avgAttention,
    },
    insights,
  };
}
