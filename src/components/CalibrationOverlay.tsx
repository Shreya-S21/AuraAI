import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw, X, Target } from "lucide-react";
import { Button } from "./ui";
import {
  CALIBRATION_POINTS,
  calibrationBounds,
  saveCalibration,
  type CalibrationData,
  type CalibrationPoint,
} from "../lib/calibration";
import { readLiveGaze, subscribeLiveGaze } from "../lib/liveGaze";

// 9-point gaze calibration screen. Walks the user through looking at 9
// positions, averages the iris signal at each, and stores the bounds so
// gaze-to-screen mapping is calibrated per-user.

interface CalibrationOverlayProps {
  onDone: () => void;
  onCancel: () => void;
}

// Where each dot lives as a fraction of the screen.
const POINT_POSITION: Record<CalibrationPoint, { x: number; y: number }> = {
  topLeft:      { x: 0.10, y: 0.20 },
  topCenter:    { x: 0.50, y: 0.12 },
  topRight:     { x: 0.90, y: 0.20 },
  midLeft:      { x: 0.08, y: 0.50 },
  midCenter:    { x: 0.50, y: 0.50 },
  midRight:     { x: 0.92, y: 0.50 },
  bottomLeft:   { x: 0.10, y: 0.80 },
  bottomCenter: { x: 0.50, y: 0.88 },
  bottomRight:  { x: 0.90, y: 0.80 },
};

// How long to sample the iris signal at each dot (ms).
const SAMPLE_MS = 1800;
// Prep time before sampling starts so the user's eyes land on the dot.
const PREP_MS = 600;

export function CalibrationOverlay({ onDone, onCancel }: CalibrationOverlayProps) {
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"prep" | "sample" | "done">("prep");
  const [progress, setProgress] = useState(0);
  const [samples, setSamples] = useState<Record<CalibrationPoint, { x: number; y: number; n: number }>>({} as any);
  const currentPoint = CALIBRATION_POINTS[step] ?? null;
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!currentPoint) return;
    startRef.current = performance.now();
    setPhase("prep");
    setProgress(0);

    const unsub = subscribeLiveGaze(() => {
      const sig = readLiveGaze();
      if (sig.present && phase === "sample") {
        setSamples((prev) => {
          const cur = prev[currentPoint] ?? { x: 0, y: 0, n: 0 };
          const n = cur.n + 1;
          return {
            ...prev,
            [currentPoint]: {
              x: (cur.x * cur.n + sig.gazeX) / n,
              y: (cur.y * cur.n + sig.gazeY) / n,
              n,
            },
          };
        });
      }
    });

    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      if (phase === "prep") {
        setProgress(Math.min(1, elapsed / PREP_MS));
        if (elapsed >= PREP_MS) setPhase("sample");
      } else if (phase === "sample") {
        setProgress(Math.min(1, elapsed / (PREP_MS + SAMPLE_MS)));
        if (elapsed >= PREP_MS + SAMPLE_MS) {
          if (step + 1 < CALIBRATION_POINTS.length) {
            setStep(step + 1);
          } else {
            setPhase("done");
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      unsub();
    };
  }, [currentPoint, phase, step]);

  const finish = () => {
    const safe = (p: CalibrationPoint) =>
      samples[p] ?? { x: 0, y: 0, n: 0 };

    const cal: CalibrationData = {
      topLeft:      safe("topLeft"),
      topCenter:    safe("topCenter"),
      topRight:     safe("topRight"),
      midLeft:      safe("midLeft"),
      midCenter:    safe("midCenter"),
      midRight:     safe("midRight"),
      bottomLeft:   safe("bottomLeft"),
      bottomCenter: safe("bottomCenter"),
      bottomRight:  safe("bottomRight"),
      timestamp: Date.now(),
    };

    const b = calibrationBounds(cal);
    // Sanity check: ignore degenerate calibration (user didn't move eyes).
    if (Math.abs(b.xMax - b.xMin) < 0.05 || Math.abs(b.yMax - b.yMin) < 0.05) {
      alert("Calibration didn't capture enough eye movement. Please keep your eyes on each dot while it's on screen.");
      return;
    }
    saveCalibration(cal);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md">
      {/* Top-left info */}
      <div className="absolute left-6 top-6 text-white">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-violet-400" />
          <p className="text-sm font-semibold">Gaze Calibration</p>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Step {Math.min(step + 1, CALIBRATION_POINTS.length)} / {CALIBRATION_POINTS.length}
        </p>
      </div>

      <button
        onClick={onCancel}
        className="absolute right-6 top-6 rounded-full p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
        title="Cancel"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Progress bar */}
      <div className="absolute left-1/2 top-10 w-64 -translate-x-1/2">
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* The calibration dot */}
      {phase !== "done" && currentPoint && (
        <CalibrationDot position={POINT_POSITION[currentPoint]} phase={phase} progress={progress} />
      )}

      {/* Instructions */}
      <div className="absolute bottom-16 left-1/2 max-w-md -translate-x-1/2 text-center">
        {phase === "prep" && (
          <p className="text-lg font-medium text-white">Move your eyes to the dot</p>
        )}
        {phase === "sample" && (
          <p className="text-lg font-medium text-white">Keep looking at the dot…</p>
        )}
        {phase === "done" && (
          <div className="space-y-4">
            <Check className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="text-lg font-semibold text-white">Calibration complete</p>
            <p className="text-sm text-zinc-400">
              The gaze tracker will now use your iris range. Look around — the dot
              should follow naturally without straining.
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={finish}>
                <Check className="h-4 w-4" /> Use this calibration
              </Button>
              <Button variant="outline" onClick={() => { setStep(0); setPhase("prep"); }}>
                <RotateCcw className="h-4 w-4" /> Redo
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500">
        Press Esc to cancel · all processing happens on your device
      </p>

      <KeyboardEscape onEscape={onCancel} />
    </div>
  );
}

function CalibrationDot({
  position,
  phase,
  progress,
}: {
  position: { x: number; y: number };
  phase: "prep" | "sample";
  progress: number;
}) {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
    >
      <AnimatePresence>
        <motion.div
          key={phase}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative"
        >
          <div className="h-20 w-20 rounded-full border-2 border-violet-400/60" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="h-4 w-4 rounded-full bg-white shadow-lg shadow-violet-400/50" />
          </div>
          {phase === "sample" && (
            <svg className="absolute inset-0 h-20 w-20 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="url(#calRing)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 36}
                strokeDashoffset={2 * Math.PI * 36 * (1 - progress)}
              />
              <defs>
                <linearGradient id="calRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function KeyboardEscape({ onEscape }: { onEscape: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEscape]);
  return null;
}
