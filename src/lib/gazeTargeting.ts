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
  // Calibration:
  //   1) The video element is mirrored with CSS (-scale-x-100) so the user
  //      sees themselves naturally, but MediaPipe gaze values are from the
  //      *raw* (unmirrored) camera frame. We negate gazeX so left/right
  //      matches what the user sees on screen.
  //   2) Iris gaze alone only covers a narrow angular range. We blend in head
  //      yaw to let the projection reach the edges of the viewport when the
  //      user turns their head.
  //   3) Output is clamped to stay inside the visible page.
  const gazeFlip = -sig.gazeX;
  const yawNorm = clamp(sig.yaw / 35, -1, 1);

  // 55% iris + 45% head pose. Iris gives precision, head gives range.
  const xFactor = clamp(gazeFlip * 0.55 + yawNorm * 0.45, -1, 1);
  const yFactor = clamp(
    sig.gazeY * 0.7 + clamp(sig.pitch / 25, -1, 1) * 0.3,
    -1,
    1,
  );

  // Spread over ~90% of the viewport so the dot actually crosses product cards.
  const x = window.innerWidth * (0.5 + xFactor * 0.45);
  const y = window.innerHeight * (0.5 + yFactor * 0.4);
  return {
    x: clamp(x, 16, window.innerWidth - 16),
    y: clamp(y, 16, window.innerHeight - 16),
  };
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
