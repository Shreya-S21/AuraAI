// =============================================================
// API client — typed wrapper around the FastAPI backend.
// The demo runs fully client-side, but this is the exact contract
// the UI would use against the real backend (set VITE/NEXT API URL).
// =============================================================

const BASE =
  (import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_API_URL ?? "http://localhost:8000/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  listProducts: (params?: { category?: string; q?: string }) => {
    const qs = new URLSearchParams(
      Object.entries(params || {}).filter(([, v]) => v) as [string, string][],
    ).toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  recordEngagement: (body: unknown) =>
    request(`/engagement`, { method: "POST", body: JSON.stringify(body) }),
  analyzeFrame: (form: FormData) =>
    fetch(`${BASE}/engagement/frame`, { method: "POST", body: form }).then((r) =>
      r.json(),
    ),
  getRecommendations: (limit = 4) => request(`/recommendations?limit=${limit}`),
  analyticsSummary: () => request(`/analytics/summary`),
};
