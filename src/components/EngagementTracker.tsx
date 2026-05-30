// =============================================================
// EngagementTracker — REAL webcam capture + MediaPipe FaceLandmarker.
// -------------------------------------------------------------
// Now includes a 5-point calibration flow so gaze mapping learns the
// current user's eyes instead of relying only on guessed constants.
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, CameraOff, Activity, ScanFace, Shield, Eye, Loader2,
  Target, RotateCcw,
} from "lucide-react";
import { Button, Card } from "./ui";
import { useSession } from "../context/SessionContext";
import { ProductImage } from "./ProductImage";
import {
  findVisibleGazeTarget,
  gazeToViewportPoint,
  quickLookReview,
  type GazeTarget,
  buildCalibrationProfile,
  setCalibrationProfile,
  getCalibrationProfile,
  clearCalibrationProfile,
  resetGazeSmoothing,
  type CalibrationSamples,
} from "../lib/gazeTargeting";
import {
  loadFaceLandmarker,
  analyzeFrame,
  disposeFaceLandmarker,
  type FaceSignals,
} from "../lib/faceMesh";

const STEPS = [
  { key: "center", label: "Look at the center dot", x: "50%", y: "50%" },
  { key: "left", label: "Now look at the left dot", x: "12%", y: "50%" },
  { key: "right", label: "Now look at the right dot", x: "88%", y: "50%" },
  { key: "top", label: "Now look at the top dot", x: "50%", y: "14%" },
  { key: "bottom", label: "Now look at the bottom dot", x: "50%", y: "86%" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function emptySamples(): CalibrationSamples {
  return { leftX: [], centerX: [], rightX: [], topY: [], centerY: [], bottomY: [] };
}

export function EngagementTracker() {
  const { cameraActive, setCameraActive, attention, setAttention } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const attentionSmooth = useRef(0);
  const rollingX = useRef<number[]>([]);
  const rollingY = useRef<number[]>([]);
  const collected = useRef<CalibrationSamples>(emptySamples());

  const [error, setError] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [sig, setSig] = useState<FaceSignals | null>(null);
  const [gazeTarget, setGazeTarget] = useState<GazeTarget | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasCalibration, setHasCalibration] = useState(!!getCalibrationProfile());

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setAttention(0);
    setSig(null);
    setGazeTarget(null);
    setCalibrating(false);
    attentionSmooth.current = 0;
    resetGazeSmoothing();
  }, [setCameraActive, setAttention]);

  const loop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    const s = analyzeFrame(video, performance.now());
    setSig(s);
    setGazeTarget(findVisibleGazeTarget(s));

    if (s.present) {
      rollingX.current.push(s.gazeX);
      rollingY.current.push(s.gazeY);
      if (rollingX.current.length > 18) rollingX.current.shift();
      if (rollingY.current.length > 18) rollingY.current.shift();
    }

    attentionSmooth.current = +(attentionSmooth.current * 0.82 + s.attention * 0.18).toFixed(3);
    setAttention(attentionSmooth.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [setAttention]);

  const start = useCallback(async () => {
    setError(null);
    setLoadingModel(true);
    try {
      await loadFaceLandmarker();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLoadingModel(false);
      setCameraActive(true);
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      setLoadingModel(false);
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera permission denied. AuraAI still works — engagement is inferred from browsing behavior."
          : "Could not start the face model. Check your connection (model downloads once) or camera.",
      );
    }
  }, [loop, setCameraActive]);

  const beginCalibration = useCallback(() => {
    if (!cameraActive) return;
    collected.current = emptySamples();
    rollingX.current = [];
    rollingY.current = [];
    resetGazeSmoothing();
    setStepIndex(0);
    setCalibrating(true);
  }, [cameraActive]);

  const captureCalibrationStep = useCallback(() => {
    if (!sig?.present) return;
    const xs = [...rollingX.current];
    const ys = [...rollingY.current];
    if (xs.length < 6 || ys.length < 6) return;

    const step = STEPS[stepIndex].key as StepKey;
    if (step === "center") {
      collected.current.centerX = xs;
      collected.current.centerY = ys;
    } else if (step === "left") {
      collected.current.leftX = xs;
    } else if (step === "right") {
      collected.current.rightX = xs;
    } else if (step === "top") {
      collected.current.topY = ys;
    } else if (step === "bottom") {
      collected.current.bottomY = ys;
    }

    if (stepIndex === STEPS.length - 1) {
      const profile = buildCalibrationProfile(collected.current);
      setCalibrationProfile(profile);
      setHasCalibration(true);
      setCalibrating(false);
      setStepIndex(0);
      return;
    }

    rollingX.current = [];
    rollingY.current = [];
    setStepIndex((s) => s + 1);
  }, [sig, stepIndex]);

  const resetCalibration = useCallback(() => {
    clearCalibrationProfile();
    setHasCalibration(false);
    setCalibrating(false);
    setStepIndex(0);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      disposeFaceLandmarker();
    };
  }, []);

  const attPct = Math.round(attention * 100);
  const present = !!sig?.present;
  const box = sig?.box ?? null;
  const lookedProduct = gazeTarget?.product ?? null;
  const gazePoint = sig?.present ? gazeToViewportPoint(sig) : null;
  const popupPlacement = box ? facePopupPlacement(box) : null;
  const currentStep = STEPS[stepIndex];
  const canCapture = present && rollingX.current.length >= 6 && rollingY.current.length >= 6;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 p-4">
        <div className="flex items-center gap-2">
          <ScanFace className="h-5 w-5 text-violet-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Engagement Tracker</h3>
            <p className="text-[11px] text-zinc-500">MediaPipe · 468-pt face mesh</p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            cameraActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-zinc-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cameraActive ? "bg-emerald-400 aura-glow" : "bg-zinc-500"}`} />
          {cameraActive ? "Live" : "Idle"}
        </span>
      </div>

      <div className="relative aspect-video bg-black/40">
        <video ref={videoRef} className="h-full w-full -scale-x-100 object-cover" muted playsInline />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {loadingModel ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                <p className="text-xs text-zinc-400">Loading face-mesh model…</p>
              </>
            ) : (
              <>
                <Camera className="h-8 w-8 text-zinc-600" />
                <p className="max-w-xs text-xs text-zinc-400">
                  Enable your camera for real-time face-mesh attention analysis.
                  Everything runs on-device — no frames leave your browser.
                </p>
                <Button onClick={start}>
                  <Camera className="h-4 w-4" /> Enable Camera
                </Button>
              </>
            )}
            {error && <p className="max-w-xs text-[11px] text-amber-400">{error}</p>}
          </div>
        )}

        {cameraActive && (
          <>
            <AnimatePresence>
              {present && box && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`pointer-events-none absolute rounded-lg border-2 ${
                    sig?.lookingAtScreen ? "border-emerald-400/90" : "border-amber-400/80"
                  }`}
                  style={{
                    left: `${(1 - box.x - box.w) * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.w * 100}%`,
                    height: `${box.h * 100}%`,
                    boxShadow: sig?.lookingAtScreen
                      ? "0 0 24px rgba(52,211,153,0.45)"
                      : "0 0 18px rgba(251,191,36,0.35)",
                  }}
                >
                  <span
                    className={`absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      sig?.lookingAtScreen ? "bg-emerald-500/90 text-black" : "bg-amber-500/90 text-black"
                    }`}
                  >
                    {sig?.lookingAtScreen ? "FOCUSED" : "LOOKING AWAY"} · {attPct}%
                  </span>
                </motion.div>
              )}

              {present && box && gazePoint && !calibrating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none fixed z-[70] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300 bg-sky-400/80 shadow-lg shadow-sky-400/40"
                  style={{ left: gazePoint.x, top: gazePoint.y }}
                />
              )}

              {present && box && lookedProduct && popupPlacement && gazeTarget && !calibrating && (
                <motion.div
                  key={lookedProduct.id}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.18 }}
                  className="pointer-events-none absolute w-32 overflow-hidden rounded-xl border border-white/15 bg-black/70 shadow-2xl backdrop-blur-md"
                  style={{ left: popupPlacement.left, top: popupPlacement.top }}
                >
                  <ProductImage product={lookedProduct} className="h-16 w-full" />
                  <div className="p-2">
                    <p className="text-[9px] uppercase tracking-wide text-violet-300">
                      {gazeTarget.confidence > 85 ? "Screen target" : "Nearest card"} · {gazeTarget.confidence}%
                    </p>
                    <p className="truncate text-[11px] font-semibold text-white">{lookedProduct.name}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-zinc-400">
                      {quickLookReview(gazeTarget)}
                    </p>
                  </div>
                </motion.div>
              )}

              {calibrating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[60] bg-black/55 backdrop-blur-sm"
                >
                  {STEPS.map((s, i) => (
                    <div
                      key={s.key}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
                        i === stepIndex ? "h-6 w-6 bg-sky-400 shadow-lg shadow-sky-400/40" : "h-3 w-3 bg-white/30"
                      }`}
                      style={{ left: s.x, top: s.y }}
                    />
                  ))}
                  <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/70 p-4 text-center backdrop-blur">
                    <p className="text-sm font-semibold text-white">Calibration step {stepIndex + 1} / {STEPS.length}</p>
                    <p className="mt-1 text-xs text-zinc-400">{currentStep.label}. Keep your head still and move only your eyes.</p>
                    <div className="mt-3 flex justify-center gap-2">
                      <Button variant="outline" onClick={() => setCalibrating(false)}>Cancel</Button>
                      <Button onClick={captureCalibrationStep} disabled={!canCapture}>
                        <Target className="h-4 w-4" /> Capture
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {!present && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-x-0 bottom-3 text-center text-[11px] text-zinc-400"
                >
                  No face detected
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute right-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-emerald-300 backdrop-blur">● REC</div>
            <div className="absolute left-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-[9px] font-medium text-zinc-300 backdrop-blur">MediaPipe FaceMesh</div>
          </>
        )}
      </div>

      <div className="grid grid-cols-4 divide-x divide-white/5 border-t border-white/5">
        <Signal label="Attention" value={`${attPct}%`} icon={<Activity className="h-3.5 w-3.5" />} />
        <Signal label="Gaze" value={present ? gazeLabel(sig!) : "—"} icon={<Eye className="h-3.5 w-3.5" />} />
        <Signal label="Yaw" value={present ? `${sig!.yaw}°` : "—"} icon={<ScanFace className="h-3.5 w-3.5" />} />
        <Signal label="Pitch" value={present ? `${sig!.pitch}°` : "—"} icon={<ScanFace className="h-3.5 w-3.5" />} />
      </div>

      <div className="border-t border-white/5 p-3">
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
            animate={{ width: `${attPct}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Shield className="h-3 w-3" /> On-device · no emotion data · no frames stored
          </span>
          <div className="flex gap-2">
            {cameraActive && (
              <Button variant="outline" className="px-2 py-1 text-xs" onClick={beginCalibration}>
                <Target className="h-3.5 w-3.5" /> {hasCalibration ? "Recalibrate" : "Calibrate"}
              </Button>
            )}
            {hasCalibration && (
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={resetCalibration}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
            {cameraActive && (
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={stop}>
                <CameraOff className="h-3.5 w-3.5" /> Stop
              </Button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-zinc-500">
          {hasCalibration
            ? "Gaze calibration saved for this browser. Recalibrate if lighting or camera angle changes."
            : "Run calibration for more accurate left/right product targeting."}
        </p>
      </div>
    </Card>
  );
}

function gazeLabel(s: FaceSignals): string {
  if (Math.abs(s.gazeX) < 0.25 && Math.abs(s.gazeY) < 0.3) return "Center";
  const h = s.gazeX > 0.25 ? "Right" : s.gazeX < -0.25 ? "Left" : "";
  const v = s.gazeY > 0.3 ? "Down" : s.gazeY < -0.3 ? "Up" : "";
  return [v, h].filter(Boolean).join("-") || "Center";
}

function facePopupPlacement(box: { x: number; y: number; w: number; h: number }) {
  const mirroredX = 1 - box.x - box.w;
  const showLeft = mirroredX > 0.56;
  const left = showLeft
    ? Math.max(2, (mirroredX - 0.38) * 100)
    : Math.min(66, (mirroredX + box.w + 0.03) * 100);
  const top = Math.max(8, Math.min(62, (box.y + 0.08) * 100));
  return { left: `${left}%`, top: `${top}%` };
}

function Signal({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}
