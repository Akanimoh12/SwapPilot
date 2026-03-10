"""Transformer-based execution timing model.

Architecture:
  Input (batch, seq=60, features=10)
  → Linear projection 10 → 64
  → Learnable positional encoding (60 positions)
  → TransformerEncoder (4 heads, 2 layers, ff=128, dropout=0.1)
  → Mean pooling
  → FC 64 → 32 → 1 (ReLU + dropout)
  → Sigmoid → score [0, 1]
"""

from __future__ import annotations

import math

import numpy as np
import torch
import torch.nn as nn


class PositionalEncoding(nn.Module):
    """Learnable positional encoding."""

    def __init__(self, d_model: int, max_len: int = 60) -> None:
        super().__init__()
        self.pe = nn.Parameter(torch.randn(1, max_len, d_model) * 0.02)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x + self.pe[:, : x.size(1)]


class TransformerExecutionModel(nn.Module):
    """Predicts execution score (0-1) from a sequence of swap features."""

    def __init__(
        self,
        feature_dim: int = 10,
        hidden_dim: int = 64,
        n_heads: int = 4,
        n_layers: int = 2,
        ff_dim: int = 128,
        dropout: float = 0.1,
        max_seq_len: int = 60,
    ) -> None:
        super().__init__()

        self.input_proj = nn.Linear(feature_dim, hidden_dim)
        self.pos_enc = PositionalEncoding(hidden_dim, max_seq_len)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=n_heads,
            dim_feedforward=ff_dim,
            dropout=dropout,
            batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)

        self.fc_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass. x: (batch, seq, features) → (batch, 1)."""
        x = self.input_proj(x)
        x = self.pos_enc(x)
        x = self.transformer(x)

        # Mean pooling across sequence
        x = x.mean(dim=1)
        return self.fc_head(x)

    def predict(self, features: np.ndarray) -> float:
        """Numpy interface: (seq, features) → score 0-100."""
        self.eval()
        with torch.no_grad():
            if features.ndim == 2:
                features = features[np.newaxis, :]  # add batch dim
            x = torch.from_numpy(features).float()
            score = self.forward(x)
            return float(score.item() * 100.0)
