<div align="center">

<img src="https://img.shields.io/badge/✦-AI%20Workspace-6366f1?style=for-the-badge&labelColor=0d0e16" alt="AI Workspace" />

# AI Multi-Agent Research & Engineering Workspace

**A production-grade collaborative AI system where 6 specialized agents work together in real-time to research, architect, plan, critique, and innovate — with persistent semantic memory that survives every deployment.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.5-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.1.0-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2.53-7c3aed?style=flat-square)](https://langchain-ai.github.io/langgraph/)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-f97316?style=flat-square)](https://groq.com)
[![PostgreSQL](https://img.shields.io/badge/pgvector-PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)](LICENSE)

<br/>

[**Live Demo**](https://your-app.vercel.app) 

</div>

---

## ⚡ What Makes This Different

This is **not another chatbot or PDF Q&A app.**

When you ask a question, 6 specialized AI agents collaborate in real-time — each with a distinct role, temperature setting, and system prompt. You watch them activate live. Their outputs are combined into one coherent, expert-level response.

```
You ask: "How do I build an AI-powered crop monitoring drone?"

🧠 QA Controller    → classifies intent, decides which agents to activate
🔍 Research Agent   → gathers multispectral sensors, ArduPilot, ROS2 concepts
⚙️ Engineering Agent → designs stack: RPi4 + YOLOv8 + FastAPI + TimescaleDB
🗺️ Planner Agent    → creates 5-phase roadmap with interactive checkboxes
🎯 Critic Agent     → flags battery life issues, GPS dependency, security gaps
💡 Innovation Agent → suggests edge AI on Coral TPU, regenerative descent

→ QA Controller synthesizes all outputs into one expert response
→ Interactive roadmap auto-generated with progress tracking
→ Session summarized → embedded → stored in pgvector for future recall
```

---

## 📸 Screenshots

> *Add your actual screenshots here after running the project*

| Dashboard | Workspace | Roadmap | Memory Panel |
|-----------|-----------|---------|--------------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Workspace](docs/screenshots/workspace.png) | ![Roadmap](docs/screenshots/roadmap.png) | ![Memory](docs/screenshots/memory.png) |

---

## 🤖 The 6 Agents

| Agent | Role | Temperature | When It Activates |
|-------|------|-------------|-------------------|
| 🧠 **QA Controller** | Intent classification + output synthesis. The conductor. Runs twice — before (routing) and after (combining). | 0.5 | Every query |
| 🔍 **Research Agent** | Concepts, technologies, resources. Forces concrete answers — no Wikipedia-level vagueness. | 0.4 | Research, how-to, explain questions |
| ⚙️ **Engineering Agent** | Architecture, tech stack tables, code patterns, deployment strategy. Opinionated — gives one best answer. | 0.3 | Build, implement, architecture questions |
| 🗺️ **Planner Agent** | Dual output: human roadmap text + structured JSON for the interactive checklist UI. | 0.4 | Plan, roadmap, project, build requests |
| 🎯 **Critic Agent** | Adversarial prompting. Reviews the Engineering output specifically — not generic hypotheticals. | 0.5 | Review, critique, audit, complex builds |
| 💡 **Innovation Agent** | Creative improvements. Higher temperature = explores less obvious ideas. | 0.7 | Improve, optimize, innovative requests |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Vercel)                         │
│  Next.js 15 · Framer Motion · Zustand · TanStack Query      │
└─────────────────────┬───────────────────────────────────────┘
                      │  HTTPS · Bearer JWT · SSE stream
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                FastAPI Backend (Render)                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              LangGraph State Machine                 │   │
│  │                                                      │   │
│  │  START → Classify → Dispatch Loop → Combine → END    │   │
│  │              ↓           ↓              ↓            │   │
│  │           [QA]    [R][E][P][C][I]     [QA]           │   │
│  │                                                      │   │
│  │  AgentState dict shared across all nodes             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Auth: JWT (HS256) · bcrypt · Refresh tokens                │
│  Streaming: SSE via StreamingResponse + ReadableStream      │
└──────┬──────────────────────────────────┬───────────────────┘
       │                                  │
       ▼                                  ▼
┌─────────────────┐              ┌────────────────────┐
│   PostgreSQL    │              │     Groq API       │
│   (Supabase)    │              │  Llama 3.3 70B     │
│                 │              │  500K tokens/min   │
│  users          │              │  Free tier         │
│  projects       │              └────────────────────┘
│  sessions       │
│  messages       │
│  user_memory    │  ← VECTOR(384) column
│  session_memory │    pgvector cosine search
│  voice_sessions │    replaces ChromaDB
│  roadmap_tasks  │    persists across deploys
└─────────────────┘
```

### Why pgvector instead of ChromaDB

| | ChromaDB | pgvector (this project) |
|--|----------|------------------------|
| Storage | Local disk | PostgreSQL cloud |
| Survives redeploy | ❌ Wiped every time | ✅ Forever |
| User login memory | ❌ Gone after restart | ✅ Always there |
| SQL joins | ❌ Impossible | ✅ Join with users/sessions |
| Infrastructure | Extra service to manage | Same DB connection |
| Production-ready | Prototypes only | Used by real SaaS |

---

## 🛠️ Full Tech Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.115.5 | Async web framework, SSE streaming, auto Swagger docs |
| `uvicorn[standard]` | 0.32.1 | ASGI server that runs FastAPI |
| `langgraph` | 0.2.53 | Multi-agent state machine orchestration |
| `langchain` | 0.3.9 | Agent prompt templates, chain utilities |
| `langchain-groq` | 0.2.1 | LangChain integration for Groq API |
| `groq` | 0.12.0 | Direct Groq API client (sync + async + streaming) |
| `sentence-transformers` | 3.3.1 | Text → 384-dim vector embeddings (all-MiniLM-L6-v2) |
| `pgvector` | 0.3.6 | SQLAlchemy integration for PostgreSQL vector columns |
| `sqlalchemy` | 2.0.36 | Async ORM — Python models ↔ PostgreSQL tables |
| `asyncpg` | 0.30.0 | Async PostgreSQL driver (non-blocking DB calls) |
| `alembic` | 1.14.0 | Database migration tracking (git for DB schema) |
| `python-jose[cryptography]` | 3.3.0 | JWT token creation and verification |
| `passlib[bcrypt]` | 1.7.4 | bcrypt password hashing |
| `pydantic-settings` | 2.6.1 | .env file loading with type validation |
| `structlog` | 24.4.0 | Structured logging with context |
| `gunicorn` | 23.0.0 | Production WSGI server (Render deploy) |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 15.1.0 | React framework, App Router, SSR, route protection |
| `framer-motion` | 11.x | Animations, page transitions, agent activity |
| `zustand` | 5.0.2 | Global state management (auth + workspace) |
| `@tanstack/react-query` | 5.x | Server state, caching, automatic cache invalidation |
| `axios` | 1.7.9 | HTTP client with JWT interceptors + auto-refresh |
| `react-markdown` | 9.x | Renders agent markdown responses with syntax highlighting |
| `tailwindcss` | 3.4.x | Utility-first CSS with custom design token system |
| `sonner` | 1.7.1 | Toast notifications |

### Infrastructure
| Service | Free Tier | Purpose |
|---------|-----------|---------|
| [Supabase](https://supabase.com) | 500MB DB, unlimited API | PostgreSQL + pgvector hosting |
| [Render](https://render.com) | 750 hrs/month | FastAPI backend hosting |
| [Vercel](https://vercel.com) | Unlimited deployments | Next.js frontend hosting |
| [Groq](https://console.groq.com) | 14,400 req/day | Llama 3.3 70B LLM inference |

---

## ✨ Complete Feature List

### 🤖 AI & Agents
- [x] 6-agent LangGraph orchestration with sequential dispatch loop
- [x] Intent classification — QA agent decides which 2–5 agents activate per query
- [x] Context passing — Critic and Innovation agents receive Engineering output
- [x] Groq Llama 3.3 70B — 10x faster than GPT-4, free tier
- [x] SSE streaming — agent activity visible in real-time as events arrive
- [x] Dual output from Planner — human text + structured JSON roadmap
- [x] Adversarial prompting — Critic agent specifically critiques your architecture
- [x] Per-agent temperature settings (0.3 for precision → 0.7 for creativity)

### 🧠 Memory System
- [x] **3-layer memory**: context window (RAM) → session memory (SSD) → pgvector (HDD)
- [x] Session memory — rolling 2-3 sentence LLM summary every 5 messages
- [x] User memory — session summaries embedded + stored in pgvector forever
- [x] Voice session memory — voice conversations auto-summarized and stored
- [x] Semantic search — `SELECT * FROM user_memory ORDER BY embedding <=> query LIMIT 5`
- [x] Memory injection — top 5 relevant memories in every system prompt
- [x] Memory browser — view, search, and delete memories from the UI

### 🗂️ Workspace
- [x] Projects with custom icons (10 choices) and colors (6 accents)
- [x] Multiple sessions per project (chat history)
- [x] Auto-title sessions from the first message content
- [x] Session rename via inline edit
- [x] Session delete with cascade (messages deleted too)
- [x] Full message history restoration on session open
- [x] Collapsible sidebar with project and session lists

### 🗺️ Roadmap & Planning
- [x] AI-generated project roadmaps with phases, goals, and weeks
- [x] Interactive checkbox tasks with priority (high/medium/low) + estimated hours
- [x] Real-time progress tracking — % updates instantly on checkbox click
- [x] Roadmap stored in PostgreSQL as individual task rows
- [x] "Generate Roadmap" prompt shortcut from empty roadmap panel

### 🎤 Voice
- [x] Voice input via Web Speech API (browser-native, zero cost)
- [x] Voice mode toggle per session
- [x] Voice sessions stored with full transcript
- [x] Auto-summarize voice session → stored in pgvector on session end
- [x] Voice chat history in sidebar with "memory stored" badges

### 🎨 UI / UX
- [x] Deep dark mode — `#080910` background, violet/emerald/amber agent accents
- [x] Live agent activity bar — chips animate from idle → thinking → done
- [x] Agent output accordions — expand any agent's full reasoning
- [x] Agent orchestration graph visualization — see the state machine running
- [x] `⌘K` command palette with keyboard navigation (↑↓ Enter Esc)
- [x] Export chat as `.md` download, copy to clipboard, or PDF via print dialog
- [x] Right panel with 3 tabs: Roadmap | Memory | Agent Graph
- [x] Profile modal with GitHub/Gmail connect + photo upload
- [x] Empty state with 4 suggested starter prompts
- [x] Markdown rendering with syntax-highlighted code blocks
- [x] Framer Motion animations — fade, slide, spring transitions throughout

### 🔐 Authentication
- [x] JWT access tokens (60 min) + refresh tokens (30 days)
- [x] bcrypt password hashing (12 rounds — brute-force resistant)
- [x] Cookie + localStorage dual storage (SSR middleware reads cookie)
- [x] Automatic token refresh via Axios response interceptor (transparent)
- [x] Session restore on page reload — user never sees login flash
- [x] Next.js middleware route protection — unauthenticated → `/auth/login`
- [x] Same error for wrong email + wrong password (prevents user enumeration)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Verify all requirements
python --version   # must be 3.11+
node --version     # must be 18+
npm --version      # must be 9+
git --version      # any version
```

You also need **3 free accounts** (5 minutes total):
- [Supabase](https://supabase.com) — PostgreSQL database
- [Groq](https://console.groq.com) — LLM API key
- [GitHub](https://github.com) — version control (already have one)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/yourusername/ai-multi-agent-workspace.git
cd ai-multi-agent-workspace
```

---

### Step 2 — Set up Supabase database

1. Go to [supabase.com](https://supabase.com) → New project
2. **Enable pgvector** — this is critical:
   ```
   Dashboard → Database → Extensions → search "vector" → Enable
   ```
3. Get your connection string:
   ```
   Settings → Database → Connection string → URI mode → Copy
   ```
   It looks like: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

---

### Step 3 — Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate — Mac/Linux:
source venv/bin/activate
# Activate — Windows:
venv\Scripts\activate

# Install all dependencies (~3-5 minutes, downloads ML models)
pip install --upgrade pip
pip install -r requirements.txt

# --- Database Migrations (CRITICAL) ---
# Run these commands to manage your database schema.
# Ensure your virtual environment is activated before running Alembic commands.

# 1. Generate a new migration script (only when models.py changes):
#    Mac/Linux: `source venv/bin/activate && alembic revision --autogenerate -m "Descriptive message"`
#    Windows: `.\venv\Scripts\Activate.ps1; alembic revision --autogenerate -m "Descriptive message"`

# 2. Apply all pending migrations to your database (after generating or on new setup):
#    Mac/Linux: `source venv/bin/activate && alembic upgrade head`
#    Windows: `.\venv\Scripts\Activate.ps1; alembic upgrade head`

# Example for adding preferences to user (if you just cloned and this is your first migration):
# Mac/Linux: source venv/bin/activate && alembic revision --autogenerate -m "Add preferences to user"
# Mac/Linux: source venv/bin/activate && alembic upgrade head
# Windows: .\venv\Scripts\Activate.ps1; alembic revision --autogenerate -m "Add preferences to user"
# Windows: .\venv\Scripts\Activate.ps1; alembic upgrade head
```

**Configure your environment:**

```bash
# Copy the example and fill in your values
cp .env.example .env
```

Open `backend/.env` and fill in these 4 required values:

```env
# From Supabase → Settings → Database → Connection string
# Add +asyncpg after postgresql for the async version
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
DATABASE_URL_SYNC=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

# Generate with:  python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=your_64_char_hex_string_here

# Get free key from console.groq.com → API Keys
GROQ_API_KEY=gsk_your_key_here
```

**Start the backend:**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ **Success looks like:**
```
🚀 Starting AI Multi-Agent Workspace version=1.0.0
✅ pgvector extension enabled
✅ Tables created/verified
✅ Database ready
INFO: Uvicorn running on http://0.0.0.0:8000
```

---

### Step 4 — Frontend setup

Open a **new terminal** (keep backend running):

```bash
cd frontend

# Install dependencies
npm install

# The .env.local file already has the correct default:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

✅ **Success looks like:**
```
▲ Next.js 15.1.0
- Local: http://localhost:3000
✓ Ready in 2.1s
```

---

### Step 5 — Open and test

```
Browser → http://localhost:3000
         → Sign up with any email
         → Create a project
         → Type: "How do I build an AI crop monitoring drone?"
         → Watch all 6 agents activate in the status bar
         → See response stream in with agent breakdowns
         → Type: "Create a full project roadmap"
         → Click Roadmap (top right) → check off tasks
```

---

## 🧪 API Testing

**Quick health check:**
```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy","database":"connected","memory":"pgvector"}
```

**Interactive Swagger UI:**
```
http://localhost:8000/docs
```
Every endpoint is documented and testable directly in the browser — no Postman needed.

**Test auth flow:**
```bash
# 1. Create account
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Rutuja","email":"test@example.com","password":"test1234"}'

# Returns: {"access_token":"eyJ...","refresh_token":"eyJ...","token_type":"bearer"}

# 2. Get your profile (replace TOKEN with access_token from above)
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Returns: {"id":"uuid...","name":"Rutuja","email":"test@example.com",...}

# 3. Create a project
curl -X POST http://localhost:8000/api/projects/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"My AI Project","icon":"🤖","color":"#6366f1"}'
```

**Test the full agent pipeline (SSE stream):**
```bash
# Get session_id and project_id from the project creation step above
curl -X POST http://localhost:8000/api/chat/stream \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Build an AI system","session_id":"SESSION_ID","project_id":"PROJECT_ID"}'

# You'll see SSE events stream in:
# data: {"type":"agent_update","agent":"qa","status":"thinking",...}
# data: {"type":"agent_update","agent":"research","status":"done",...}
# data: {"type":"final","content":"...full response...","agent_outputs":{...}}
# data: {"type":"done","roadmap":null}
```

---

## 📁 Project Structure

```
ai-multi-agent-workspace/
│
├── 📄 README.md                          ← You are here
├── 📄 COMMANDS.md                        ← Complete run guide
├── 📄 render.yaml                        ← Render deploy config
├── 📄 .gitignore
│
├── 🐍 backend/                           ← FastAPI application
│   ├── .env.example                      ← Copy to .env and fill in
│   ├── requirements.txt                  ← All Python packages
│   ├── alembic.ini                       ← DB migration config
│   ├── alembic/
│   │   ├── env.py                        ← Alembic → SQLAlchemy connection
│   │   └── versions/                     ← Auto-generated migration files
│   └── app/
│       ├── ⭐ main.py                    ← Entry point, all routers mounted
│       ├── config.py                     ← All env vars (Pydantic Settings)
│       │
│       ├── agents/                       ← 6 AI agents
│       │   ├── qa_agent.py              ← Intent classify + output combiner
│       │   ├── research_agent.py        ← Concept research, temp 0.4
│       │   ├── engineering_agent.py     ← Architecture + stack, temp 0.3
│       │   ├── planner_agent.py         ← Roadmap text + JSON, temp 0.4
│       │   ├── critic_agent.py          ← Adversarial review, temp 0.5
│       │   └── innovation_agent.py      ← Creative ideas, temp 0.7
│       │
│       ├── workflows/
│       │   ├── ⭐ langgraph_flow.py     ← LangGraph state machine (the brain)
│       │   └── routing.py               ← Intent → agent routing logic
│       │
│       ├── memory/
│       │   ├── session_memory.py        ← Rolling summary every 5 messages
│       │   └── user_memory.py           ← pgvector cross-session memory
│       │
│       ├── database/
│       │   ├── models.py                ← 9 SQLAlchemy models + VECTOR(384)
│       │   ├── db.py                    ← Async engine, session factory, init_db
│       │   └── crud.py                  ← All DB query functions
│       │
│       ├── auth/
│       │   ├── jwt_handler.py           ← JWT create/verify + bcrypt
│       │   ├── auth_routes.py           ← /signup /login /refresh /me
│       │   └── dependencies.py          ← get_current_user FastAPI dependency
│       │
│       ├── routes/
│       │   ├── ⭐ chat_routes.py        ← SSE streaming + roadmap CRUD
│       │   ├── project_routes.py        ← Projects + sessions CRUD
│       │   ├── user_routes.py           ← Profile + memory endpoints
│       │   └── voice_routes.py          ← Voice session management
│       │
│       └── services/
│           ├── groq_service.py          ← Groq sync/async/streaming/JSON calls
│           ├── embeddings.py            ← Sentence-transformers + pgvector search
│           └── web_search.py            ← Optional Serper API web search
│
└── ⚛️ frontend/                          ← Next.js 15 App Router
    ├── middleware.ts                     ← ⭐ SSR route protection
    ├── package.json                      ← All npm packages
    ├── tailwind.config.ts               ← Design tokens + agent colors
    ├── tsconfig.json                     ← TypeScript + path aliases (@/)
    ├── .env.local                        ← NEXT_PUBLIC_API_URL
    │
    ├── app/
    │   ├── layout.tsx                   ← Root layout, fonts, metadata
    │   ├── providers.tsx                ← QueryClient + session restore
    │   ├── page.tsx                     ← Root → redirect to /dashboard
    │   ├── auth/
    │   │   ├── login/page.tsx           ← Login form
    │   │   └── signup/page.tsx          ← Signup form
    │   ├── dashboard/page.tsx           ← Projects grid + create modal
    │   └── workspace/[id]/
    │       └── ⭐ page.tsx              ← MAIN workspace page (everything here)
    │
    ├── components/
    │   ├── agents/
    │   │   ├── AgentActivityFeed.tsx    ← Live status pills in top bar
    │   │   ├── AgentOrchestrationGraph.tsx ← Visual state machine diagram
    │   │   └── ThinkingIndicator.tsx    ← Animated thinking dots
    │   ├── export/
    │   │   └── ExportChat.tsx           ← .md download + PDF print
    │   ├── roadmap/
    │   │   └── RoadmapPanel.tsx         ← Interactive checklist + progress
    │   ├── ui/
    │   │   └── CommandPalette.tsx       ← ⌘K palette + keyboard nav
    │   └── workspace/
    │       ├── MemoryPanel.tsx          ← Semantic memory browser
    │       └── ProfileModal.tsx         ← Profile + GitHub/Gmail connect
    │
    ├── hooks/
    │   ├── useAuth.ts                   ← Login/signup/logout + cookie sync
    │   ├── ⭐ useChat.ts               ← SSE stream reader → UI state
    │   └── useProjects.ts              ← TanStack Query CRUD hooks
    │
    ├── services/
    │   ├── api.ts                       ← Axios + JWT auto-refresh interceptor
    │   ├── authService.ts               ← Auth API calls
    │   ├── chatService.ts               ← SSE stream + roadmap API
    │   └── projectService.ts            ← Projects/sessions API
    │
    ├── store/
    │   ├── authStore.ts                 ← Zustand: user, tokens, isAuthenticated
    │   └── workspaceStore.ts            ← Zustand: workspace/chat/streaming
    │
    ├── types/index.ts                   ← All TypeScript types (single source)
    ├── lib/utils.ts                     ← cn() helper + AGENT_CONFIG map
    └── styles/globals.css               ← CSS variables + dark mode tokens
```

---

## 🔄 How One Message Flows Through the Entire System

```
1. User presses Enter
   └─ workspace/[id]/page.tsx → handleSend()
      └─ Message added to local state immediately (optimistic UI)

2. useChat.ts opens SSE connection
   └─ fetch('POST /api/chat/stream', { message, session_id, project_id })
      └─ Authorization: Bearer <token> header attached by Axios

3. FastAPI auth check
   └─ get_current_user dependency
      └─ Verify JWT signature (no DB query — pure cryptography)
         └─ Load last 10 messages from PostgreSQL

4. pgvector memory retrieval
   └─ Embed message → 384 numbers via sentence-transformers
      └─ SELECT * FROM user_memory ORDER BY embedding <=> query LIMIT 5
         └─ Top 5 relevant past memories formatted into system prompt

5. LangGraph pipeline
   └─ node_classify: QA agent → which agents? requires roadmap?
      └─ node_dispatch loop: run each agent, write to AgentState
         └─ node_combine: QA agent synthesizes all outputs

6. SSE events stream to browser
   └─ {"type":"agent_update","agent":"research","status":"thinking"}
      └─ Frontend: agent chip turns violet + pulses
   └─ {"type":"agent_update","agent":"research","status":"done"}
      └─ Frontend: agent chip turns emerald
   └─ {"type":"final","content":"...","agent_outputs":{...},"roadmap":{...}}
      └─ Frontend: message bubble renders with markdown

7. Database + memory update
   └─ Save assistant message + agent_outputs to messages table
      └─ Update session_memory (rolling summary)
         └─ Every 10 messages: embed summary → INSERT INTO user_memory
            └─ TanStack Query cache invalidated → sidebar refreshes
```

---

## 🧠 Memory Architecture Deep Dive

```
Layer 1: Context Window (RAM equivalent)
├── What:     Raw messages list sent to Groq API every call
├── Where:    Python list in memory
├── Size:     Last 10 messages (keeps token count manageable)
├── Survives: Process restart? NO
└── Code:     session_memory.py → build_context_for_llm()

Layer 2: Session Memory (SSD equivalent)
├── What:     LLM-generated 2-3 sentence summary of older messages
├── Where:    session_memory table in PostgreSQL
├── Updated:  Every 5 messages
├── Survives: Server restart? YES
└── Purpose:  100-message conversations without hitting token limits

Layer 3: User Memory (Hard drive equivalent)
├── What:     Vector embeddings of session summaries
├── Where:    user_memory table — VECTOR(384) pgvector column
├── Updated:  When session ends OR every 10 messages
├── Survives: Redeploy? YES — permanently in cloud PostgreSQL
└── Retrieval: Cosine similarity search → top 5 injected into every prompt
```

---

## 🌐 Deployment Guide

### Backend → Render

1. **Push to GitHub** (if not already done):
   ```bash
   git add . && git commit -m "deploy" && git push origin main
   ```

2. **Create Render service:**
   - [render.com](https://render.com) → New → Web Service
   - Connect your GitHub repo
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. **Add environment variables** in Render dashboard → Environment tab:
   ```
   ENVIRONMENT         = production
   DEBUG               = False
   DATABASE_URL        = postgresql+asyncpg://... (Supabase)
   DATABASE_URL_SYNC   = postgresql://... (Supabase)
   JWT_SECRET_KEY      = (generate fresh one for production)
   GROQ_API_KEY        = gsk_...
   ALLOWED_ORIGINS     = https://your-app.vercel.app
   ```

4. Deploy → wait 3-5 minutes → copy your URL: `https://your-backend.onrender.com`

### Frontend → Vercel

```bash
cd frontend
npx vercel
# Follow prompts — link to new project, framework: Next.js
```

Then in Vercel dashboard → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL = https://your-backend.onrender.com
```

Redeploy → visit your live app.

### Database → Supabase

Tables are created **automatically** on first backend startup via `init_db()`.
No manual SQL needed. Just enable pgvector and provide the connection string.

> ⚠️ **Render free tier** spins down after 15 min inactivity. First request takes 30-45s (cold start). Upgrade to the $7/month Starter plan before any important demos.

---

## 🐛 Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `could not translate host name` | Wrong DATABASE_URL | Re-copy from Supabase → Settings → Database → URI |
| `extension "vector" does not exist` | pgvector not enabled | Supabase → Database → Extensions → enable "vector" |
| `AuthenticationError 401` from Groq | Invalid/missing API key | Regenerate at console.groq.com → update GROQ_API_KEY |
| `ModuleNotFoundError: No module named 'fastapi'` | venv not activated | Run `source venv/bin/activate` first |
| `CORS policy error` in browser | Wrong ALLOWED_ORIGINS | Set `ALLOWED_ORIGINS=http://localhost:3000` in .env |
| Frontend redirects loop | Cookie not set | Clear localhost cookies, sign in fresh |
| Backend hangs on first start (~30s) | Downloading ML model | Normal — sentence-transformers model caches after first run |
| `LangGraph silently fails` | Conditional edge returns list | `should_continue()` must return a string, not a list |

---

## 📊 Database Schema

```
users
 ├── id (UUID PK)
 ├── email, name, hashed_password
 ├── preferences (JSONB)
 │
 ├──→ projects
 │      ├── id, name, description, icon, color
 │      └──→ sessions
 │             ├── id, title, mode (text/voice)
 │             ├──→ messages
 │             │      ├── role, content, agent_outputs (JSONB)
 │             │      └── input_mode (text/voice)
 │             └──→ session_memory
 │                    ├── summary, context (JSONB)
 │                    └── topics (JSONB)
 │
 ├──→ user_memory                    ← pgvector
 │      ├── content (TEXT)
 │      ├── embedding (VECTOR 384)   ← cosine similarity search
 │      ├── memory_type              ← session_summary / voice_summary / preference
 │      └── metadata (JSONB)
 │
 ├──→ voice_sessions
 │      ├── full_transcript, summary
 │      └──→ voice_messages
 │
 └──→ project_roadmaps
        ├── phases_json (JSONB)
        ├── progress_percent
        └──→ roadmap_tasks
               ├── title, description, priority
               ├── estimated_hours, tags (JSONB)
               └── completed, completed_at
```

---

## 🔑 Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL async URL — `postgresql+asyncpg://...` |
| `DATABASE_URL_SYNC` | ✅ | PostgreSQL sync URL — `postgresql://...` (Alembic) |
| `JWT_SECRET_KEY` | ✅ | 64-char hex string. Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GROQ_API_KEY` | ✅ | From console.groq.com. Starts with `gsk_` |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated. e.g. `http://localhost:3000,https://app.vercel.app` |
| `DEBUG` | ⚠️ | `True` for dev (enables Swagger). `False` for production |
| `GROQ_MODEL` | Optional | Default: `llama-3.3-70b-versatile` |
| `EMBEDDING_MODEL` | Optional | Default: `all-MiniLM-L6-v2` |
| `SERPER_API_KEY` | Optional | Web search for Research Agent (serper.dev) |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend URL. `http://localhost:8000` locally, Render URL in prod |

---

## 🤝 Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes with clear commit messages
4. Test both backend and frontend locally
5. Submit a pull request with a description of what changed and why

### Development commands

```bash
# Backend — format and lint
cd backend && source venv/bin/activate
black app/                    # format Python code
ruff check app/               # lint Python code
pytest                        # run tests

# Frontend — type check and lint
cd frontend
npm run type-check            # TypeScript type checking
npm run lint                  # ESLint
npm run build                 # Production build test
```

---

## 👩‍💻 Built by Rutuja

**AI Engineer** building production-grade AI systems.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077b5?style=flat-square&logo=linkedin)](www.linkedin.com/in/rutuja-deshmukh29)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat-square&logo=github)](https://github.com/RutujaDeshmukh29)

**Stack:** Python · FastAPI · LangGraph · Next.js 15 · pgvector · Groq · Framer Motion · TanStack Query · Zustand

---

<div align="center">

**If this project helped you, please ⭐ star the repository.**

It helps others discover it and motivates continued development.

</div>