"""Feature preprocessing with StandardScaler."""

from __future__ import annotations

import pickle
from pathlib import Path

import numpy as np
from sklearn.preprocessing import StandardScaler


class Preprocessor:
    """Fit/transform features using StandardScaler."""

    def __init__(self) -> None:
        self.scaler = StandardScaler()
        self._fitted = False

    def fit(self, data: np.ndarray) -> None:
        """Fit scaler on (N, features) data."""
        self.scaler.fit(data)
        self._fitted = True

    def transform(self, data: np.ndarray) -> np.ndarray:
        """Scale data. If not fitted, returns data unchanged."""
        if not self._fitted:
            return data
        return self.scaler.transform(data)  # type: ignore[return-value]

    def fit_transform(self, data: np.ndarray) -> np.ndarray:
        """Fit and transform in one step."""
        self.fit(data)
        return self.transform(data)

    def save(self, path: str) -> None:
        """Persist scaler to disk."""
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(self.scaler, f)

    def load(self, path: str) -> None:
        """Load scaler from disk."""
        with open(path, "rb") as f:
            self.scaler = pickle.load(f)  # noqa: S301
        self._fitted = True
