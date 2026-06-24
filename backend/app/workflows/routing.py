# ========================
# app/workflows/routing.py
# Intent routing helpers used by LangGraph
# Keeps routing logic separate from the graph definition
# ========================

# 1-to-1 mapping of intents to agents.
# The new classify_intent function is responsible for finding all relevant intents.
AGENT_ROUTING_MAP = {
    "research":    ["research"],
    "engineering": ["engineering"],
    "planning":    ["planner"],
    "critique":    ["critic"],
    "innovation":  ["innovation"],
}


def get_agents_for_intent(intents: list[str]) -> list[str]:
    """
    Returns the unique list of agents to activate based on a list of intents.
    Handles the 'simple_qa' case where no agents are needed.
    """
    # If the only intent is 'simple_qa', then no specialized agents are needed.
    if len(intents) == 1 and intents[0] == "simple_qa":
        return []

    # Use a set to automatically handle duplicates if an intent is listed multiple times
    agents_to_run = set()
    for intent in intents:
        # Ignore simple_qa if there are other specialized intents
        if intent == "simple_qa":
            continue
        agents = AGENT_ROUTING_MAP.get(intent)
        if agents:
            agents_to_run.update(agents)

    # Define a preferred order for agent execution. This ensures that 'research'
    # runs before 'engineering', etc., which can be useful for downstream dependencies.
    preferred_order = ["research", "planning", "engineering", "critique", "innovation"]
    
    # Sort the unique agents based on the preferred order
    # Agents not in the preferred_order list will be placed at the end.
    sorted_agents = sorted(
        list(agents_to_run), 
        key=lambda agent: preferred_order.index(agent) if agent in preferred_order else float('inf')
    )
    
    return sorted_agents

