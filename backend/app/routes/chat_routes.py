from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.services.groq_service import ask_groq

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")

async def chat(request: ChatRequest):

    response = ask_groq(request.message)

    return {
        "response": response
    }