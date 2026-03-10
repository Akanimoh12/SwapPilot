"""Tests for the ensemble model."""

from unittest.mock import MagicMock

import numpy as np
import pytest

from src.models.ensemble import ExecutionEnsemble
from src.models.random_forest import RandomForestPredictor
from src.models.transformer import TransformerExecutionModel


@pytest.fixture
def mock_transformer() -> MagicMock:
    mock = MagicMock(spec=TransformerExecutionModel)
    return mock


@pytest.fixture
def mock_rf() -> MagicMock:
    mock = MagicMock(spec=RandomForestPredictor)
    return mock


class TestExecutionEnsemble:
    """Tests for the ExecutionEnsemble."""

    def test_weighted_combination(self, mock_transformer: MagicMock, mock_rf: MagicMock) -> None:
        """Ensemble combines scores with 0.7/0.3 weights."""
        mock_transformer.predict.return_value = 80.0
        mock_rf.predict.return_value = 60.0

        ensemble = ExecutionEnsemble(mock_transformer, mock_rf, 0.7, 0.3)
        features = np.random.randn(60, 10)
        result = ensemble.predict(features)

        expected = 0.7 * 80.0 + 0.3 * 60.0  # 74.0
        assert abs(result["execution_score"] - expected) < 0.1

    def test_action_execute(self, mock_transformer: MagicMock, mock_rf: MagicMock) -> None:
        """Score >= 70 → action 'execute'."""
        mock_transformer.predict.return_value = 85.0
        mock_rf.predict.return_value = 75.0
        ensemble = ExecutionEnsemble(mock_transformer, mock_rf)
        result = ensemble.predict(np.random.randn(60, 10))
        assert result["action"] == "execute"

    def test_action_wait(self, mock_transformer: MagicMock, mock_rf: MagicMock) -> None:
        """Score 40-69 → action 'wait'."""
        mock_transformer.predict.return_value = 50.0
        mock_rf.predict.return_value = 50.0
        ensemble = ExecutionEnsemble(mock_transformer, mock_rf)
        result = ensemble.predict(np.random.randn(60, 10))
        assert result["action"] == "wait"

    def test_action_expire(self, mock_transformer: MagicMock, mock_rf: MagicMock) -> None:
        """Score < 40 → action 'expire'."""
        mock_transformer.predict.return_value = 20.0
        mock_rf.predict.return_value = 30.0
        ensemble = ExecutionEnsemble(mock_transformer, mock_rf)
        result = ensemble.predict(np.random.randn(60, 10))
        assert result["action"] == "expire"

    def test_confidence_high_agreement(self, mock_transformer: MagicMock, mock_rf: MagicMock) -> None:
        """Confidence is high when models agree."""
        mock_transformer.predict.return_value = 75.0
        mock_rf.predict.return_value = 75.0
        ensemble = ExecutionEnsemble(mock_transformer, mock_rf)
        result = ensemble.predict(np.random.randn(60, 10))
        assert result["confidence"] == 1.0

    def test_confidence_low_disagreement(self, mock_transformer: MagicMock, mock_rf: MagicMock) -> None:
        """Confidence is lower when models disagree."""
        mock_transformer.predict.return_value = 90.0
        mock_rf.predict.return_value = 30.0
        ensemble = ExecutionEnsemble(mock_transformer, mock_rf)
        result = ensemble.predict(np.random.randn(60, 10))
        assert result["confidence"] < 0.5

    def test_result_has_all_keys(self, mock_transformer: MagicMock, mock_rf: MagicMock) -> None:
        """Result dict has all expected keys."""
        mock_transformer.predict.return_value = 50.0
        mock_rf.predict.return_value = 50.0
        ensemble = ExecutionEnsemble(mock_transformer, mock_rf)
        result = ensemble.predict(np.random.randn(60, 10))
        expected_keys = {"execution_score", "transformer_score", "rf_score", "confidence", "action", "timestamp"}
        assert expected_keys.issubset(result.keys())
