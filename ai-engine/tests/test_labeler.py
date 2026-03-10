"""Tests for the execution labeler."""

import numpy as np
import pandas as pd
import pytest

from src.data.labeler import ExecutionLabeler


@pytest.fixture
def labeler() -> ExecutionLabeler:
    return ExecutionLabeler()


@pytest.fixture
def synthetic_swaps() -> pd.DataFrame:
    """Create synthetic swap data with known price patterns."""
    n = 200
    # Price that rises then falls — optimal sell is at the peak
    prices = np.concatenate([
        np.linspace(1e15, 2e15, n // 2),
        np.linspace(2e15, 1e15, n // 2),
    ])
    return pd.DataFrame({
        "sqrtPriceX96": (prices * (2**96 / 1e15)).astype(np.int64),
        "timestamp": np.arange(n) * 12,
        "block_number": np.arange(n),
    })


class TestExecutionLabeler:
    """Tests for ExecutionLabeler."""

    def test_label_output_has_label_column(self, labeler: ExecutionLabeler, synthetic_swaps: pd.DataFrame) -> None:
        """Labeling adds a 'label' column."""
        result = labeler.label(synthetic_swaps, window_size=20)
        assert "label" in result.columns

    def test_label_scores_are_bounded(self, labeler: ExecutionLabeler, synthetic_swaps: pd.DataFrame) -> None:
        """Labels are between 0 and 100."""
        result = labeler.label(synthetic_swaps, window_size=20)
        valid = result["label"].dropna()
        assert (valid >= 0).all() and (valid <= 100).all()

    def test_label_correct_number_of_rows(self, labeler: ExecutionLabeler, synthetic_swaps: pd.DataFrame) -> None:
        """Output has same number of rows as input."""
        result = labeler.label(synthetic_swaps, window_size=20)
        assert len(result) == len(synthetic_swaps)

    def test_optimal_execution_picks_max(self, labeler: ExecutionLabeler) -> None:
        """Optimal execution picks the highest price index."""
        prices = np.array([100, 200, 300, 150, 50])
        idx = labeler.compute_optimal_execution(prices, target_amount=1.0)
        assert idx == 2  # 300 is the max

    def test_optimal_execution_empty(self, labeler: ExecutionLabeler) -> None:
        """Empty prices returns index 0."""
        idx = labeler.compute_optimal_execution(np.array([]), target_amount=1.0)
        assert idx == 0

    def test_label_empty_dataframe(self, labeler: ExecutionLabeler) -> None:
        """Empty DataFrame returns empty with label column."""
        empty = pd.DataFrame(columns=["sqrtPriceX96", "timestamp"])
        result = labeler.label(empty)
        assert "label" in result.columns
        assert len(result) == 0
