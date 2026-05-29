// =============================================================
// SessionContext — global behavioral session state.
// Mirrors the backend "session service": collects engagement
// signals, persists them, and exposes recommendation outputs.
// =============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_STATE,
  EngagementState,
  ProductSignal,
} from "../lib/engagement";

interface SessionContextValue {
  state: EngagementState;
  attention: number; // live webcam attention proxy 0..1
  setAttention: (a: number) => void;
  cameraActive: boolean;
  setCameraActive: (b: boolean) => void;
  recordView: (productId: string) => void;
  recordDwell: (productId: string, ms: number) => void;
  toggleLike: (productId: string) => void;
  resetSession: () => void;
  sessionStart: number;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const STORAGE_KEY = "auraai_session_v1";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EngagementState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as EngagementState) : EMPTY_STATE;
    } catch {
      return EMPTY_STATE;
    }
  });
  const [attention, setAttention] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const sessionStart = useRef(Date.now()).current;
  const attentionRef = useRef(0);

  useEffect(() => {
    attentionRef.current = attention;
  }, [attention]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }, [state]);

  const ensure = (s: EngagementState, id: string): ProductSignal => {
    return s.signals[id] ?? { productId: id, dwellMs: 0, views: 0, attention: 0 };
  };

  const recordView = useCallback((productId: string) => {
    setState((prev) => {
      const sig = ensure(prev, productId);
      return {
        ...prev,
        signals: {
          ...prev.signals,
          [productId]: { ...sig, views: sig.views + 1 },
        },
      };
    });
  }, []);

  const recordDwell = useCallback((productId: string, ms: number) => {
    setState((prev) => {
      const sig = ensure(prev, productId);
      // exponential moving average of attention while dwelling
      const live = attentionRef.current;
      const newAtt = sig.attention === 0 ? live : sig.attention * 0.7 + live * 0.3;
      return {
        ...prev,
        signals: {
          ...prev.signals,
          [productId]: {
            ...sig,
            dwellMs: sig.dwellMs + ms,
            attention: newAtt,
          },
        },
      };
    });
  }, []);

  const toggleLike = useCallback((productId: string) => {
    setState((prev) => ({
      ...prev,
      liked: { ...prev.liked, [productId]: !prev.liked[productId] },
    }));
  }, []);

  const resetSession = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  const value = useMemo(
    () => ({
      state,
      attention,
      setAttention,
      cameraActive,
      setCameraActive,
      recordView,
      recordDwell,
      toggleLike,
      resetSession,
      sessionStart,
    }),
    [state, attention, cameraActive, recordView, recordDwell, toggleLike, resetSession, sessionStart],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
