"""
Recommendation service — combines behavioral signals + vector search.

Pipeline:
  1. Build a weighted "taste vector" from the user's engaged products
     (weight = engagement score, boosted by likes).
  2. Query FAISS for nearest products to that taste vector.
  3. Generate explainable reasons from shared tags / top category.

This layer is intentionally framework-agnostic so it can be reused by
REST endpoints, background jobs, or a future gRPC service.
"""

from __future__ import annotations
import numpy as np


class RecommendationService:
    def build_taste_vector(self, engaged: list[dict]) -> np.ndarray | None:
        """engaged = [{vector, weight}, ...] -> normalized taste vector."""
        if not engaged:
            return None
        dim = len(engaged[0]["vector"])
        acc = np.zeros(dim, dtype="float32")
        total = 0.0
        for e in engaged:
            w = max(e["weight"], 0)
            acc += np.asarray(e["vector"], dtype="float32") * w
            total += w
        if total == 0:
            return None
        return acc / total

    def explain(self, product_tags: list[str], top_tags: list[str],
                product_category: str, top_category: str | None,
                similarity: float) -> list[str]:
        reasons: list[str] = []
        shared = [t for t in product_tags if t in top_tags]
        if shared:
            reasons.append(
                f"Matches your engagement with {' & '.join(shared[:2])} pieces")
        if top_category and product_category == top_category:
            reasons.append(f"You spent the most time browsing {top_category}")
        if similarity > 0.9:
            reasons.append("High visual & semantic similarity (CLIP embedding)")
        if not reasons:
            reasons.append("Recommended to broaden your style profile")
        return reasons


recommendation_service = RecommendationService()
