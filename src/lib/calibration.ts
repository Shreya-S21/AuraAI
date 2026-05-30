// 9-point calibration for per-user gaze mapping.
// ---------------------------------------------------
// Stores the raw iris signal the user produces when looking at each of 9
// known screen positions. After calibration, gaze-to-screen mapping is a
// simple linear transform using the user's actual iris range instead of
// a hardcoded guess.

const CALIBRATION_KEY = "auraai_gaze_calibration_v1";

export interface CalibrationData {
  // Averaged iris signal per corner/edge/center
  topLeft: { x: number; y: number };
  topCenter: { x: number; y: number };
  topRight: { x: number; y: number };
  midLeft: { x: number; y: number };
  midCenter: { x: number; y: number };
  midRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomCenter: { x: number; y: number };
  bottomRight: { x: number; y: number };
  timestamp: number;
}

export type CalibrationPoint = keyof Omit<CalibrationData, "timestamp">;

export const CALIBRATION_POINTS: CalibrationPoint[] = [
  "topLeft",
  "topCenter",
  "topRight",
  "midLeft",
  "midCenter",
  "midRight",
  "bottomLeft",
  "bottomCenter",
  "bottomRight",
];

export function saveCalibration(c: CalibrationData) {
  localStorage.setItem(CALIBRATION_KEY, JSON.stringify(c));
}

export function loadCalibration(): CalibrationData | null {
  try {
    const raw = localStorage.getItem(CALIBRATION_KEY);
    return raw ? (JSON.parse(raw) as CalibrationData) : null;
  } catch {
    return null;
  }
}

export function clearCalibration() {
  localStorage.removeItem(CALIBRATION_KEY);
}

export function calibrationAgeHours(c: CalibrationData): number {
  return (Date.now() - c.timestamp) / (1000 * 60 * 60);
}

// Linear mapping using calibrated bounds.
// Raw iris signal (from MediaPipe, roughly -1..1 but user-specific range)
// is remapped so the user's min→-1 and max→+1, clamped.
export function calibratedFactor(
  raw: number,
  min: number,
  max: number,
): number {
  const range = max - min;
  if (range < 0.05) return 0; // degenerate calibration, don't amplify noise
  const norm = (raw - min) / range; // 0..1
  const mapped = norm * 2 - 1;       // -1..1
  return Math.max(-1, Math.min(1, mapped));
}

// Get X/Y bounds from the calibration. Uses left/right column averages
// for X and top/bottom row averages for Y to be robust to small capture noise.
export function calibrationBounds(c: CalibrationData) {
  return {
    xMin: (c.topLeft.x + c.midLeft.x + c.bottomLeft.x) / 3,
    xMax: (c.topRight.x + c.midRight.x + c.bottomRight.x) / 3,
    yMin: (c.topLeft.y + c.topCenter.y + c.topRight.y) / 3,
    yMax: (c.bottomLeft.y + c.bottomCenter.y + c.bottomRight.y) / 3,
  };
}
