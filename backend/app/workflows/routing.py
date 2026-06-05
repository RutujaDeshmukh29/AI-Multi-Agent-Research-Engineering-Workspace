# ========================
# app/workflows/routing.py
# Intent routing helpers used by LangGraph
# Keeps routing logic separate from the graph definition
# ========================

AGENT_ROUTING_MAP = {
    "research":    ["research"],
    "engineering": ["research", "engineering"],
    "planning":    ["research", "engineering", "planner"],
    "critique":    ["engineering", "critic"],
    "innovation":  ["engineering", "innovation"],
    "general":     ["research", "engineering"],
}

COMPLEXITY_AGENT_MAP = {
    "low":    2,   # max agents for low complexity
    "medium": 3,
    "high":   5,   # all agents for complex questions
}


def get_agents_for_intent(intent: str, complexity: str = "medium") -> list[str]:
    """
    Returns the list of agents to activate based on intent + complexity.
    Higher complexity = more agents.
    """
    base = AGENT_ROUTING_MAP.get(intent, ["research", "engineering"])
    max_agents = COMPLEXITY_AGENT_MAP.get(complexity, 3)
    return base[:max_agents]


def should_generate_roadmap(message: str) -> bool:
    """Quick heuristic check — LLM classification is more accurate but this is a fast fallback."""
    keywords = ["build", "create", "develop", "plan", "roadmap", "project", "implement", "system", "app", "platform"]
    msg_lower = message.lower()
    return any(k in msg_lower for k in keywords)
