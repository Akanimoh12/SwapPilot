"""Random Forest predictor for execution scoring.

Operates on flattened or aggregated feature vectors.
Used as the secondary model in the ensemble (weight 0.3).
"""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestRegressor


class RandomForestPredictor:
    """RandomForest-based execution score predictor."""

    def __init__(self, n_estimators: int = 200, max_depth: int = 10, random_state: int = 42) -> None:
        self.model = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=random_state,
        )
        self._fitted = False

    def fit(self, X: np.ndarray, y: np.ndarray) -> None:
        """Train on flattened/aggregated features and labels (0-100)."""
        self.model.fit(X, y)
        self._fitted = True

    def predict(self, features: np.ndarray) -> float:
        """Predict score 0-100 from a single sample.

        features: (seq, 10) or already aggregated (50,)
        """
        if not self._fitted:
            return 50.0  # neutral score before training

        agg = self.aggregate_features(features) if features.ndim == 2 else features
        agg = agg.reshape(1, -1)
        score = float(self.model.predict(agg)[0])
        return max(0.0, min(100.0, score))

    def aggregate_features(self, sequence: np.ndarray) -> np.ndarray:
        """Compute stats from (seq, 10) → (50,) vector.

        For each of the 10 features: mean, std, min, max, last.
        """
        if sequence.ndim != 2:
            raise ValueError(f"Expected 2D array, got {sequence.ndim}D")

        stats = []
        for col in range(sequence.shape[1]):
            vals = sequence[:, col]
            stats.extend([
                np.mean(vals),
                np.std(vals),
                np.min(vals),
                np.max(vals),
                vals[-1],
            ])
        return np.array(stats, dtype=np.float64)

    def save(self, path: str) -> None:
        """Save model to disk."""
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(self.model, f)

    def load(self, path: str) -> None:
        """Load model from disk."""
        with open(path, "rb") as f:
            self.model = pickle.load(f)  # noqa: S301
        self._fitted = True
