// =============================================================
// EngagementTracker — Real MediaPipe Face Mesh Analysis
// -------------------------------------------------------------
// Uses Google's official 468-point FaceLandmarker model (WASM).
// Provides real head pose (yaw/pitch), gaze direction, blink detection,
// and "looking at screen" signal. Everything runs on-device.
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Activity, ScanFace, Shield, Loader2 } from "lucide-react";
import { Button, Card } from "./ui";
import { useSession } from "../context/SessionContext";
import { loadFaceLandmarker, analyzeFrame, disposeFaceLandmarker, type FaceSignals } from "../lib/faceMesh";

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
    const signals = analyzeFrame(video, performance.now());
    setSig(signals);

    attentionSmooth.current = +(attentionSmooth.current * 0.82 + signals.attention * 0.18).toFixed(3);
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
    } catch (err: any) {
      setLoadingModel(false);
      setError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. You can still browse — engagement will be inferred from behavior."
          : "Failed to start camera or load face model. Please try again."
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
  const present = sig?.present ?? false;
  const box = sig?.box ?? null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 p-4">
        <div className="flex items-center gap-2">
          <ScanFace className="h-5 w-5 text-violet-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Engagement Tracker</h3>
            <p className="text-[11px] text-zinc-500">MediaPipe • 468-point Face Mesh</p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            cameraActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-zinc-400"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cameraActive ? "bg-emerald-400 aura-glow" : "bg-zinc-500"}`} />
          {cameraActive ? "LIVE" : "OFF"}
        </span>
      </div>

      <div className="relative aspect-video bg-black/70">
        <video
          ref={videoRef}
          className="h-full w-full -scale-x-100 object-cover"
          muted
          playsInline
        />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            {loadingModel ? (
              <>
                <Loader2 className="h-9 w-9 animate-spin text-violet-400" />
                <p className="text-sm text-zinc-400">Loading face mesh model...</p>
              </>
            ) : (
              <>
                <Camera className="h-10 w-10 text-zinc-500" />
                <p className="max-w-xs text-sm text-zinc-400">
                  Enable camera for real face tracking.<br />
                  All processing happens in your browser.
                </p>
                <Button onClick={start} className="mt-2">
                  <Camera className="mr-2 h-4 w-4" /> Enable Camera
                </Button>
              </>
            )}
            {error && <p className="text-xs text-amber-400 mt-4">{error}</p>}
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
                  className={`pointer-events-none absolute border-2 rounded-xl ${
                    sig?.lookingAtScreen ? "border-emerald-400" : "border-amber-400"
                  }`}
                  style={{
                    left: `${(1 - box.x - box.w) * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.w * 100}%`,
                    height: `${box.h * 100}%`,
                  }}
                >
                  <span
                    className={`absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-3 py-1 text-xs font-bold shadow-md ${
                      sig?.lookingAtScreen
                        ? "bg-emerald-500 text-black"
                        : "bg-amber-500 text-black"
                    }`}
                  >
                    {sig?.lookingAtScreen ? "FOCUSED" : "LOOKING AWAY"} • {attPct}%
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute right-3 top-3 rounded bg-black/70 px-2.5 py-1 text-[10px] text-emerald-300">
              ● LIVE
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10">
        <Signal label="Attention" value={`${attPct}%`} icon={<Activity className="h-4 w-4" />} />
        <Signal label="Gaze" value={present && sig ? gazeLabel(sig) : "—"} icon={<ScanFace className="h-4 w-4" />} />
        <Signal label="Yaw" value={present && sig ? `${sig.yaw}°` : "—"} icon={<ScanFace className="h-4 w-4" />} />
        <Signal label="Pitch" value={present && sig ? `${sig.pitch}°` : "—"} icon={<ScanFace className="h-4 w-4" />} />
      </div>

      <div className="p-3 border-t border-white/10 text-[10px] text-zinc-500 flex items-center justify-between">
        <span>On-device • MediaPipe Face Landmarker • No data stored</span>
        {cameraActive && (
          <Button variant="ghost" size="sm" onClick={stop}>
            <CameraOff className="h-3.5 w-3.5 mr-1" /> Stop
          </Button>
        )}
      </div>
    </Card>
  );
}

function Signal({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center py-3 text-center">
      <div className="text-zinc-400 mb-1">{icon}</div>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-base font-semibold text-white mt-0.5">{value}</div>
    </div>
  );
}

function gazeLabel(s: FaceSignals): string {
  const ax = Math.abs(s.gazeX);
  const ay = Math.abs(s.gazeY);
  if (ax < 0.25 && ay < 0.25) return "Center";
  if (ax > ay) return s.gazeX > 0 ? "Right" : "Left";
  return s.gazeY > 0 ? "Down" : "Up";
}
