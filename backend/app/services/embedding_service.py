"""
CLIP embedding service.

Responsibility: turn product images (and free-text queries) into
512-dim CLIP vectors. These vectors are the semantic+visual signature
used for similarity search.

We lazy-load the model once (singleton) to avoid re-loading weights on
every request — important for latency and memory.
"""

from __future__ import annotations
import io
from functools import lru_cache

import numpy as np
from loguru import logger

from app.core.config import settings


@lru_cache
def _load_model():
    """Lazy singleton CLIP model + preprocess transform (open_clip)."""
    import torch  # imported lazily so the module loads without GPU libs
    import open_clip

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Loading CLIP model {settings.CLIP_MODEL} on {device}")
    # open_clip names: "ViT-B-32" with pretrained "laion2b_s34b_b79k"
    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-B-32", pretrained="laion2b_s34b_b79k", device=device)
    tokenizer = open_clip.get_tokenizer("ViT-B-32")
    return model, preprocess, tokenizer, device


class EmbeddingService:
    def embed_image(self, image_bytes: bytes) -> np.ndarray:
        """Encode an image to a normalized CLIP embedding."""
        import torch
        from PIL import Image

        model, preprocess, _tok, device = _load_model()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = preprocess(img).unsqueeze(0).to(device)
        with torch.no_grad():
            feats = model.encode_image(tensor)
        vec = feats.cpu().numpy()[0]
        return vec / (np.linalg.norm(vec) + 1e-8)

    def embed_text(self, text: str) -> np.ndarray:
        """Encode a text query (e.g. 'minimalist monochrome jacket')."""
        import torch

        model, _preprocess, tokenizer, device = _load_model()
        tokens = tokenizer([text]).to(device)
        with torch.no_grad():
            feats = model.encode_text(tokens)
        vec = feats.cpu().numpy()[0]
        return vec / (np.linalg.norm(vec) + 1e-8)


embedding_service = EmbeddingService()
