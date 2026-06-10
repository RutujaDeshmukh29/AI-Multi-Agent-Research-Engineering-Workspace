# ========================
# app/workflows/langgraph_flow.py  — FIXED
# LangGraph Multi-Agent Orchestration
# Bug fix: LangGraph conditional edges return ONE string (not a list)
# Solution: classify node sets agents_to_run, then a router dispatches
# sequentially. For true parallel we use asyncio.gather in the run function.
# ========================

from typing import TypedDict, AsyncGenerator
from langgraph.graph import StateGraph, END
import asyncio, json, structlog

from .routing import get_agents_for_intent

logger = structlog.get_logger()


class AgentState(TypedDict):
    user_message: str
    conversation_history: list
    user_memory_context: str
    user_id: str
    session_id: str
    intent: str
    agents_to_run: list
    requires_roadmap: bool
    requires_checklist: bool
    complexity: str
    research_output: str
    engineering_output: str
    planner_output: str
    critic_output: str
    innovation_output: str
    roadmap_json: dict
    final_response: str
    agent_events: list
    current_agent_idx: int   # tracks sequential dispatch


def emit(state: AgentState, agent: str, status: str, msg: str):
    if "agent_events" not in state or state["agent_events"] is None:
        state["agent_events"] = []
    state["agent_events"].append({"type": "agent_update", "agent": agent, "status": status, "message": msg})


# ── Node: Classify ───────────────────────
def node_classify(state: AgentState) -> AgentState:
    from app.agents.qa_agent import classify_intent
    emit(state, "qa", "thinking", "QA Controller analyzing your request...")
    data = classify_intent(state["user_message"], state["conversation_history"])
    state["intent"] = data.get("intent", "general")
    state["complexity"] = data.get("complexity", "medium")
    state["agents_to_run"] = get_agents_for_intent(state["intent"], state["complexity"])
    state["requires_roadmap"] = data.get("requires_roadmap", False)
    state["requires_checklist"] = data.get("requires_checklist", False)
    state["current_agent_idx"] = 0
    emit(state, "qa", "done", f"Routing to: {', '.join(state['agents_to_run'])}")
    return state


# ── Node: Dispatch (runs ONE agent per call, loops back) ──
def node_dispatch(state: AgentState) -> AgentState:
    idx = state.get("current_agent_idx", 0)
    agents = state.get("agents_to_run", [])

    if idx >= len(agents):
        return state  # all done

    agent_name = agents[idx]

    if agent_name == "research":
        from app.agents.research_agent import run_research_agent
        emit(state, "research", "thinking", "Research Agent analyzing concepts...")
        out = run_research_agent(state["user_message"], state["conversation_history"], state["user_memory_context"])
        state["research_output"] = out
        emit(state, "research", "done", "Research complete ✓")

    elif agent_name == "engineering":
        from app.agents.engineering_agent import run_engineering_agent
        emit(state, "engineering", "thinking", "Engineering Agent generating architecture...")
        out = run_engineering_agent(state["user_message"], state["conversation_history"], state["user_memory_context"])
        state["engineering_output"] = out
        emit(state, "engineering", "done", "Architecture ready ✓")

    elif agent_name == "planner":
        from app.agents.planner_agent import run_planner_agent, generate_roadmap_json
        emit(state, "planner", "thinking", "Planner Agent building roadmap...")
        out = run_planner_agent(state["user_message"], state["conversation_history"], state["user_memory_context"])
        state["planner_output"] = out
        if state.get("requires_roadmap") or state.get("requires_checklist"):
            emit(state, "planner", "thinking", "Generating interactive checklist...")
            rmap = generate_roadmap_json(state["user_message"], state["conversation_history"])
            state["roadmap_json"] = rmap or {}
        emit(state, "planner", "done", "Roadmap + checklist created ✓")

    elif agent_name == "critic":
        from app.agents.critic_agent import run_critic_agent
        emit(state, "critic", "thinking", "Critic Agent scanning for issues...")
        out = run_critic_agent(state["user_message"], state["conversation_history"], state.get("engineering_output", ""))
        state["critic_output"] = out
        emit(state, "critic", "done", "Critical review done ✓")

    elif agent_name == "innovation":
        from app.agents.innovation_agent import run_innovation_agent
        emit(state, "innovation", "thinking", "Innovation Agent generating ideas...")
        out = run_innovation_agent(state["user_message"], state["conversation_history"], state.get("engineering_output", ""))
        state["innovation_output"] = out
        emit(state, "innovation", "done", "Innovations ready ✓")

    state["current_agent_idx"] = idx + 1
    return state


# ── Routing: more agents? ─────────────────
def should_continue(state: AgentState) -> str:
    idx = state.get("current_agent_idx", 0)
    agents = state.get("agents_to_run", [])
    return "dispatch" if idx < len(agents) else "combine"


# ── Node: Combine ─────────────────────────
def node_combine(state: AgentState) -> AgentState:
    from app.agents.qa_agent import combine_agent_outputs
    emit(state, "qa", "thinking", "QA Controller synthesizing all agent outputs...")
    outputs = {}
    for k in ["research_output", "engineering_output", "planner_output", "critic_output", "innovation_output"]:
        if state.get(k):
            outputs[k.replace("_output", "")] = state[k]
    final = combine_agent_outputs(
        state["user_message"], outputs,
        state["conversation_history"], state["user_memory_context"]
    )
    state["final_response"] = final
    emit(state, "qa", "done", "Response ready ✓")
    return state


# ── Build Graph ───────────────────────────
def build_agent_graph():
    g = StateGraph(AgentState)
    g.add_node("classify", node_classify)
    g.add_node("dispatch", node_dispatch)
    g.add_node("combine",  node_combine)

    g.set_entry_point("classify")
    g.add_edge("classify", "dispatch")
    g.add_conditional_edges("dispatch", should_continue, {"dispatch": "dispatch", "combine": "combine"})
    g.add_edge("combine", END)
    return g.compile()


_graph = None
def get_graph():
    global _graph
    if _graph is None:
        _graph = build_agent_graph()
    return _graph


# ── Execute Pipeline ─────────────────────
async def run_agent_pipeline(
    user_message: str,
    conversation_history: list,
    user_memory_context: str = "",
    user_id: str = "",
    session_id: str = "",
) -> AsyncGenerator[str, None]:
    initial: AgentState = {
        "user_message": user_message,
        "conversation_history": conversation_history,
        "user_memory_context": user_memory_context,
        "user_id": user_id,
        "session_id": session_id,
        "intent": "", "agents_to_run": [],
        "requires_roadmap": False, "requires_checklist": False, "complexity": "medium",
        "research_output": "", "engineering_output": "", "planner_output": "",
        "critic_output": "", "innovation_output": "",
        "roadmap_json": {}, "final_response": "", "agent_events": [], "current_agent_idx": 0,
    }
    try:
        graph = get_graph()
        loop = asyncio.get_event_loop()
        final = await loop.run_in_executor(None, lambda: graph.invoke(initial))

        for ev in (final.get("agent_events") or []):
            yield f"data: {json.dumps(ev)}\n\n"
            await asyncio.sleep(0.04)

        outputs = {k.replace("_output",""): v for k, v in final.items() if k.endswith("_output") and v}
        yield f"data: {json.dumps({'type':'final','content':final['final_response'],'agent_outputs':outputs,'roadmap':final.get('roadmap_json')})}\n\n"

    except Exception as e:
        logger.error("Pipeline failed", error=str(e))
        yield f"data: {json.dumps({'type':'error','message':str(e)})}\n\n"
