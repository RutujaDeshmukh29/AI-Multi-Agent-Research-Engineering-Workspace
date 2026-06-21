# app/memory/file_memory.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.database import crud
from app.database.models import FileChunk, ProjectFile
from app.services.embeddings import embed_text

logger = structlog.get_logger()

async def get_file_context_for_prompt(db: AsyncSession, project_id: str, user_message: str, limit: int = 5) -> str:
    """
    Find relevant file chunks for a user's query and return them as a context string.
    """
    try:
        # Get embedding for the user's message
        message_embedding = embed_text(user_message)

        # Find the most similar file chunks
        similar_chunks = await db.execute(
            select(FileChunk)
            .join(ProjectFile)
            .where(ProjectFile.project_id == project_id)
            .order_by(FileChunk.embedding.l2_distance(message_embedding))
            .limit(limit)
        )
        
        chunks = similar_chunks.scalars().all()

        if not chunks:
            return ""

        # Format the context string
        context_str = """Relevant information from uploaded files:"""
        for chunk in chunks:
            context_str += f"""--- From file: {chunk.file.file_name} (Page: {chunk.page_number or 'N/A'}) ---"""
            context_str += chunk.content
            context_str += ""
            
        logger.info("Found relevant file context", num_chunks=len(chunks))
        return context_str

    except Exception as e:
        logger.error("Failed to get file context", error=str(e), exc_info=True)
        return ""
