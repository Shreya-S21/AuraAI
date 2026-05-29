// =============================================================
// EngagementTracker — REAL webcam capture + MediaPipe FaceLandmarker.
// -------------------------------------------------------------
// Runs Google's actual 468-point face mesh (WASM) in the browser to
// derive measured signals: presence, head pose (yaw/pitch/roll),
// iris-based gaze, blink, and a "looking at screen" flag.
//
// BEHAVIORAL ENGAGEMENT analysis — NOT emotion detection. Frames are
// processed entirely on-device; only numeric signals are kept.
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Activity, ScanFace, Shield, Eye, Loader2 } from "lucide-react";
import { Button, Card } from "./ui";
import { useSession } from "../context/SessionContext";
import {
  loadFaceLandmarker,
  analyzeFrame,
  disposeFaceLandmarker,
  type FaceSignals,
} from "../lib/faceMesh";

export function EngagementTracker() {
  const { cameraActive, setCameraActive, attention, setAttention } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const attentionSmooth = useRef(0);

  const [error, setError] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [sig, setSig] = useState<FaceSignals | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setAttention(0);
    setSig(null);
    attentionSmooth.current = 0;
  }, [setCameraActive, setAttention]);

  const loop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    const s = analyzeFrame(video, performance.now());
    setSig(s);
    // Smooth published attention (EMA) so scoring isn't jittery.
    attentionSmooth.current = +(attentionSmooth.current * 0.82 + s.attention * 0.18).toFixed(3);
    setAttention(attentionSmooth.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [setAttention]);

  const start = useCallback(async () => {
    setError(null);
    setLoadingModel(true);
    try {
      // 1) Load the real MediaPipe model (cached after first load).
      await loadFaceLandmarker();
      // 2) Get the camera.
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
                // Real landmark bounding box. Video is mirrored, so flip x.
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
            <div className="absolute right-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] text-emerald-300 backdrop-blur">
              ● REC
            </div>
            <div className="absolute left-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-[9px] font-medium text-zinc-300 backdrop-blur">
              MediaPipe FaceMesh
            </div>
          </>
        )}
      </div>

      {/* Live measured signals */}
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
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Shield className="h-3 w-3" /> On-device · no emotion data · no frames stored
          </span>
          {cameraActive && (
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={stop}>
              <CameraOff className="h-3.5 w-3.5" /> Stop
            </Button>
          )}
        </div>
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

function Signal({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
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
