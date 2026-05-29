import { useEffect } from "react";
import { useSession } from "../context/SessionContext";

// Records a "view" on mount and continuously accrues dwell time
// (gated by tab visibility) into the engagement engine.
export function useDwell(productId: string | undefined) {
  const { recordView, recordDwell } = useSession();

  useEffect(() => {
    if (!productId) return;
    recordView(productId);
    let last = Date.now();
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        recordDwell(productId, now - last);
        last = now;
      } else {
        last = Date.now();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [productId, recordView, recordDwell]);
}
