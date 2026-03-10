"""Ensemble model combining Transformer (0.7) and RandomForest (0.3).

Produces a combined execution score and action recommendation.
"""

from __future__ import annotations

from datetime import datetime, timezone

import numpy as np

from src.models.random_forest import RandomForestPredictor
from src.models.transformer import TransformerExecutionModel


class ExecutionEnsemble:
    """Weighted ensemble of Transformer and RandomForest models."""

    def __init__(
        self,
        transformer: TransformerExecutionModel,
        rf: RandomForestPredictor,
        transformer_weight: float = 0.7,
        rf_weight: float = 0.3,
    ) -> None:
        self.transformer = transformer
        self.rf = rf
        self.transformer_weight = transformer_weight
        self.rf_weight = rf_weight

    def predict(self, features: np.ndarray) -> dict:
        """Run both models and combine scores.

        Args:
            features: (seq, 10) feature array.

        Returns:
            Dict with scores, confidence, action, and timestamp.
        """
        t_score = self.transformer.predict(features)
        rf_score = self.rf.predict(features)

        combined = self.transformer_weight * t_score + self.rf_weight * rf_score

        # Confidence: 1 - normalized disagreement (0-100 scale → 0-1)
        disagreement = abs(t_score - rf_score) / 100.0
        confidence = max(0.0, 1.0 - disagreement)

        # Action decision
        if combined >= 70:
            action = "execute"
        elif combined >= 40:
            action = "wait"
        else:
            action = "expire"

        return {
            "execution_score": round(combined, 2),
            "transformer_score": round(t_score, 2),
            "rf_score": round(rf_score, 2),
            "confidence": round(confidence, 4),
            "action": action,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def load(self, transformer_path: str, rf_path: str) -> None:
        """Load both model weights from disk."""
        import torch

        self.transformer.load_state_dict(torch.load(transformer_path, map_location="cpu", weights_only=True))
        self.transformer.eval()
        self.rf.load(rf_path)
