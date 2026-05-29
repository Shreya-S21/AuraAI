// =============================================================
// Real face analysis via MediaPipe Tasks Vision (FaceLandmarker).
// -------------------------------------------------------------
// Runs Google's actual 468-point face mesh model (WASM) in-browser,
// in EVERY browser — no experimental API, no server, no fake data.
//
// From the real landmarks + the facial transformation matrix we derive:
//   • presence        — is a face actually detected
//   • headPose        — yaw / pitch / roll (degrees), real 3D orientation
//   • gaze            — iris-vs-eye-corner offset → looking-at-screen proxy
//   • attention       — blend: present + facing-forward + gaze-centered
//
// Every number traces back to measured landmark geometry.
// =============================================================

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

export interface FaceSignals {
  present: boolean;
  yaw: number;      // left/right head turn (deg)
  pitch: number;    // up/down (deg)
  roll: number;     // tilt (deg)
  gazeX: number;    // -1 (left) .. 1 (right)
  gazeY: number;    // -1 (up) .. 1 (down)
  lookingAtScreen: boolean;
  attention: number; // 0..1
  blink: number;     // 0 open .. 1 closed (avg eyes)
  box: { x: number; y: number; w: number; h: number } | null; // normalized
}

const EMPTY: FaceSignals = {
  present: false, yaw: 0, pitch: 0, roll: 0, gazeX: 0, gazeY: 0,
  lookingAtScreen: false, attention: 0, blink: 0, box: null,
};

let landmarker: FaceLandmarker | null = null;
let loading: Promise<FaceLandmarker> | null = null;

// CDN for the WASM runtime + model. (Self-host these for production.)
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export async function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarker) return landmarker;
  if (loading) return loading;
  loading = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFacialTransformationMatrixes: true, // gives us real head pose
    });
    return landmarker;
  })();
  return loading;
}

// Convert MediaPipe's 4x4 transformation matrix to yaw/pitch/roll degrees.
function matrixToEuler(m: number[]) {
  // column-major 4x4 -> rotation part
  const r00 = m[0], r01 = m[4], r02 = m[8];
  const r10 = m[1], r11 = m[5], r12 = m[9];
  const r20 = m[2], r21 = m[6], r22 = m[10];
  const sy = Math.sqrt(r00 * r00 + r10 * r10);
  let yaw: number, pitch: number, roll: number;
  if (sy > 1e-6) {
    pitch = Math.atan2(r21, r22);
    yaw = Math.atan2(-r20, sy);
    roll = Math.atan2(r10, r00);
  } else {
    pitch = Math.atan2(-r12, r11);
    yaw = Math.atan2(-r20, sy);
    roll = 0;
  }
  const deg = (r: number) => (r * 180) / Math.PI;
  return { pitch: deg(pitch), yaw: deg(yaw), roll: deg(roll), r01, r02, r11, r12 };
}

// Landmark indices (MediaPipe canonical face).
const L_IRIS = 468, R_IRIS = 473;
const L_EYE_L = 33, L_EYE_R = 133;        // left eye corners
const R_EYE_L = 362, R_EYE_R = 263;       // right eye corners
const L_EYE_TOP = 159, L_EYE_BOT = 145;
const R_EYE_TOP = 386, R_EYE_BOT = 374;

function gazeFromIris(lm: { x: number; y: number }[]) {
  // Horizontal: iris position between eye corners (0.5 = centered).
  const lx = (lm[L_IRIS].x - lm[L_EYE_L].x) / (lm[L_EYE_R].x - lm[L_EYE_L].x);
  const rx = (lm[R_IRIS].x - lm[R_EYE_L].x) / (lm[R_EYE_R].x - lm[R_EYE_L].x);
  const hx = (lx + rx) / 2;
  // Vertical: iris between top/bottom lids.
  const ly = (lm[L_IRIS].y - lm[L_EYE_TOP].y) / (lm[L_EYE_BOT].y - lm[L_EYE_TOP].y);
  const ry = (lm[R_IRIS].y - lm[R_EYE_TOP].y) / (lm[R_EYE_BOT].y - lm[R_EYE_TOP].y);
  const vy = (ly + ry) / 2;
  return {
    gazeX: Math.max(-1, Math.min(1, (hx - 0.5) * 2)),
    gazeY: Math.max(-1, Math.min(1, (vy - 0.5) * 2)),
  };
}

function blinkRatio(lm: { x: number; y: number }[]) {
  const l = Math.abs(lm[L_EYE_TOP].y - lm[L_EYE_BOT].y);
  const r = Math.abs(lm[R_EYE_TOP].y - lm[R_EYE_BOT].y);
  const open = (l + r) / 2;
  // smaller opening => more closed; normalize against a typical open value.
  return Math.max(0, Math.min(1, 1 - open / 0.045));
}

export function analyzeFrame(
  video: HTMLVideoElement,
  timestampMs: number,
): FaceSignals {
  if (!landmarker) return EMPTY;
  let res: FaceLandmarkerResult;
  try {
    res = landmarker.detectForVideo(video, timestampMs);
  } catch {
    return EMPTY;
  }
  if (!res.faceLandmarks || res.faceLandmarks.length === 0) return EMPTY;

  const lm = res.faceLandmarks[0];

  // Head pose from the real transformation matrix.
  let yaw = 0, pitch = 0, roll = 0;
  const mtx = res.facialTransformationMatrixes?.[0]?.data;
  if (mtx) {
    const e = matrixToEuler(Array.from(mtx));
    yaw = e.yaw; pitch = e.pitch; roll = e.roll;
  }

  const { gazeX, gazeY } = gazeFromIris(lm);
  const blink = blinkRatio(lm);

  // Bounding box from landmark extents.
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of lm) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const box = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

  // Facing-forward score: penalize large yaw/pitch.
  const facing = Math.max(0, 1 - (Math.abs(yaw) + Math.abs(pitch)) / 50);
  // Gaze-centered score.
  const gazeCentered = Math.max(0, 1 - (Math.abs(gazeX) + Math.abs(gazeY)) / 1.4);
  const eyesOpen = blink < 0.7 ? 1 : 0.3;
  const lookingAtScreen = facing > 0.45 && gazeCentered > 0.4 && blink < 0.8;

  // Real, interpretable attention blend.
  const attention = Math.max(0, Math.min(1,
    0.5 * facing + 0.35 * gazeCentered + 0.15 * eyesOpen));

  return {
    present: true,
    yaw: +yaw.toFixed(1), pitch: +pitch.toFixed(1), roll: +roll.toFixed(1),
    gazeX: +gazeX.toFixed(2), gazeY: +gazeY.toFixed(2),
    lookingAtScreen, attention: +attention.toFixed(3),
    blink: +blink.toFixed(2), box,
  };
}

export function disposeFaceLandmarker() {
  landmarker?.close();
  landmarker = null;
  loading = null;
}
