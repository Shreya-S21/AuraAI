"""
Seed script: create tables and populate sample products + embeddings,
then build the FAISS index.

Run:  python -m scripts.seed
In production you'd embed real product images via CLIP; here we use
deterministic synthetic vectors so the demo works without GPU weights.
"""

import asyncio
import numpy as np

from app.core.database import engine, SessionLocal, Base
from app.models.models import Product, Embedding

SAMPLE = [
    ("Monochrome Cargo Pants", "VOID Studios", "Streetwear", 128, 4.8, ["monochrome", "streetwear", "utility"]),
    ("Heavyweight Boxy Tee", "VOID Studios", "Streetwear", 64, 4.6, ["monochrome", "streetwear", "minimalist"]),
    ("Linen Structured Blazer", "Atelier Nord", "Minimalist", 240, 4.9, ["minimalist", "neutral", "tailored"]),
    ("Sculpted Wool Coat", "Atelier Nord", "Outerwear", 410, 4.9, ["minimalist", "premium", "tailored"]),
    ("Runner 0X Sneakers", "Kinetic", "Footwear", 185, 4.7, ["techwear", "monochrome", "performance"]),
    ("Quartz Field Watch", "Meridian", "Accessories", 320, 4.8, ["minimalist", "premium", "timeless"]),
]


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        for name, brand, cat, price, rating, tags in SAMPLE:
            p = Product(name=name, brand=brand, category=cat,
                        price=price, rating=rating, tags=tags)
            db.add(p)
            await db.flush()
            vec = np.random.RandomState(abs(hash(name)) % 2**32).rand(512).tolist()
            db.add(Embedding(product_id=p.id, vector=vec, model="ViT-B/32"))
        await db.commit()
    print("Seeded sample products + embeddings.")


if __name__ == "__main__":
    asyncio.run(main())
