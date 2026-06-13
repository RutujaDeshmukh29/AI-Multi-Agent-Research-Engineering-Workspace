# ========================
# app/workflows/langgraph_flow.py — REFACTORED
# LangGraph Multi-Agent Orchestration
#
# Key Changes:
# 1. Parallel Agent Execution: Agents now run concurrently using asyncio.gather
#    to significantly reduce latency.
# 2. Advanced Routing: A new conditional route handles "simple_qa" intents
#    for fast, direct answers, bypassing specialized agents.
# 3. Async Workflow: The entire graph and its nodes are now asynchronous,
#    using LangGraph's async capabilities (`ainvoke`).
# 4. DB Integration: Roadmap saving is now a part of the workflow itself.
# ========================

from typing import TypedDict, AsyncGenerator, Coroutine, Any
from langgraph.graph import StateGraph, END
import asyncio
import json
import structlog
import uuid

from .routing import get_agents_for_intent
from app.services.groq_service import call_groq_async
from app.database.db import get_db_context
from app.database import crud

logger = structlog.get_logger()

# ── State Definition ──────────────────────────────────────────────────
class AgentState(TypedDict):
    user_message: str
    conversation_history: list
    user_memory_context: str
    user_id: str
    session_id: str
    project_id: str # Added project_id
    intents: list[str]
    agents_to_run: list[str]
    complexity: str
    research_output: str
    engineering_output: str
    planner_output: str
    critic_output: str
    innovation_output: str
    roadmap_json: dict
    final_response: str
    agent_events: list

def emit(state: AgentState, agent: str, status: str, msg: str):
    if "agent_events" not in state or state["agent_events"] is None:
        state["agent_events"] = []
    state["agent_events"].append({"type": "agent_update", "agent": agent, "status": status, "message": msg})

# ── Node: Classify Intent ─────────────────────────────────────────────
async def node_classify(state: AgentState) -> AgentState:
    from app.agents.qa_agent import classify_intent
    emit(state, "qa", "thinking", "QA Controller analyzing your request...")
    
    classification = await classify_intent(state["user_message"], state["conversation_history"])
    
    state["intents"] = classification.get("intents", ["simple_qa"])
    state["complexity"] = classification.get("complexity", "low")
    state["agents_to_run"] = get_agents_for_intent(state["intents"])

    if state["agents_to_run"]:
        emit(state, "qa", "done", f"Routing to: {', '.join(state['agents_to_run'])}")
    else:
        emit(state, "qa", "done", "Routing for a direct answer.")
        
    return state

# ── Node: Simple QA (Direct Answer) ──────────────────────────────────
async def node_simple_qa(state: AgentState) -> AgentState:
    emit(state, "qa", "thinking", "Generating a direct answer...")
    
    SIMPLE_QA_PROMPT = "You are a helpful AI assistant. Provide a clear and concise answer to the user's question."
    
    response = await call_groq_async(
        messages=[{"role": "user", "content": state["user_message"]}],
        system_prompt=SIMPLE_QA_PROMPT,
        max_tokens=500,
        temperature=0.3
    )
    
    state["final_response"] = response
    emit(state, "qa", "done", "Direct answer ready ✓")
    return state

# ── Node: Parallel Agent Dispatch ───────────────────────────────────
async def node_parallel_dispatch(state: AgentState) -> AgentState:
    from app.agents import (
        research_agent, engineering_agent, planner_agent,
        critic_agent, innovation_agent
    )

    agent_map = {
        "research": research_agent.run_research_agent,
        "engineering": engineering_agent.run_engineering_agent,
        "planner": planner_agent.run_planner_agent,
        "critic": critic_agent.run_critic_agent,
        "innovation": innovation_agent.run_innovation_agent,
    }

    tasks: list[Coroutine[Any, Any, Any]] = []
    agent_names_to_run = state["agents_to_run"]
    
    for agent_name in agent_names_to_run:
        if agent_name in agent_map:
            emit(state, agent_name, "thinking", f"{agent_name.title()} Agent starting...")
            task = agent_map[agent_name](
                state["user_message"],
                state["conversation_history"],
                state["user_memory_context"]
            )
            tasks.append(task)
            
    if tasks:
        results = await asyncio.gather(*tasks)
        for agent_name, result in zip(agent_names_to_run, results):
            state[f"{agent_name}_output"] = result
            emit(state, agent_name, "done", f"{agent_name.title()} Agent complete ✓")

    if "planner" in agent_names_to_run:
        emit(state, "planner", "thinking", "Generating interactive checklist...")
        rmap = await planner_agent.generate_roadmap_json(
            state["user_message"], state["conversation_history"]
        )
        if rmap:
            state["roadmap_json"] = rmap
            emit(state, "planner", "done", "Roadmap + checklist created ✓")
            
            project_id = uuid.UUID(state.get("project_id"))
            user_id = uuid.UUID(state.get("user_id"))
            session_id = uuid.UUID(state.get("session_id"))
            if project_id and user_id:
                try:
                    async with get_db_context() as db:
                        await crud.create_or_update_roadmap(db, project_id, user_id, rmap, session_id)
                    emit(state, "db", "done", "Roadmap saved to database.")
                except Exception as e:
                    logger.error("Failed to save roadmap in workflow", error=str(e))
                    emit(state, "db", "error", "Failed to save roadmap.")
        else:
            state["roadmap_json"] = {}
            emit(state, "planner", "error", "Failed to generate roadmap JSON.")

    return state

# ── Node: Combine Outputs ────────────────────────────────────────────
async def node_combine(state: AgentState) -> AgentState:
    from app.agents.qa_agent import combine_agent_outputs
    emit(state, "qa", "thinking", "QA Controller synthesizing all agent outputs...")
    
    outputs = {
        k.replace("_output", ""): v
        for k, v in state.items()
        if k.endswith("_output") and v
    }
    
    final = await combine_agent_outputs(
        state["user_message"], outputs,
        state["conversation_history"], state["user_memory_context"]
    )
    state["final_response"] = final
    emit(state, "qa", "done", "Response ready ✓")
    return state

# ── Routing Logic ───────────────────────────────────────────────────
def should_run_agents(state: AgentState) -> str:
    if not state.get("agents_to_run"):
        return "simple_qa"
    return "parallel_dispatch"

# ── Graph Definition ────────────────────────────────────────────────
def build_agent_graph():
    g = StateGraph(AgentState)
    
    g.add_node("classify", node_classify)
    g.add_node("simple_qa", node_simple_qa)
    g.add_node("parallel_dispatch", node_parallel_dispatch)
    g.add_node("combine", node_combine)

    g.set_entry_point("classify")
    
    g.add_conditional_edges(
        "classify",
        should_run_agents,
        {"simple_qa": "simple_qa", "parallel_dispatch": "parallel_dispatch"}
    )
    
    g.add_edge("simple_qa", END)
    g.add_edge("parallel_dispatch", "combine")
    g.add_edge("combine", END)
    
    return g.compile()

# ── Pipeline Execution ──────────────────────────────────────────────
_graph = None
def get_graph():
    global _graph
    if _graph is None:
        _graph = build_agent_graph()
    return _graph

async def run_agent_pipeline(
    user_message: str,
    conversation_history: list,
    user_memory_context: str = "",
    user_id: str = "",
    session_id: str = "",
    project_id: str = "", # Added project_id
) -> AsyncGenerator[str, None]:
    initial_state: AgentState = {
        "user_message": user_message,
        "conversation_history": conversation_history,
        "user_memory_context": user_memory_context,
        "user_id": user_id,
        "session_id": session_id,
        "project_id": project_id, # Added project_id
        "intents": [],
        "agents_to_run": [],
        "complexity": "low",
        "research_output": "",
        "engineering_output": "",
        "planner_output": "",
        "critic_output": "",
        "innovation_output": "",
        "roadmap_json": {},
        "final_response": "",
        "agent_events": [],
    }
    
    try:
        graph = get_graph()
        
        final_state = await graph.ainvoke(initial_state)

        for ev in (final_state.get("agent_events") or []):
            yield f"data: {json.dumps(ev)}\n\n"
            await asyncio.sleep(0.04)

        outputs = {k.replace("_output",""): v for k, v in final_state.items() if k.endswith("_output") and v}
        final_data = {
            'type': 'final',
            'content': final_state.get('final_response', 'An error occurred.'),
            'agent_outputs': outputs,
            'roadmap': final_state.get('roadmap_json')
        }
        yield f"data: {json.dumps(final_data)}\n\n"

    except Exception as e:
        logger.error("Agent pipeline failed", error=str(e), exc_info=True)
        yield f"data: {json.dumps({'type':'error','message':str(e)})}\n\n"
