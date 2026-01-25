import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.database import Database
from src.routes import locations_router, sessions_router, leaderboard_router
from src.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    await Database.connect()
    yield
    # Shutdown
    await Database.disconnect()


# Create FastAPI app
app = FastAPI(
    title="ConUGuessr API",
    description="API for the campus geoguessr game",
    version="0.1.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:3000"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(locations_router)
app.include_router(sessions_router)
app.include_router(leaderboard_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to ConUGuessr API",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


def main():
    """Run the application."""
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.debug
    )


if __name__ == "__main__":
    main()
