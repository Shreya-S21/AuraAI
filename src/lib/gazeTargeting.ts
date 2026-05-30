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
  //   3) The projection is RESTRICTED to the actual product grid region on
  //      the page (computed from visible card DOM positions), NOT the full
  //      viewport. This prevents the gaze dot from landing on the header,
  //      tracker sidebar, or empty gaps.
  const gridBounds = getProductGridBounds();
  if (!gridBounds) {
    // No products visible on screen right now — project into center as a safe
    // default so the UI doesn't jitter.
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  // The user wants to look right and have the dot go right, without moving
  // their head. So we amplify the iris signal to cover the full viewport range.
  //
  // Comfortable eye movement (no head turn) gives iris values around ±0.3.
  // We multiply by ~3x so that reaches ±0.9 (near the edges).
  //
  // Head pose (yaw/pitch) is used as a secondary fine-tuner, not the primary
  // driver. This way the user can control the dot with their eyes alone.
  const gazeFlip = -sig.gazeX;
  const irisNorm = clamp(gazeFlip * 3, -1, 1);
  const yawNorm = -clamp(sig.yaw / 40, -1, 1);

  // 80% iris + 20% head pose
  const xFactor = clamp(irisNorm * 0.8 + yawNorm * 0.2, -1, 1);

  // Same for vertical: amplify iris, keep pitch as fine-tuner
  const irisYNorm = clamp(sig.gazeY * 3, -1, 1);
  const pitchNorm = -clamp(sig.pitch / 30, -1, 1);
  const yFactor = clamp(irisYNorm * 0.8 + pitchNorm * 0.2, -1, 1);

  // Map the [-1,1] factors into the actual product grid bounding box so the
  // dot and nearest-card matching only consider real product positions.
  const x = gridBounds.x + ((xFactor + 1) / 2) * gridBounds.width;
  const y = gridBounds.y + ((yFactor + 1) / 2) * gridBounds.height;
  return {
    x: clamp(x, gridBounds.x + 4, gridBounds.x + gridBounds.width - 4),
    y: clamp(y, gridBounds.y + 4, gridBounds.y + gridBounds.height - 4),
  };
}

// Compute the bounding box that encloses all visible product card elements.
// Returns null if nothing is visible on screen.
export function getProductsVisible(): boolean {
  return document.querySelectorAll<HTMLElement>("[data-aura-product-id]").length > 0;
}

interface Bounds { x: number; y: number; width: number; height: number }

function getProductGridBounds(): Bounds | null {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>("[data-aura-product-id]"),
  );
  if (nodes.length === 0) return null;

  let minX = Number.MAX_VALUE;
  let minY = Number.MAX_VALUE;
  let maxX = Number.MIN_VALUE;
  let maxY = Number.MIN_VALUE;
  let anyVisible = false;

  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (!isVisible(rect)) continue;
    anyVisible = true;
    minX = Math.min(minX, rect.left);
    minY = Math.min(minY, rect.top);
    maxX = Math.max(maxX, rect.right);
    maxY = Math.max(maxY, rect.bottom);
  }
  if (!anyVisible) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
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

    // Only consider cards whose bounding box actually contains the projected
    // gaze point. This prevents matching cards across empty gaps and makes the
    // popup only appear when the gaze truly lands on a product card.
    const inside =
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom;
    if (!inside) continue;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const distance = Math.hypot(point.x - cx, point.y - cy);
    const maxDistance = Math.hypot(rect.width / 2, rect.height / 2);
    const confidence = Math.max(40, Math.round(100 - (distance / maxDistance) * 60));
    const candidate: GazeTarget = { product, rect, distance, confidence, point };
    if (!best || candidate.distance < best.distance) best = candidate;
  }

  // If no card actually contains the gaze point, show nothing. Don't force a
  // match — this keeps the popup honest when the user is looking between cards.
  return best;
}

export function quickLookReview(target: GazeTarget): string {
  const { product, confidence } = target;
  if (confidence > 85) return `Your gaze is landing on ${product.name}.`;
  if (confidence > 60) return `You appear to be scanning ${product.name}.`;
  return `Gaze is over ${product.name}.`;
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
