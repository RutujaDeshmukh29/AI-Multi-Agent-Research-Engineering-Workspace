# 🚀 Complete Run Guide — AI Multi-Agent Workspace

---

## Prerequisites

| Tool | Required Version | Install |
|------|-----------------|---------|
| Python | 3.11+ | python.org |
| Node.js | 18+ | nodejs.org |
| PostgreSQL | via Supabase/Neon (free) | supabase.com or neon.tech |
| Groq API key | Free | console.groq.com |

---

## 1️⃣ Clone & Setup

```bash
git clone <your-repo-url>
cd ai-multi-agent-workspace
```

---

## 2️⃣ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate — Mac/Linux:
source venv/bin/activate
# Activate — Windows:
venv\Scripts\activate

# Install all dependencies
pip install -r requirements.txt
```

### Configure .env

```bash
# Edit backend/.env — fill in these values:
nano .env   # or open in VS Code
```

**Required values in `.env`:**
```
DATABASE_URL=postgresql+asyncpg://USER:PASS@HOST:PORT/DB
DATABASE_URL_SYNC=postgresql://USER:PASS@HOST:PORT/DB
JWT_SECRET_KEY=<run: python -c "import secrets; print(secrets.token_hex(32))">
GROQ_API_KEY=gsk_...
```

**Get Supabase DB URL:**
1. Go to supabase.com → New project
2. Settings → Database → Connection string → "URI" mode
3. Replace `[YOUR-PASSWORD]` with your DB password
4. Enable pgvector: Database → Extensions → search "vector" → enable

### Run Backend

```bash
cd backend

# Terminal 1 — Start FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**✅ Backend is working when you see:**
```
✅ Database ready
INFO: Uvicorn running on http://0.0.0.0:8000
```

---

## 3️⃣ Frontend Setup

```bash
# Terminal 2 — new terminal
cd frontend

# Install dependencies
npm install

# The .env.local is already created with:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start Next.js
npm run dev
```

**✅ Frontend is working when you see:**
```
✓ Ready in Xs
- Local: http://localhost:3000
```

---

## 4️⃣ Test Everything

### Quick health check:
```bash
# Backend alive?
curl http://localhost:8000/
curl http://localhost:8000/health

# See all API endpoints:
open http://localhost:8000/docs
```

### Test auth flow:
```bash
# Signup
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Rutuja","email":"test@test.com","password":"test1234"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'
```

### Test full UI flow:
1. Open `http://localhost:3000`
2. → Redirected to `/auth/login` (middleware working)
3. Sign up → redirected to `/dashboard`
4. Create a project
5. Click project → workspace opens
6. Type a message → 6 agents respond with SSE streaming
7. Ask to "build a project plan" → roadmap appears in right panel

---

## 5️⃣ Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| `pgvector extension not found` | Enable in Supabase: DB → Extensions → vector |
| `GROQ_API_KEY not set` | Get free key at console.groq.com |
| `Connection refused :8000` | Backend not running — check Terminal 1 |
| `401 Unauthorized` | Token expired — logout and login again |
| `CORS error` | Check `ALLOWED_ORIGINS=http://localhost:3000` in backend `.env` |
| `Module not found` | Run `npm install` in frontend folder |
| `Import error` | Run `pip install -r requirements.txt` in backend with venv active |

---

## 6️⃣ How Frontend ↔ Backend Connect

```
Browser (localhost:3000)
        │
        │  HTTP POST /api/auth/login  →  { email, password }
        │  Authorization: Bearer <token>  (every protected request)
        │  text/event-stream  (SSE for agent streaming)
        ▼
FastAPI (localhost:8000)
        │
        ├── Validates JWT token (no DB call needed)
        ├── Runs LangGraph agent pipeline
        ├── Queries PostgreSQL + pgvector
        └── Streams SSE events back to browser

Browser receives events:
  { type: "agent_update", agent: "research", status: "thinking" }
  { type: "agent_update", agent: "research", status: "done" }
  { type: "final", content: "...", agent_outputs: {...} }
  { type: "done", roadmap: {...} }
```

**Two servers, zero coupling:**
- Frontend only knows the backend URL (`NEXT_PUBLIC_API_URL`)
- Backend only knows the allowed frontend origins (`ALLOWED_ORIGINS`)
- They communicate purely via HTTP/SSE — nothing else

---

## 7️⃣ Production Deploy

**Backend → Render:**
```bash
# Push to GitHub → connect repo in Render
# Set env vars in Render dashboard (same as .env)
# render.yaml already configured
```

**Frontend → Vercel:**
```bash
cd frontend
npx vercel

# Set env var in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-backend.onrender.com
```
