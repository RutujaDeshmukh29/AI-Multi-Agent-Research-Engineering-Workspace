# ========================
# app/routes/file_routes.py
# ========================

import logging
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import shutil
from pathlib import Path

from app.database.db import get_db
from app.database import crud
from app.database.models import User
from app.auth.dependencies import get_current_user
from app.services.embeddings import embed_text

router = APIRouter()

logger = logging.getLogger(__name__)

UPLOADS_DIR = Path("backend/uploads")

@router.post("/projects/{project_id}/files", status_code=status.HTTP_201_CREATED)
async def upload_project_file(
    project_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Upload a file to a project for knowledge retrieval.
    It extracts text, creates embeddings, and stores them.
    """
    pid = uuid.UUID(project_id)
    project = await crud.get_project_by_id(db, pid, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Save the file
    project_uploads_dir = UPLOADS_DIR / str(pid)
    project_uploads_dir.mkdir(parents=True, exist_ok=True)
    file_path = project_uploads_dir / file.filename
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Create file record in DB
    db_file = await crud.create_project_file(
        db,
        project_id=pid,
        user_id=user.id,
        file_name=file.filename,
        file_path=str(file_path.relative_to(UPLOADS_DIR)),
        file_type=file.content_type,
        file_size=int(file_path.stat().st_size),
    )
    
    # Update status to processing
    await crud.update_file_status(db, db_file.id, "processing")

    try:
        # Text extraction and chunking based on file type
        is_pdf = file.content_type == "application/pdf" or file_path.suffix.lower() == ".pdf"
        is_image = (file.content_type and file.content_type.startswith("image/")) or file_path.suffix.lower() in [".png", ".jpg", ".jpeg", ".webp", ".gif"]

        if is_pdf:
            from langchain_community.document_loaders import PyPDFLoader
            from langchain_text_splitters import RecursiveCharacterTextSplitter

            loader = PyPDFLoader(str(file_path))
            documents = loader.load()
            
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = text_splitter.split_documents(documents)
            
            # Generate embeddings and store chunks
            for i, chunk in enumerate(chunks):
                embedding = embed_text(chunk.page_content)
                await crud.create_file_chunk(
                    db,
                    file_id=db_file.id,
                    content=chunk.page_content,
                    embedding=embedding,
                    chunk_index=i,
                    page_number=chunk.metadata.get("page"),
                )

        elif is_image:
            import base64
            from app.services.groq_service import async_groq_client
            
            # Read and encode image to base64
            image_bytes = file_path.read_bytes()
            base64_image = base64.b64encode(image_bytes).decode("utf-8")
            mime_type = file.content_type or "image/png"
            
            system_prompt = (
                "You are an elite expert image parsing agent. Your job is to describe the uploaded image in detail, "
                "extracting any text, code, tables, numbers, or architectural design diagrams visible within it. "
                "Make sure to output the extracted information in clear markdown text, retaining any formatting."
            )
            
            response = await async_groq_client.chat.completions.create(
                model="llama-3.2-11b-vision-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Extract all text and describe this project workspace reference image in detail:"},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=2048,
                temperature=0.2
            )
            
            description = response.choices[0].message.content.strip()
            
            # Generate embedding and store as a single chunk
            embedding = embed_text(description)
            await crud.create_file_chunk(
                db,
                file_id=db_file.id,
                content=description,
                embedding=embedding,
                chunk_index=0
            )

        else:
            # Generic text file handling
            content = file_path.read_text(errors="ignore")
            # Simple split by newline for now
            chunks = content.split("\n\n")
            for i, chunk_text in enumerate(chunks):
                if not chunk_text.strip():
                    continue
                embedding = embed_text(chunk_text)
                await crud.create_file_chunk(
                    db,
                    file_id=db_file.id,
                    content=chunk_text,
                    embedding=embedding,
                    chunk_index=i
                )

        # Update status to completed
        await crud.update_file_status(db, db_file.id, "completed")
    
    except Exception as e:
        logger.exception("Failed to process file %s", file.filename)
        await crud.update_file_status(db, db_file.id, "error")
        # Basic error handling
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

    return {"filename": file.filename, "detail": "File processed and embeddings created."}


@router.get("/projects/{project_id}/files")
async def get_files(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get all files uploaded to a project."""
    pid = uuid.UUID(project_id)
    project = await crud.get_project_by_id(db, pid, user.id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    files = await crud.get_project_files(db, pid)
    return [
        {
            "id": str(f.id),
            "file_name": f.file_name,
            "file_type": f.file_type,
            "file_size": f.file_size,
            "status": f.status,
            "created_at": str(f.created_at)
        }
        for f in files
    ]

