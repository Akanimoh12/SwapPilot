"""FastAPI application for SwapPilot AI engine."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from src.inference.predictor import ExecutionPredictor
from src.server.middleware import setup_middleware
from src.server.routes import router

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """Load models on startup, clean up on shutdown."""
    predictor = ExecutionPredictor.get_instance()
    model_path = os.getenv("MODEL_PATH", "data/models")
    predictor.load_models(model_path)
    yield


app = FastAPI(
    title="SwapPilot AI Engine",
    description="AI-powered execution timing predictions for Uniswap v4 swaps",
    version="0.1.0",
    lifespan=lifespan,
)

setup_middleware(app)
app.include_router(router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logging.getLogger(__name__).error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
