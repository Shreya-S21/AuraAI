// =============================================================
// Behavioral Engagement Engine (client-side mirror)
// -------------------------------------------------------------
// This mirrors the FastAPI "analytics service" + "AI service".
// It tracks per-product behavioral signals (NOT emotion):
//   - viewing duration
//   - revisit frequency
//   - attention proxy (from webcam head-pose / presence)
//   - derived engagement & affinity scores
// and builds an explainable recommendation profile.
// =============================================================

import { PRODUCTS, Product, cosineSimilarity } from "../data/products";

export interface ProductSignal {
  productId: string;
  dwellMs: number; // total time the detail/card was focused
  views: number; // revisit frequency
  attention: number; // 0..1 averaged attention proxy
}

export interface EngagementState {
  signals: Record<string, ProductSignal>;
  liked: Record<string, boolean>;
}

export const EMPTY_STATE: EngagementState = { signals: {}, liked: {} };

// Engagement score per product: weighted blend of dwell, revisits, attention.
export function engagementScore(s?: ProductSignal): number {
  if (!s) return 0;
  const dwell = Math.min(s.dwellMs / 20000, 1); // saturate at ~20s
  const revisit = Math.min(s.views / 5, 1);
  const att = s.attention;
  const raw = 0.45 * dwell + 0.2 * revisit + 0.35 * att;
  return Math.round(raw * 100);
}

// Affinity blends engagement with explicit signals (likes).
export function affinityScore(state: EngagementState, productId: string): number {
  const eng = engagementScore(state.signals[productId]);
  const likeBoost = state.liked[productId] ? 18 : 0;
  return Math.min(100, eng + likeBoost);
}

// Builds a weighted "taste vector" from all engaged products.
export function buildTasteVector(state: EngagementState): number[] | null {
  const entries = Object.values(state.signals);
  if (entries.length === 0) return null;
  const dim = PRODUCTS[0].embedding.length;
  const acc = new Array(dim).fill(0);
  let totalW = 0;
  for (const sig of entries) {
    const p = PRODUCTS.find((x) => x.id === sig.productId);
    if (!p) continue;
    const w = engagementScore(sig) + (state.liked[sig.productId] ? 25 : 0);
    if (w <= 0) continue;
    for (let i = 0; i < dim; i++) acc[i] += p.embedding[i] * w;
    totalW += w;
  }
  if (totalW === 0) return null;
  return acc.map((v) => v / totalW);
}

export interface Recommendation {
  product: Product;
  score: number; // 0..100 match
  reasons: string[];
}

// Tag frequency weighted by engagement — drives explanations.
export function topTags(state: EngagementState, n = 3): { tag: string; weight: number }[] {
  const map: Record<string, number> = {};
  for (const sig of Object.values(state.signals)) {
    const p = PRODUCTS.find((x) => x.id === sig.productId);
    if (!p) continue;
    const w = engagementScore(sig) + (state.liked[sig.productId] ? 25 : 0);
    for (const t of p.tags) map[t] = (map[t] || 0) + w;
  }
  return Object.entries(map)
    .map(([tag, weight]) => ({ tag, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n);
}

export function topCategory(state: EngagementState): string | null {
  const map: Record<string, number> = {};
  for (const sig of Object.values(state.signals)) {
    const p = PRODUCTS.find((x) => x.id === sig.productId);
    if (!p) continue;
    map[p.category] = (map[p.category] || 0) + engagementScore(sig);
  }
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}

// Core recommendation: FAISS-style nearest neighbours to taste vector,
// then layer explainable reasons.
export function recommend(state: EngagementState, limit = 4): Recommendation[] {
  const taste = buildTasteVector(state);
  const tags = topTags(state, 3).map((t) => t.tag);
  const cat = topCategory(state);

  const engagedIds = new Set(Object.keys(state.signals));

  const scored = PRODUCTS.map((p) => {
    let sim = 0.5;
    if (taste) sim = cosineSimilarity(taste, p.embedding);
    // de-emphasize already heavily-viewed items (encourage discovery)
    const seenPenalty = engagedIds.has(p.id) ? 0.85 : 1;
    const score = Math.round(Math.max(0, Math.min(1, sim)) * 100 * seenPenalty);

    const reasons: string[] = [];
    const sharedTags = p.tags.filter((t) => tags.includes(t));
    if (sharedTags.length) {
      reasons.push(
        `Matches your engagement with ${sharedTags.slice(0, 2).join(" & ")} pieces`,
      );
    }
    if (cat && p.category === cat) {
      reasons.push(`You spent the most time browsing ${cat}`);
    }
    if (taste && sim > 0.9) {
      reasons.push("High visual & semantic similarity (CLIP embedding)");
    }
    if (reasons.length === 0) {
      reasons.push("Recommended to broaden your style profile");
    }
    return { product: p, score, reasons };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Human-readable session summary lines for the Explainable AI panel.
export function explainProfile(state: EngagementState): string[] {
  const lines: string[] = [];
  const tags = topTags(state, 2);
  const cat = topCategory(state);
  if (tags.length) {
    lines.push(
      `You spent more time viewing ${tags.map((t) => t.tag).join(" and ")} products.`,
    );
  }
  if (cat) {
    lines.push(`Your strongest category affinity right now is ${cat}.`);
  }
  const liked = Object.keys(state.liked).filter((k) => state.liked[k]).length;
  if (liked) lines.push(`You explicitly saved ${liked} item${liked > 1 ? "s" : ""} to your style memory.`);
  if (lines.length === 0) {
    lines.push("Start browsing — AuraAI will learn your aesthetic in real time.");
  }
  return lines;
}
