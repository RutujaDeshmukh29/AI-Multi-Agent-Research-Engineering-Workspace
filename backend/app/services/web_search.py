# app/services/web_search.py — Serper web search for Research Agent
import httpx, structlog
from app.config import settings
logger = structlog.get_logger()

async def search_web(query: str, num_results: int = 5) -> list[dict]:
    if not settings.SERPER_API_KEY:
        return []
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": settings.SERPER_API_KEY, "Content-Type": "application/json"},
                json={"q": query, "num": num_results},
            )
            return [{"title": i.get("title",""), "snippet": i.get("snippet",""), "link": i.get("link","")}
                    for i in r.json().get("organic", [])[:num_results]]
    except Exception as e:
        logger.error("Web search failed", error=str(e))
        return []

def format_search_results(results: list[dict]) -> str:
    if not results: return ""
    return "\n".join(f"{i}. {r['title']}\n   {r['snippet']}\n   {r['link']}" for i, r in enumerate(results, 1))
