"""
Worst Rated iOS Apps Index — FastAPI Application
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.core.redis import get_redis, close_redis
from app.core.security import limiter

logging.basicConfig(
    level=logging.DEBUG if settings.APP_DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await get_redis()
    logging.info("Application started")
    yield
    # Shutdown
    await close_redis()
    logging.info("Application shutdown")


app = FastAPI(
    title="Worst Rated iOS Apps Index",
    description="API for browsing the lowest-rated apps in the Apple App Store",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {
        "name": "Worst Rated iOS Apps Index",
        "version": "1.0.0",
        "docs": "/docs",
    }
