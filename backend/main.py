"""fastapi application entry point with cors and socket.io middleware."""

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    leaderboard_router,
    locations_router,
    multiplayer_router,
    sessions_router,
    universities_router,
)
from app.api.websocket import socket_app
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="ConUGuessr API",
    description="API for the campus geoguessr game",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(locations_router)
app.include_router(sessions_router)
app.include_router(leaderboard_router)
app.include_router(multiplayer_router)
app.include_router(universities_router)
app.mount("/socket.io", socket_app)


@app.get("/")
async def root():
    return {"message": "Welcome to ConUGuessr API", "version": "0.1.0", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": settings.app_env}


def main():
    uvicorn.run("main:app", host=settings.api_host, port=settings.api_port, reload=settings.debug)


if __name__ == "__main__":
    main()
