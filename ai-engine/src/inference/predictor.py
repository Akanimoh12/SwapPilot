"""Execution predictor — singleton that loads models and runs inference."""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np

from src.features.preprocessor import Preprocessor
from src.models.ensemble import ExecutionEnsemble
from src.models.random_forest import RandomForestPredictor
from src.models.transformer import TransformerExecutionModel

logger = logging.getLogger(__name__)


class ExecutionPredictor:
    """Loads the ensemble and preprocessor once, serves predictions."""

    _instance: ExecutionPredictor | None = None

    def __init__(self) -> None:
        self._ready = False
        self.ensemble: ExecutionEnsemble | None = None
        self.preprocessor: Preprocessor | None = None
        self.total_predictions = 0
        self.total_latency_ms = 0.0

    @classmethod
    def get_instance(cls) -> ExecutionPredictor:
        """Singleton access."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def load_models(self, model_dir: str = "data/models") -> None:
        """Load trained models and preprocessor from disk."""
        model_path = Path(model_dir)
        transformer_path = model_path / "transformer_best.pt"
        rf_path = model_path / "random_forest.pkl"
        scaler_path = model_path / "scaler.pkl"

        transformer = TransformerExecutionModel()
        rf = RandomForestPredictor()

        if transformer_path.exists() and rf_path.exists():
            self.ensemble = ExecutionEnsemble(transformer, rf)
            self.ensemble.load(str(transformer_path), str(rf_path))
            logger.info("Loaded trained models from %s", model_dir)
        else:
            # Use untrained models for development
            self.ensemble = ExecutionEnsemble(transformer, rf)
            logger.warning("No trained models found — using untrained models")

        self.preprocessor = Preprocessor()
        if scaler_path.exists():
            self.preprocessor.load(str(scaler_path))
            logger.info("Loaded scaler from %s", scaler_path)

        self._ready = True

    def predict(self, raw_features: list[list[float]]) -> dict:
        """Run prediction on raw features.

        Args:
            raw_features: List of 60 lists, each with 10 floats.

        Returns:
            Prediction dict with scores, action, confidence.
        """
        import time

        if not self._ready or self.ensemble is None:
            raise RuntimeError("Models not loaded — call load_models() first")

        start = time.monotonic()

        features = np.array(raw_features, dtype=np.float64)
        if features.shape != (60, 10):
            raise ValueError(f"Expected shape (60, 10), got {features.shape}")

        # Apply scaler if fitted
        if self.preprocessor is not None:
            features = self.preprocessor.transform(features)

        result = self.ensemble.predict(features)

        elapsed = (time.monotonic() - start) * 1000
        self.total_predictions += 1
        self.total_latency_ms += elapsed
        result["latency_ms"] = round(elapsed, 2)

        return result

    def is_ready(self) -> bool:
        """Check if models are loaded and ready."""
        return self._ready

    @property
    def avg_latency_ms(self) -> float:
        if self.total_predictions == 0:
            return 0.0
        return self.total_latency_ms / self.total_predictions
