# System Architecture

## Overview

```
┌─────────────────────────────────────────┐
│           Next.js Frontend              │
│           (Vercel)                      │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │ Auth UI  │  │  Workspace + Chat UI │ │
│  └──────────┘  └──────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │ HTTPS / SSE Streaming
                  ▼
┌─────────────────────────────────────────┐
│           FastAPI Backend               │
│           (Render / Railway)            │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │        LangGraph Engine         │    │ 
│  │  ┌──────┐  ┌────────┐           │    │
│  │  │  QA  │→ │Research│           │    │
│  │  └──────┘  └────────┘           │    │
│  │  ┌───────────┐  ┌──────────┐    │    │
│  │  │Engineering│  │Planner   │    │    │
│  │  └───────────┘  └──────────┘    │    │
│  │  ┌──────────┐  ┌─────────┐      │    │
│  │  │Innovation│  │ Critic  │      │    │
│  │  └──────────┘  └─────────┘      │    │
│  └─────────────────────────────────┘    │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┼────────────┐
    ▼          ▼            ▼
┌────────┐ ┌───────┐ ┌──────────┐
│  PG    │ │pgvect │ │  Groq    │
│  SQL   │ │  or   │ │  API     │
│(users) │ │(memory│ │(LLM)     │
└────────┘ └───────┘ └──────────┘
```

## Memory Architecture (pgvector replaces ChromaDB)

```
PostgreSQL + pgvector extension
│
├── users table          → User accounts
├── projects table       → Workspace projects
├── sessions table       → Chat sessions per project
├── messages table       → All messages with agent outputs
├── user_memory table    → Vector embeddings (persistent)
│     └── embedding VECTOR(384)  ← sentence-transformers output
│     └── content TEXT
│     └── metadata JSONB
└── session_memory table → Session context summaries
```

### Why pgvector over ChromaDB?

| | ChromaDB | pgvector |
|--|---------|----------|
| Persistence | Local disk only | PostgreSQL (cloud) |
| After redeploy | ❌ Lost | ✅ Persistent |
| User login memory | ❌ Broken | ✅ Works |
| Complexity | Extra service | Same DB connection |
| Production-ready | Limited | ✅ Yes |

## Agent Routing Logic

```
User Query
    ↓
QA Agent (intent classification)
    ↓
┌─── Is it a research question?   → Research Agent
├─── Is it an engineering question? → Engineering Agent
├─── Needs a plan/roadmap?        → Planner Agent
├─── Needs innovation ideas?      → Innovation Agent
└─── Needs critique/review?       → Critic Agent
    ↓
All activated agents run (parallel where possible)
    ↓
QA Agent combines outputs → Final Response
```

## Tech Stack Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| LLM | Groq | Fast inference, free tier |
| Orchestration | LangGraph | Stateful agents, not just chains |
| Vector DB | pgvector | Persistent, same DB, production-grade |
| Auth | JWT | Stateless, works with FastAPI |
| Frontend | Next.js | SSR, Vercel deploy, App Router |
| Streaming | SSE | Simple, works without WebSocket |
