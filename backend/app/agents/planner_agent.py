# ========================
# app/agents/planner_agent.py
# Project Planner Agent — Roadmaps, Milestones, Checklists
#
# CONCEPT: Structured Output for UI Rendering
# This agent returns TWO things:
# 1. A human-readable text response
# 2. A structured JSON roadmap that the frontend renders
#    as an interactive checklist with progress tracking
#
# The JSON structure drives the ProjectRoadmap UI component.
# ========================

from app.services.groq_service import call_groq, call_groq_json
import json
import structlog

logger = structlog.get_logger()

PLANNER_SYSTEM_PROMPT = """You are an expert Project Planner Agent in an AI engineering workspace.

Your job: Create actionable project roadmaps with concrete milestones and tasks.

Structure your response as:
## 🗺️ Project Roadmap

**Project Overview:**
[What we're building and why this plan makes sense]

**Phases:**

### Phase 1: [Name] (Week X-Y)
**Goal:** [What this phase achieves]
- [ ] Task 1 — [specific action]
- [ ] Task 2 — [specific action]
- [ ] Task 3 — [specific action]

### Phase 2: [Name] (Week X-Y)
...

**Success Metrics:**
- [How to know each phase is complete]

**Risks & Mitigations:**
- Risk: [X] → Mitigation: [Y]

Be realistic about timelines. Break tasks down small enough that each takes 1-4 hours."""

CHECKLIST_JSON_PROMPT = """You are a project planning assistant. Generate a structured project roadmap as JSON.

Return ONLY a JSON object with this exact structure:
{
  "project_title": "string",
  "total_phases": number,
  "estimated_weeks": number,
  "phases": [
    {
      "id": "phase_1",
      "name": "string",
      "goal": "string", 
      "week_start": number,
      "week_end": number,
      "color": "#hex",
      "tasks": [
        {
          "id": "task_1_1",
          "title": "string",
          "description": "string",
          "estimated_hours": number,
          "priority": "high|medium|low",
          "completed": false,
          "tags": ["string"]
        }
      ]
    }
  ]
}

Use these phase colors: Phase 1: #6366f1, Phase 2: #8b5cf6, Phase 3: #06b6d4, Phase 4: #10b981, Phase 5: #f59e0b
Keep tasks specific and actionable. 3-6 tasks per phase."""


def run_planner_agent(
    user_message: str,
    conversation_history: list[dict],
    user_memory_context: str = "",
) -> str:
    """
    Planner Agent — returns human-readable roadmap text.
    """
    context = f"\nUser context:\n{user_memory_context}" if user_memory_context else ""
    messages = conversation_history[-6:] + [
        {"role": "user", "content": f"{user_message}{context}"}
    ]

    try:
        result = call_groq(
            messages=messages,
            system_prompt=PLANNER_SYSTEM_PROMPT,
            max_tokens=1000,
            temperature=0.4,
        )
        logger.info("Planner agent completed", chars=len(result))
        return result
    except Exception as e:
        logger.error("Planner agent failed", error=str(e))
        return f"Planner agent error: {str(e)}"


def generate_roadmap_json(
    project_description: str,
    conversation_history: list[dict],
) -> dict | None:
    """
    Generate a structured JSON roadmap for the UI checklist.
    Called separately from run_planner_agent when:
    - intent.requires_roadmap = True
    - User explicitly asks for a plan/roadmap

    Returns dict ready to store in ProjectRoadmap table and render in UI.
    """
    messages = conversation_history[-4:] + [
        {"role": "user", "content": f"Create a detailed project roadmap for: {project_description}"}
    ]

    try:
        raw = call_groq_json(
            messages=messages,
            system_prompt=CHECKLIST_JSON_PROMPT,
            max_tokens=1500,
        )
        # Clean potential JSON fences
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        
        roadmap = json.loads(raw)
        logger.info("Roadmap JSON generated", phases=roadmap.get("total_phases"))
        return roadmap
    except Exception as e:
        logger.error("Roadmap JSON generation failed", error=str(e))
        return None
