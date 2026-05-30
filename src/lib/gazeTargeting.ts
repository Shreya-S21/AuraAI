import { PRODUCTS, type Product } from "../data/products";
import type { FaceSignals } from "./faceMesh";

export interface GazeTarget {
  product: Product;
  rect: DOMRect;
  distance: number;
  confidence: number;
  point: { x: number; y: number };
}

export type CalibrationTarget = "left" | "center" | "right" | "top" | "bottom";

export interface CalibrationProfile {
  left: number;
  centerX: number;
  right: number;
  top: number;
  centerY: number;
  bottom: number;
}

export interface CalibrationSamples {
  leftX: number[];
  centerX: number[];
  rightX: number[];
  topY: number[];
  centerY: number[];
  bottomY: number[];
}

const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));
const CALIBRATION_KEY = "auraai_gaze_calibration_v1";

const TUNE = {
  signX: -1,          // mirrored camera preview
  signY: +1,
  deadZone: 0.015,    // much smaller now that calibration is user-specific
  smooth: 0.82,
  stickinessPx: 80,
  maxLockPx: 220,
  switchFrames: 4,
};

let calibration: CalibrationProfile | null = loadCalibration();
let smX = 0;
let smY = 0;
let lockedId: string | null = null;
let lockedDist = Infinity;
let challenger: string | null = null;
let challengerFrames = 0;

export function getCalibrationProfile() {
  return calibration;
}

export function setCalibrationProfile(profile: CalibrationProfile) {
  calibration = profile;
  try {
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
  resetGazeSmoothing();
}

export function clearCalibrationProfile() {
  calibration = null;
  try {
    localStorage.removeItem(CALIBRATION_KEY);
  } catch {
    /* ignore */
  }
  resetGazeSmoothing();
}

export function buildCalibrationProfile(samples: CalibrationSamples): CalibrationProfile {
  return {
    left: avg(samples.leftX),
    centerX: avg(samples.centerX),
    right: avg(samples.rightX),
    top: avg(samples.topY),
    centerY: avg(samples.centerY),
    bottom: avg(samples.bottomY),
  };
}

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

function deadband(v: number, dz: number) {
  if (v > dz) return (v - dz) / (1 - dz);
  if (v < -dz) return (v + dz) / (1 - dz);
  return 0;
}

function ease(v: number) {
  // Smooth but less aggressive than tanh-gain guessing. Calibration gives us
  // range; this just softens the curve slightly near center.
  return Math.tanh(v * 1.6);
}

function normalizePiecewise(v: number, neg: number, center: number, pos: number) {
  // Maps measured raw gaze values to -1..1 using the user's own calibration
  // anchors. Piecewise interpolation gives much better control than a single
  // global gain constant.
  if (v <= center) {
    const denom = center - neg || 1e-6;
    return -clamp((center - v) / denom, 0, 1);
  }
  const denom = pos - center || 1e-6;
  return clamp((v - center) / denom, 0, 1);
}

function calibratedFactors(sig: FaceSignals) {
  const rawX = TUNE.signX * sig.gazeX;
  const rawY = TUNE.signY * sig.gazeY;

  smX = smX * TUNE.smooth + rawX * (1 - TUNE.smooth);
  smY = smY * TUNE.smooth + rawY * (1 - TUNE.smooth);

  if (calibration) {
    const x = ease(deadband(normalizePiecewise(smX, calibration.left, calibration.centerX, calibration.right), TUNE.deadZone));
    const y = ease(deadband(normalizePiecewise(smY, calibration.top, calibration.centerY, calibration.bottom), TUNE.deadZone));
    return { xFactor: x, yFactor: y };
  }

  // Fallback if user hasn't calibrated yet.
  return {
    xFactor: ease(deadband(smX * 2.8, TUNE.deadZone)),
    yFactor: ease(deadband(smY * 2.2, TUNE.deadZone)),
  };
}

export function gazeToViewportPoint(sig: FaceSignals) {
  const { xFactor, yFactor } = calibratedFactors(sig);
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

interface RawCandidate { id: string; product: Product; rect: DOMRect; distance: number; }

export function findVisibleGazeTarget(sig: FaceSignals): GazeTarget | null {
  if (!sig.present) {
    challenger = null;
    challengerFrames = 0;
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

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  const closest = candidates[0];

  if (lockedId === null) {
    lockedId = closest.id;
    lockedDist = closest.distance;
  } else {
    const lockedNow = candidates.find((c) => c.id === lockedId);
    lockedDist = lockedNow ? lockedNow.distance : Infinity;
    if (closest.id !== lockedId && lockedDist - closest.distance > TUNE.stickinessPx) {
      if (challenger === closest.id) challengerFrames += 1;
      else {
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

function loadCalibration(): CalibrationProfile | null {
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CalibrationProfile;
  } catch {
    return null;
  }
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
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
