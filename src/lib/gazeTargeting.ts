import { PRODUCTS, type Product } from "../data/products";
import type { FaceSignals } from "./faceMesh";
import { loadCalibration, calibrationBounds, calibratedFactor } from "./calibration";

export interface GazeTarget {
  product: Product;
  rect: DOMRect;
  distance: number;
  confidence: number;
  point: { x: number; y: number };
}

const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

// =====================================================================
// CALIBRATION CONSTANTS — change these to dial in feel without rewriting.
// =====================================================================
const TUNE = {
  // Sign per axis. Flip these if a direction is reversed for you.
  signX: -1,        // -1 because the webcam preview is CSS-mirrored
  signY: +1,
  // Iris values below this magnitude are zeroed (treated as center gaze).
  // Kept small so comfortable eye motion is preserved.
  deadZone: 0.04,
  // How aggressively to map iris values to screen space. Higher = reaches
  // edges with smaller eye movement. Increase these two if you still have
  // to look at the computer's edges to reach side products.
  gainX: 4.2,
  gainY: 3.8,
  // EMA smoothing. 0..1 — higher = smoother but laggier.
  smooth: 0.82,
  // Sticky target: once a product is selected, it stays selected unless
  // the new candidate is meaningfully closer (in pixels). Stops flicker.
  stickinessPx: 90,
  // Maximum projected distance from a product card before we hide the popup.
  maxLockPx: 220,
  // How many consecutive frames a new candidate must win before we switch.
  switchFrames: 5,
};

// ---------- Product grid bounding box ----------
function productGridBounds(): { left: number; top: number; width: number; height: number } | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-aura-product-id]"));
  let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
  let found = false;
  for (const node of nodes) {
    const r = node.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) continue;
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    if (r.right < 0 || r.left > window.innerWidth) continue;
    found = true;
    if (r.left < minL) minL = r.left;
    if (r.top < minT) minT = r.top;
    if (r.right > maxR) maxR = r.right;
    if (r.bottom > maxB) maxB = r.bottom;
  }
  if (!found) return null;
  return { left: minL, top: minT, width: maxR - minL, height: maxB - minT };
}

// ---------- Signal smoothing ----------
let smX = 0;
let smY = 0;

function deadband(v: number, dz: number) {
  // Simple threshold — zero out tiny values but don't rescale. Rescaling
  // shrinks the usable iris range, which is exactly why the dot couldn't
  // reach the edges.
  if (Math.abs(v) < dz) return 0;
  return v;
}

function shape(v: number, gain: number) {
  // Tanh keeps the response smooth and bounded. Moderate gain so we don't
  // snap to the corner from any small eye motion.
  return Math.tanh(v * gain);
}

// ---------- Gaze projection ----------
export function gazeToViewportPoint(sig: FaceSignals) {
  // Apply per-axis sign (webcam is CSS-mirrored, so negate X).
  const rawX = TUNE.signX * sig.gazeX;
  const rawY = TUNE.signY * sig.gazeY;

  // EMA smoothing to reduce jitter.
  smX = smX * TUNE.smooth + rawX * (1 - TUNE.smooth);
  smY = smY * TUNE.smooth + rawY * (1 - TUNE.smooth);

  let xFactor: number;
  let yFactor: number;

  const cal = loadCalibration();
  if (cal) {
    // Calibrated path: use per-user iris bounds learned from 9-point setup.
    const bounds = calibrationBounds(cal);
    xFactor = calibratedFactor(smX, bounds.xMin, bounds.xMax);
    yFactor = calibratedFactor(smY, bounds.yMin, bounds.yMax);
  } else {
    // Fallback: heuristic mapping with dead zone + moderate amplification.
    xFactor = shape(deadband(smX, TUNE.deadZone), TUNE.gainX);
    yFactor = shape(deadband(smY, TUNE.deadZone), TUNE.gainY);
  }

  // Project into the product-grid bounding box (not the full viewport).
  const grid = productGridBounds();
  if (grid) {
    const x = grid.left + grid.width * (0.5 + xFactor * 0.5);
    const y = grid.top + grid.height * (0.5 + yFactor * 0.5);
    return {
      x: clamp(x, grid.left + 8, grid.left + grid.width - 8),
      y: clamp(y, grid.top + 8, grid.top + grid.height - 8),
    };
  }
  const x = window.innerWidth * (0.5 + xFactor * 0.48);
  const y = window.innerHeight * (0.5 + yFactor * 0.45);
  return {
    x: clamp(x, 16, window.innerWidth - 16),
    y: clamp(y, 16, window.innerHeight - 16),
  };
}

export function resetGazeSmoothing() {
  smX = 0;
  smY = 0;
  lockedId = null;
  lockedDist = Infinity;
  challenger = null;
  challengerFrames = 0;
}

// ---------- Target lock (anti-flicker) ----------
let lockedId: string | null = null;
let lockedDist = Infinity;
let challenger: string | null = null;
let challengerFrames = 0;

interface RawCandidate { id: string; product: Product; rect: DOMRect; distance: number; }

export function findVisibleGazeTarget(sig: FaceSignals): GazeTarget | null {
  if (!sig.present) {
    challenger = null; challengerFrames = 0;
    return null;
  }
  const point = gazeToViewportPoint(sig);

  const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-aura-product-id]"));
  const candidates: RawCandidate[] = [];
  for (const node of nodes) {
    const id = node.dataset.auraProductId;
    const product = id ? PRODUCT_BY_ID.get(id) : undefined;
    if (!id || !product) continue;
    const rect = node.getBoundingClientRect();
    if (!isVisible(rect)) continue;
    const dx = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0;
    const dy = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0;
    candidates.push({ id, product, rect, distance: Math.hypot(dx, dy) });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  const closest = candidates[0];

  // First-time lock
  if (lockedId === null) {
    lockedId = closest.id;
    lockedDist = closest.distance;
  } else {
    // Update distance to currently-locked product
    const lockedNow = candidates.find((c) => c.id === lockedId);
    lockedDist = lockedNow ? lockedNow.distance : Infinity;

    // Consider switching only if a different product is meaningfully closer
    if (closest.id !== lockedId && lockedDist - closest.distance > TUNE.stickinessPx) {
      if (challenger === closest.id) {
        challengerFrames += 1;
      } else {
        challenger = closest.id;
        challengerFrames = 1;
      }
      if (challengerFrames >= TUNE.switchFrames) {
        lockedId = closest.id;
        lockedDist = closest.distance;
        challenger = null;
        challengerFrames = 0;
      }
    } else {
      challenger = null;
      challengerFrames = 0;
    }
  }

  if (lockedDist > TUNE.maxLockPx) return null;

  const final = candidates.find((c) => c.id === lockedId) ?? closest;
  const inside = final.distance === 0;
  const confidence = inside ? 96 : Math.max(0, Math.round(92 - final.distance / 4.5));
  return { product: final.product, rect: final.rect, distance: final.distance, confidence, point };
}

export function quickLookReview(target: GazeTarget): string {
  const { product, confidence } = target;
  if (confidence > 85) return `Your gaze is landing on ${product.name}.`;
  if (confidence > 55) return `You appear to be scanning near ${product.name}.`;
  return `Closest visible product is ${product.name}.`;
}

// ---------- helpers ----------
function isVisible(rect: DOMRect) {
  return (
    rect.width > 24 && rect.height > 24 &&
    rect.bottom > 0 && rect.right > 0 &&
    rect.top < window.innerHeight && rect.left < window.innerWidth
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
