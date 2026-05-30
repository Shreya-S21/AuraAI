// Tiny shared holder for the latest face-mesh signals. EngagementTracker
// writes here every frame; other UI (like CalibrationOverlay) reads from
// it without tight coupling. Values are raw MediaPipe outputs — no mapping.

export interface LiveGaze {
  gazeX: number;   // -1..1 iris horizontal (MediaPipe native frame)
  gazeY: number;   // -1..1 iris vertical
  present: boolean;
  attention: number;
}

const state: LiveGaze = { gazeX: 0, gazeY: 0, present: false, attention: 0 };
const subs = new Set<() => void>();

export function writeLiveGaze(g: LiveGaze) {
  state.gazeX = g.gazeX;
  state.gazeY = g.gazeY;
  state.present = g.present;
  state.attention = g.attention;
  subs.forEach((fn) => fn());
}

export function readLiveGaze(): LiveGaze {
  return state;
}

export function subscribeLiveGaze(fn: () => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function resetLiveGaze() {
  state.gazeX = 0;
  state.gazeY = 0;
  state.present = false;
  state.attention = 0;
}
