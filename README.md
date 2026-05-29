# 🌌 AuraAI — Behavioral Recommendation Intelligence

> A real-time, multimodal recommendation platform that analyzes how you
> **engage** with products (attention, dwell, browsing behavior) and surfaces
> **visually & semantically similar** items using CLIP embeddings + FAISS vector search.
>
> **Behavioral engagement analysis — _not_ emotion detection.** All webcam
> frames are processed and only numeric attention signals are derived.

![Stack](https://img.shields.io/badge/Frontend-Next.js%2014%20%7C%20TS%20%7C%20Tailwind-7c3aed)
![Stack](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Async%20%7C%20PostgreSQL-0ea5e9)
![Stack](https://img.shields.io/badge/AI-CLIP%20%7C%20FAISS%20%7C%20MediaPipe%20%7C%20OpenCV-22c55e)

---

## ✨ Features

| Module | What it does |
| --- | --- |
| 🛍️ **Product Browsing** | Ecommerce grid, detail drawer, categories, search, smooth Framer Motion animations, recommendation carousel |
| 🎥 **Engagement Tracker** | Real webcam capture + on-device attention/pose estimation (MediaPipe + OpenCV head-pose) |
| 📊 **Behavioral Analytics** | Engagement, attention & affinity scores, interaction heatmap, revisit frequency |
| 🧠 **AI Recommendations** | CLIP embeddings → weighted taste vector → FAISS nearest-neighbour search |
| 💡 **Explainable AI** | Plain-English reasons (“You spent more time viewing minimalist streetwear…”) |
| 🧬 **Style Memory** | Aesthetic signature, saved items, engagement history |
| 📈 **Analytics Dashboard** | KPIs, top-engaged bar chart, category radar, session timeline, heatmap, rec performance |

---

## 🏗️ Architecture

```
                      ┌─────────────────────────────────────────────┐
                      │                FRONTEND (Vercel)             │
                      │   Next.js 14 · TypeScript · Tailwind ·       │
                      │   shadcn/ui · Framer Motion · Recharts       │
                      │                                              │
                      │  Browse │ Dashboard │ Style Memory           │
                      │  Webcam Engagement Tracker (getUserMedia)    │
                      └───────────────┬──────────────────────────────┘
                                      │  REST  /api/v1  (JWT: Clerk/Auth0)
                                      ▼
        ┌──────────────────────────────────────────────────────────────┐
        │                    BACKEND (Railway · Docker)                  │
        │                         FastAPI (async)                        │
        │                                                                │
        │  api/v1/  ─ products · engagement · recommendations · analytics│
        │  core/    ─ config · database · security · logging             │
        │  middleware ─ request id + latency logging                     │
        │                                                                │
        │  services/ (modular AI layer)                                  │
        │    • embedding_service   → CLIP (ViT-B/32) image+text vectors  │
        │    • vector_search       → FAISS IndexFlatIP (cosine)          │
        │    • engagement_service  → MediaPipe FaceMesh + OpenCV pose    │
        │    • recommendation_svc  → taste vector + explainability       │
        └───────────────┬───────────────────────────┬──────────────────┘
                        │                            │
                        ▼                            ▼
              ┌───────────────────┐        ┌────────────────────┐
              │   PostgreSQL      │        │   FAISS Index      │
              │ users·products·   │        │ (in-memory, hot    │
              │ embeddings·       │        │  path for search,  │
              │ sessions·events·  │        │  hydrated from DB) │
              │ recommendations·  │        └────────────────────┘
              │ interaction_hist  │
              └───────────────────┘
```

**Why this design?**
- **Routers / services / models separation** keeps endpoints thin and AI logic reusable.
- **Async everywhere** (asyncpg + SQLAlchemy 2.0) so I/O never blocks the event loop.
- **FAISS in memory, Postgres as source of truth** → millisecond search + durable storage.
- **API versioning (`/api/v1`)** allows breaking changes without disrupting clients.

---

## 📁 Folder Structure

```
auraai/
├── README.md
├── docker-compose.yml            # Postgres + backend for local dev
├── .env.example                  # frontend env
│
├── src/                          # FRONTEND (this live demo)
│   ├── App.tsx                   # shell + routing + product drawer
│   ├── context/SessionContext.tsx# global behavioral session state
│   ├── lib/
│   │   ├── engagement.ts         # scoring + recommendation engine (client mirror)
│   │   └── api.ts                # typed FastAPI client
│   ├── hooks/useDwell.ts
│   ├── data/products.ts          # sample catalog + embeddings + cosine sim
│   ├── components/               # ui, ProductCard, EngagementTracker, ...
│   └── pages/                    # Browse, Dashboard, Profile
│
└── backend/                      # BACKEND (FastAPI)
    ├── Dockerfile
    ├── requirements.txt
    ├── .env.example
    ├── scripts/seed.py           # create tables + seed products/embeddings
    └── app/
        ├── main.py               # app factory, CORS, middleware, lifespan
        ├── middleware.py
        ├── core/                 # config, database, security, logging
        ├── models/models.py      # SQLAlchemy ORM == DB schema
        ├── schemas/schemas.py    # Pydantic DTOs
        ├── services/             # CLIP, FAISS, engagement CV, recommender
        └── api/v1/               # products, engagement, recommendations, analytics
```

---

## 🚀 Quick Start

### 1. Frontend (this demo)
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build (single-file dist/index.html)
```
> The demo is **fully functional client-side** — enable your camera on the
> Browse page to see real-time attention scoring, browse products to train
> the recommender, then open **Analytics** and **Style Memory**.

### 2. Backend
```bash
cd backend
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.seed              # create tables + seed data
uvicorn app.main:app --reload       # http://localhost:8000/docs
```

### 3. Full stack with Docker
```bash
cp backend/.env.example backend/.env
docker compose up --build
# backend  -> http://localhost:8000/docs
# postgres -> localhost:5432  (aura/aura)
```

---

## 🔐 Authentication (Firebase)

AuraAI uses **Firebase Authentication** for Google, GitHub, and email/password
sign-in. If no keys are present it falls back to a built-in local demo auth, so
the app always runs.

> **Note:** Firebase **web API keys are not secrets** — they're meant to live in
> client code. Security comes from *Authorized Domains* + security rules, not key
> secrecy. Still, keep them in `.env` (git-ignored) and set them in your host's
> dashboard for clean dev/prod separation.

**Enable real auth:**
1. Create a project at <https://console.firebase.google.com>.
2. **Build → Authentication → Get started** → enable **Email/Password**,
   **Google**, and **GitHub**.
3. **Project settings → Your apps → Web app** → copy the config.
4. Create `.env` in the project root:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_APP_ID=...
   ```
5. Restart `npm run dev`. The login screen badge turns green: *Connected to
   Firebase Authentication*.

**GitHub provider** also needs a GitHub OAuth App whose callback URL matches the
one Firebase shows (`https://<project>.firebaseapp.com/__/auth/handler`).

---

## 🚢 Deploy to Netlify (recommended order)

```
1) VS Code   → npm install && npm run dev   (confirm it runs)
2) GitHub    → push the repo
3) Netlify   → connect repo & deploy
4) Firebase  → add keys + authorized domain (do this last)
```

1. **Push to GitHub.** `.env` is git-ignored — your keys won't be committed.
2. **Netlify → Add new site → Import from Git.** Settings are auto-detected from
   `netlify.toml` (`build: npm run build`, `publish: dist`, SPA redirects).
3. **Netlify → Site settings → Environment variables** — add the same
   `VITE_FIREBASE_*` values from your `.env`, then trigger a redeploy.
4. **Firebase → Authentication → Settings → Authorized domains** — add your
   Netlify domain (e.g. `your-site.netlify.app`).

> ⚠️ The webcam (MediaPipe) requires **HTTPS** — Netlify provides this
> automatically. It will not work over plain `http://` LAN addresses.

---

## 🗄️ Database Schema (PostgreSQL)

| Table | Key columns |
| --- | --- |
| `users` | `id`, `auth_subject`, `email` |
| `products` | `id`, `name`, `brand`, `category`, `price`, `tags` |
| `embeddings` | `product_id`, `vector` (CLIP, 512-d), `model` |
| `sessions` | `id`, `user_id`, `started_at`, `camera_enabled` |
| `engagement_events` | `session_id`, `product_id`, `dwell_ms`, `attention`, `pose_stability`, `engagement_score` |
| `recommendations` | `user_id`, `product_id`, `match_score`, `explanation` |
| `interaction_history` | `user_id`, `product_id`, `action` |

---

## 🔌 API Routes (`/api/v1`)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/products` | List/search/filter products |
| `GET` | `/products/{id}` | Product detail |
| `POST` | `/engagement` | Ingest a behavioral signal |
| `POST` | `/engagement/frame` | Analyze a webcam frame (head-pose/attention) |
| `GET` | `/recommendations` | Personalized recs + explanations |
| `GET` | `/analytics/summary` | Dashboard KPIs |
| `GET` | `/health` | Liveness probe |

Interactive docs: **`/docs`** (Swagger) and **`/redoc`**.

---

## 🤖 AI Pipeline

1. **Embed** each product image with CLIP `ViT-B/32` → 512-d unit vector.
2. **Index** vectors in FAISS `IndexFlatIP` (cosine via normalized inner product).
3. **Track** attention from webcam: MediaPipe FaceMesh → landmarks →
   OpenCV `solvePnP` head-pose → stability → attention proxy ∈ [0,1].
4. **Score** engagement = `0.45·dwell + 0.20·revisits + 0.35·attention`.
5. **Recommend**: build a weighted *taste vector* from engaged products,
   run FAISS search, then generate **explainable** reasons from shared tags.

> ⚠️ **Ethics:** AuraAI performs *behavioral engagement analysis*. It does
> **not** classify emotions. Frames are processed on-device in the demo and
> only numeric attention signals are persisted on the backend.

---

## ☁️ Deployment

### Frontend → Vercel
1. Import the repo, framework = **Next.js**.
2. Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
3. Deploy.

### Backend + DB → Railway
1. New project → **Deploy from Dockerfile** (`/backend`).
2. Add a **PostgreSQL** plugin; Railway injects `DATABASE_URL`
   (use the `postgresql+asyncpg://` scheme).
3. Set env vars from `backend/.env.example`.
4. Run the seed once: `python -m scripts.seed`.

---

## 🧰 Tech Stack

**Frontend:** Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · Recharts
**Backend:** FastAPI · SQLAlchemy 2 (async) · asyncpg · Pydantic · Loguru
**AI/CV:** OpenCV · MediaPipe · DeepFace · CLIP · FAISS · PyTorch
**Infra:** PostgreSQL · Docker · Vercel · Railway · Clerk/Auth0

---

## 📜 License
MIT — built as a portfolio-grade reference architecture.
