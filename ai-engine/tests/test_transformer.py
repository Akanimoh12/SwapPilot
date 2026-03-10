"""Tests for the Transformer execution model."""

import numpy as np
import pytest
import torch

from src.models.transformer import TransformerExecutionModel


@pytest.fixture
def model() -> TransformerExecutionModel:
    return TransformerExecutionModel(
        feature_dim=10, hidden_dim=64, n_heads=4, n_layers=2, ff_dim=128, dropout=0.1, max_seq_len=60,
    )


class TestTransformerModel:
    """Tests for TransformerExecutionModel."""

    def test_instantiation(self, model: TransformerExecutionModel) -> None:
        """Model creates with correct architecture."""
        assert isinstance(model, torch.nn.Module)
        assert hasattr(model, "input_proj")
        assert hasattr(model, "transformer")
        assert hasattr(model, "fc_head")

    def test_forward_shape(self, model: TransformerExecutionModel) -> None:
        """Forward pass with batch=4, seq=60, features=10 produces (4, 1)."""
        x = torch.randn(4, 60, 10)
        out = model(x)
        assert out.shape == (4, 1)

    def test_output_range(self, model: TransformerExecutionModel) -> None:
        """Output is between 0 and 1 (sigmoid)."""
        x = torch.randn(8, 60, 10)
        out = model(x)
        assert (out >= 0).all() and (out <= 1).all()

    def test_predict_returns_0_to_100(self, model: TransformerExecutionModel) -> None:
        """predict() returns a float in 0-100 range."""
        features = np.random.randn(60, 10)
        score = model.predict(features)
        assert isinstance(score, float)
        assert 0.0 <= score <= 100.0

    def test_predict_batch(self, model: TransformerExecutionModel) -> None:
        """predict() handles 3D input (batch, seq, features)."""
        features = np.random.randn(1, 60, 10)
        score = model.predict(features)
        assert 0.0 <= score <= 100.0

    def test_gradient_flow(self, model: TransformerExecutionModel) -> None:
        """Gradients flow through the model."""
        x = torch.randn(2, 60, 10)
        out = model(x)
        loss = out.sum()
        loss.backward()
        for p in model.parameters():
            if p.requires_grad:
                assert p.grad is not None
