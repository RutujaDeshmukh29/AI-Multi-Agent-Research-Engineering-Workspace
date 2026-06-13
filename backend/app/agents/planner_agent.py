from app.services.groq_service import call_groq_async
import json
import re
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

CHECKLIST_MARKDOWN_PROMPT = """You are a project planning assistant. Generate a structured project roadmap as a Markdown list.

**Rules:**
- Use "##" for phase names, including a week range like "(Weeks: 1-2)".
- Use "- [ ]" for each task.
- On the same line as the task, include metadata in the format: `(priority | Xh | tag1,tag2)`
- Do NOT include any other text, just the markdown list.

**Example Format:**

## Phase 1: Foundation (Weeks: 1-2)
- [ ] Setup project structure (high | 4h | setup,backend)
- [ ] Initialize database schema (high | 8h | database,backend)
- [ ] Implement user authentication API (medium | 12h | api,auth)

## Phase 2: Core Features (Weeks: 3-5)
- [ ] Implement post creation endpoint (high | 16h | api,feature)
- [ ] Build frontend for creating posts (medium | 24h | frontend,feature)
"""

def _parse_roadmap_markdown(markdown_text: str, project_name: str) -> dict | None:
    """
    Parses a specially formatted markdown string into a roadmap JSON object.
    """
    try:
        logger.info("Parsing roadmap markdown", markdown=markdown_text)
        phases = []
        current_phase = None
        phase_index = 0
        task_index_in_phase = 0
        colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"]

        for line in markdown_text.strip().splitlines():
            line = line.strip()
            if not line:
                continue

            # Check for phase header (more flexible regex)
            phase_match = re.match(r"##\s*Phase\s*\d+:?\s*(.*?)\s*\(Weeks?:\s*(\d+)\s*-\s*(\d+)\)", line, re.IGNORECASE)
            if phase_match:
                if current_phase:
                    phases.append(current_phase)
                
                phase_index += 1
                task_index_in_phase = 0
                current_phase = {
                    "id": f"phase_{phase_index}",
                    "name": phase_match.group(1).strip(),
                    "goal": "Goal to be defined.", # Markdown format doesn't have a goal
                    "week_start": int(phase_match.group(2)),
                    "week_end": int(phase_match.group(3)),
                    "color": colors[(phase_index - 1) % len(colors)],
                    "tasks": []
                }
                continue

            # Check for task item
            task_match = re.match(r"-\s*\[\s*\]\s*(.*)", line)
            if task_match and current_phase:
                task_line = task_match.group(1).strip()
                
                meta_match = re.search(r"\((.*)\)", task_line)
                priority, hours, tags = "medium", 2, []
                if meta_match:
                    meta_str = meta_match.group(1)
                    task_line = task_line[:meta_match.start()].strip()
                    meta_parts = [p.strip() for p in meta_str.split('|')]
                    if len(meta_parts) > 0: priority = meta_parts[0]
                    if len(meta_parts) > 1 and 'h' in meta_parts[1].lower(): 
                        try:
                            hours = int(re.sub(r'h', '', meta_parts[1], flags=re.IGNORECASE))
                        except ValueError:
                            hours = 2 # default
                    if len(meta_parts) > 2: tags = [t.strip() for t in meta_parts[2].split(',')]

                task_index_in_phase += 1
                current_phase["tasks"].append({
                    "id": f"task_{phase_index}_{task_index_in_phase}",
                    "title": task_line,
                    "description": "Details to be added.",
                    "estimated_hours": hours,
                    "priority": priority,
                    "completed": False,
                    "tags": tags
                })

        if current_phase:
            phases.append(current_phase)
        
        if not phases:
            logger.warn("No phases parsed from roadmap markdown", markdown=markdown_text)
            return None

        return {
            "project_title": project_name,
            "total_phases": len(phases),
            "estimated_weeks": max((p.get("week_end", 0) for p in phases), default=0),
            "phases": phases
        }
    except Exception as e:
        logger.error("Failed to parse roadmap markdown", error=str(e), markdown=markdown_text)
        return None

async def run_planner_agent(
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
        result = await call_groq_async(
            messages=messages,
            system_prompt=PLANNER_SYSTEM_PROMPT,
            max_tokens=2048,
            temperature=0.4,
        )
        logger.info("Planner agent completed", chars=len(result))
        return result
    except Exception as e:
        logger.error("Planner agent failed", error=str(e))
        return f"Planner agent error: {str(e)}"

async def generate_roadmap_json(
    project_description: str,
    conversation_history: list[dict],
) -> dict | None:
    """
    Generate a structured roadmap by asking the LLM for Markdown and parsing it locally.
    """
    messages = conversation_history[-4:] + [
        {"role": "user", "content": f"Create a detailed project roadmap for: {project_description}"}
    ]

    try:
        markdown_text = await call_groq_async(
            messages=messages,
            system_prompt=CHECKLIST_MARKDOWN_PROMPT,
            max_tokens=2048,
        )
        
        if not markdown_text:
            return None
            
        roadmap_json = _parse_roadmap_markdown(markdown_text, project_description)
        
        if roadmap_json:
            logger.info("Roadmap Markdown parsed successfully.")
            return roadmap_json
        else:
            logger.error("Failed to parse generated roadmap markdown.", markdown=markdown_text)
            return None

    except Exception as e:
        logger.error("Roadmap generation pipeline failed", error=str(e))
        return None
