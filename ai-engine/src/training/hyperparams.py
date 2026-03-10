"""Hyperparameter configuration for SwapPilot AI models."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class HyperParams:
    """All tunable hyperparameters in one place."""

    # Data
    sequence_length: int = 60
    feature_dim: int = 10

    # Transformer
    hidden_dim: int = 64
    n_heads: int = 4
    n_layers: int = 2
    ff_dim: int = 128
    dropout: float = 0.1

    # Training
    learning_rate: float = 1e-3
    batch_size: int = 32
    epochs: int = 100
    patience: int = 10

    # Random Forest
    rf_estimators: int = 200
    rf_max_depth: int = 10

    # Ensemble
    ensemble_transformer_weight: float = 0.7
    ensemble_rf_weight: float = 0.3
