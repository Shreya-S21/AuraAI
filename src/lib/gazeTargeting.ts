import { PRODUCTS, type Product } from "../data/products";
import type { FaceSignals } from "./faceMesh";

export interface GazeTarget {
  product: Product;
  rect: DOMRect;
  distance: number;
  confidence: number;
  point: { x: number; y: number };
}

const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

export function gazeToViewportPoint(sig: FaceSignals) {
  // This is a calibrated approximation: MediaPipe gives eye direction, then
  // we project it onto the current viewport. It is deterministic and uses the
  // actual screen positions of product cards, not a random product list.
  const x = window.innerWidth * clamp(0.5 + sig.gazeX * 0.42, 0.04, 0.96);
  const y = window.innerHeight * clamp(0.5 + sig.gazeY * 0.38, 0.08, 0.92);
  return { x, y };
}

export function findVisibleGazeTarget(sig: FaceSignals): GazeTarget | null {
  if (!sig.present) return null;
  const point = gazeToViewportPoint(sig);
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-aura-product-id]"),
  );

  let best: GazeTarget | null = null;
  for (const node of nodes) {
    const id = node.dataset.auraProductId;
    const product = id ? PRODUCT_BY_ID.get(id) : undefined;
    if (!product) continue;
    const rect = node.getBoundingClientRect();
    if (!isVisible(rect)) continue;

    const dx = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0;
    const dy = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0;
    const distance = Math.hypot(dx, dy);
    const inside = dx === 0 && dy === 0;
    const confidence = inside ? 98 : Math.max(0, Math.round(92 - distance / 5));
    const candidate: GazeTarget = { product, rect, distance, confidence, point };
    if (!best || candidate.distance < best.distance) best = candidate;
  }

  // Avoid confident-looking guesses when the projected point is far away from
  // every product card. This keeps the overlay honest.
  if (!best || best.distance > 260) return null;
  return best;
}

export function quickLookReview(target: GazeTarget): string {
  const { product, confidence } = target;
  if (confidence > 85) return `Your gaze is landing on ${product.name}.`;
  if (confidence > 55) return `You appear to be scanning near ${product.name}.`;
  return `Closest visible product is ${product.name}.`;
}

function isVisible(rect: DOMRect) {
  return (
    rect.width > 24 &&
    rect.height > 24 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
