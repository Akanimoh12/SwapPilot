"""Tests for feature extraction and preprocessing."""

import math

import numpy as np
import pytest

from src.features.extractor import FeatureExtractor, SwapEvent
from src.features.preprocessor import Preprocessor


@pytest.fixture
def extractor() -> FeatureExtractor:
    return FeatureExtractor()


@pytest.fixture
def sample_events() -> list[SwapEvent]:
    """Generate 100 synthetic swap events."""
    events = []
    base_price = 2000.0
    for i in range(100):
        price = base_price + np.random.randn() * 10
        events.append(
            SwapEvent(
                timestamp=1700000000 + i * 60,
                price=max(price, 1.0),
                volume=abs(np.random.randn() * 1000),
                is_buy=i % 2 == 0,
                chain_id=130,
            )
        )
    return events


class TestFeatureExtractor:
    """Tests for FeatureExtractor."""

    def test_output_shape(self, extractor: FeatureExtractor, sample_events: list[SwapEvent]) -> None:
        """Extract produces (T, 10) array."""
        features = extractor.extract(sample_events)
        assert features.shape == (100, 10)

    def test_cyclical_encoding_wraps(self, extractor: FeatureExtractor) -> None:
        """Hour 0 and hour 24 produce the same sin/cos values."""
        events_0h = [SwapEvent(timestamp=0, price=100.0, volume=10.0, is_buy=True)]
        events_24h = [SwapEvent(timestamp=86400, price=100.0, volume=10.0, is_buy=True)]

        # Need at least 2 events for meaningful features, but cyclical encoding works on single
        feat_0 = extractor.extract(events_0h)
        feat_24 = extractor.extract(events_24h)

        assert abs(feat_0[0, 8] - feat_24[0, 8]) < 1e-6  # hour_sin
        assert abs(feat_0[0, 9] - feat_24[0, 9]) < 1e-6  # hour_cos

    def test_volume_ratio_no_zero_division(self, extractor: FeatureExtractor) -> None:
        """Volume ratio handles zero volume without crashing."""
        events = [
            SwapEvent(timestamp=0, price=100.0, volume=0.0, is_buy=True),
            SwapEvent(timestamp=60, price=101.0, volume=0.0, is_buy=False),
        ]
        features = extractor.extract(events)
        assert not np.any(np.isnan(features[:, 1]))
        assert not np.any(np.isinf(features[:, 1]))

    def test_extract_latest_pads(self, extractor: FeatureExtractor) -> None:
        """extract_latest pads to window size if not enough events."""
        events = [
            SwapEvent(timestamp=i * 60, price=100.0 + i, volume=10.0, is_buy=True)
            for i in range(10)
        ]
        features = extractor.extract_latest(events, window=60)
        assert features.shape == (60, 10)

    def test_extract_latest_slices(self, extractor: FeatureExtractor, sample_events: list[SwapEvent]) -> None:
        """extract_latest returns last 60 when enough data."""
        features = extractor.extract_latest(sample_events, window=60)
        assert features.shape == (60, 10)

    def test_cross_chain_divergence(self, extractor: FeatureExtractor) -> None:
        """Cross-chain divergence is computed when prices provided."""
        events = [
            SwapEvent(
                timestamp=i * 60, price=2000.0, volume=100.0, is_buy=True,
                cross_chain_prices={"ethereum": 2010.0, "arbitrum": 1990.0},
            )
            for i in range(5)
        ]
        features = extractor.extract(events)
        assert np.any(features[:, 7] > 0)  # divergence should be nonzero


class TestPreprocessor:
    """Tests for Preprocessor."""

    def test_fit_transform_roundtrip(self) -> None:
        """Fit then transform produces zero-mean unit-variance data."""
        data = np.random.randn(100, 10) * 5 + 3
        pp = Preprocessor()
        transformed = pp.fit_transform(data)

        assert abs(transformed.mean()) < 0.1
        assert abs(transformed.std() - 1.0) < 0.1

    def test_unfitted_returns_unchanged(self) -> None:
        """Transform before fit returns data unchanged."""
        data = np.random.randn(10, 5)
        pp = Preprocessor()
        result = pp.transform(data)
        np.testing.assert_array_equal(result, data)

    def test_save_load(self, tmp_path) -> None:
        """Save and load preserves scaler state."""
        data = np.random.randn(100, 10) * 5 + 3
        pp = Preprocessor()
        pp.fit(data)
        original = pp.transform(data)

        path = str(tmp_path / "scaler.pkl")
        pp.save(path)

        pp2 = Preprocessor()
        pp2.load(path)
        loaded = pp2.transform(data)

        np.testing.assert_array_almost_equal(original, loaded)
