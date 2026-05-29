# 🚀 AuraAI — Step-by-Step Deployment Guide

This guide walks you from zero to a fully deployed AuraAI stack.

---

## 0. Prerequisites
- Node 18+ and npm
- Python 3.11+
- Docker + Docker Compose (for the full local stack)
- Accounts: **Vercel**, **Railway**, **Clerk** (or Auth0)

---

## 1. Local development (fastest path)

### Frontend
```bash
npm install
npm run dev          # http://localhost:5173
```
The demo works standalone — no backend required to explore the UI,
webcam engagement tracking, recommendations, analytics, and style memory.

### Backend (optional, for real persistence + AI)
```bash
cd backend
cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.seed
uvicorn app.main:app --reload    # http://localhost:8000/docs
```

### Everything together (Docker)
```bash
cp backend/.env.example backend/.env
docker compose up --build
```

---

## 2. Configure Authentication (Clerk)
1. Create a Clerk application → copy the **Publishable** & **Secret** keys.
2. Frontend `.env`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
3. Backend `.env` (JWT verification):
   ```
   AUTH_ISSUER=https://<tenant>.clerk.accounts.dev
   AUTH_AUDIENCE=auraai-api
   AUTH_JWKS_URL=https://<tenant>.clerk.accounts.dev/.well-known/jwks.json
   ```

---

## 3. Deploy the Backend → Railway
1. **New Project → Deploy from GitHub repo** (root = `/backend`).
2. Railway auto-detects the **Dockerfile**.
3. **Add Plugin → PostgreSQL**. Copy its connection string and set:
   ```
   DATABASE_URL=postgresql+asyncpg://<user>:<pass>@<host>:<port>/<db>
   ```
   (note the `+asyncpg` driver).
4. Add all env vars from `backend/.env.example`.
5. Open a one-off shell and seed:
   ```bash
   python -m scripts.seed
   ```
6. Verify: `https://<your-app>.up.railway.app/health` → `{"status":"ok"}`.

---

## 4. Deploy the Frontend → Vercel
1. **Import Project** from GitHub.
2. Environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://<your-app>.up.railway.app/api/v1
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   ```
3. Deploy. Add your Vercel domain to the backend `ALLOWED_ORIGINS`.

---

## 5. Post-deploy checklist
- [ ] `/health` returns ok
- [ ] `/docs` Swagger loads
- [ ] Frontend loads catalog from `/api/v1/products`
- [ ] Camera permission prompt works over **HTTPS** (required by browsers)
- [ ] Recommendations update after browsing
- [ ] CORS allows the Vercel domain

---

## 6. Production hardening (next steps)
- Switch FAISS to `IndexIVFFlat` for large catalogs; persist to disk.
- Use `pgvector` if you want similarity search inside Postgres too.
- Add Alembic migrations (`alembic init`) instead of `create_all`.
- Add rate limiting + request size limits on `/engagement/frame`.
- Run CLIP embedding on a GPU worker / queue for batch ingestion.
```
