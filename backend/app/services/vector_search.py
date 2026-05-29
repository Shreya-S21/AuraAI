"""
FAISS vector similarity search service.

Architecture decision: FAISS holds an in-memory index of all product
embeddings for sub-millisecond nearest-neighbour search. We use an
inner-product index on L2-normalized vectors == cosine similarity.

The index id->product_id mapping is kept alongside so we can resolve
hits back to catalog rows. On startup we hydrate the index from the
`embeddings` table (Postgres = source of truth).
"""

from __future__ import annotations
import os
import numpy as np
from loguru import logger

from app.core.config import settings


class VectorSearchService:
    def __init__(self) -> None:
        self._index = None
        self._ids: list[str] = []

    def build(self, ids: list[str], vectors: np.ndarray) -> None:
        """(Re)build the FAISS index from product vectors."""
        import faiss

        dim = vectors.shape[1]
        index = faiss.IndexFlatIP(dim)  # inner product == cosine on unit vectors
        faiss.normalize_L2(vectors)
        index.add(vectors.astype("float32"))
        self._index = index
        self._ids = ids
        logger.info(f"FAISS index built with {len(ids)} vectors (dim={dim})")

    @property
    def is_ready(self) -> bool:
        """True only when the index actually contains vectors."""
        return self._index is not None and len(self._ids) > 0

    def search(self, query: np.ndarray, k: int = 8) -> list[tuple[str, float]]:
        """Return [(product_id, similarity), ...] sorted by similarity."""
        import faiss

        if self._index is None:
            return []
        q = query.astype("float32").reshape(1, -1)
        faiss.normalize_L2(q)
        scores, idxs = self._index.search(q, k)
        out: list[tuple[str, float]] = []
        for score, idx in zip(scores[0], idxs[0]):
            if idx == -1:
                continue
            out.append((self._ids[idx], float(score)))
        return out

    def persist(self) -> None:
        import faiss
        if self._index is None:
            return
        os.makedirs(os.path.dirname(settings.FAISS_INDEX_PATH), exist_ok=True)
        faiss.write_index(self._index, settings.FAISS_INDEX_PATH)


vector_search = VectorSearchService()
