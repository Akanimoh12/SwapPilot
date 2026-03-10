"""API routes for the SwapPilot AI engine."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.inference.predictor import ExecutionPredictor

router = APIRouter()


class PredictRequest(BaseModel):
    features: list[list[float]] = Field(..., description="60x10 feature matrix")
    pool_id: str = Field(..., description="Pool identifier (bytes32 hex)")
    chain_data: dict | None = Field(None, description="Optional cross-chain data")


class PredictResponse(BaseModel):
    execution_score: float
    transformer_score: float
    rf_score: float
    confidence: float
    action: str
    should_execute: bool
    timestamp: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str


class MetricsResponse(BaseModel):
    total_predictions: int
    avg_latency_ms: float
    model_version: str
    last_prediction: str


@router.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest) -> PredictResponse:
    """Run AI prediction on swap features."""
    predictor = ExecutionPredictor.get_instance()

    if not predictor.is_ready():
        raise HTTPException(status_code=503, detail="Models not loaded")

    try:
        result = predictor.predict(request.features)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return PredictResponse(
        execution_score=result["execution_score"],
        transformer_score=result["transformer_score"],
        rf_score=result["rf_score"],
        confidence=result["confidence"],
        action=result["action"],
        should_execute=result["action"] == "execute",
        timestamp=result["timestamp"],
    )


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint."""
    predictor = ExecutionPredictor.get_instance()
    return HealthResponse(
        status="healthy" if predictor.is_ready() else "starting",
        model_loaded=predictor.is_ready(),
        version="0.1.0",
    )


@router.get("/metrics", response_model=MetricsResponse)
async def metrics() -> MetricsResponse:
    """Prediction metrics endpoint."""
    predictor = ExecutionPredictor.get_instance()
    return MetricsResponse(
        total_predictions=predictor.total_predictions,
        avg_latency_ms=round(predictor.avg_latency_ms, 2),
        model_version="0.1.0",
        last_prediction=datetime.now(timezone.utc).isoformat(),
    )
