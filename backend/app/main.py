from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.routes.chat_routes import router as chat_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)

@app.get("/")

async def root():
    return {
        "message": "Backend works successfully"
    }