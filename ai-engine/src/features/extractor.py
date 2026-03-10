"""Feature extraction from raw swap event data.

Extracts 10 features per time step:
  0: price_return          - log return of price change
  1: volume_ratio          - current vol / rolling avg vol
  2: spread                - bid-ask spread estimate
  3: volatility_5m         - 5-minute rolling std of returns
  4: volatility_1h         - 1-hour rolling std of returns
  5: volume_imbalance      - buy vs sell volume ratio
  6: price_momentum        - EMA of returns
  7: cross_chain_divergence - price diff across chains
  8: hour_sin              - sin(2π * hour / 24)
  9: hour_cos              - cos(2π * hour / 24)
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np


@dataclass
class SwapEvent:
    """Single swap event from on-chain data."""

    timestamp: int
    price: float
    volume: float
    is_buy: bool
    chain_id: int = 130  # default Unichain
    cross_chain_prices: dict[str, float] | None = None


class FeatureExtractor:
    """Transforms raw swap events into a (T, 10) feature matrix."""

    FEATURE_DIM = 10

    def __init__(self, ema_alpha: float = 0.1, vol_window_5m: int = 5, vol_window_1h: int = 60) -> None:
        self.ema_alpha = ema_alpha
        self.vol_window_5m = vol_window_5m
        self.vol_window_1h = vol_window_1h

    def extract(self, events: list[SwapEvent]) -> np.ndarray:
        """Extract features from a list of swap events. Returns (T, 10) array."""
        if len(events) < 2:
            return np.zeros((max(len(events), 1), self.FEATURE_DIM))

        n = len(events)
        features = np.zeros((n, self.FEATURE_DIM))

        prices = np.array([e.price for e in events], dtype=np.float64)
        volumes = np.array([e.volume for e in events], dtype=np.float64)
        is_buy = np.array([1.0 if e.is_buy else -1.0 for e in events])
        timestamps = np.array([e.timestamp for e in events])

        # 0: price_return — log return
        returns = np.zeros(n)
        returns[1:] = np.log(prices[1:] / np.clip(prices[:-1], 1e-18, None))
        features[:, 0] = returns

        # 1: volume_ratio — current volume / rolling mean volume
        cum_vol = np.cumsum(volumes)
        counts = np.arange(1, n + 1)
        avg_vol = cum_vol / counts
        features[:, 1] = volumes / np.clip(avg_vol, 1e-18, None)

        # 2: spread — estimated from price volatility (proxy)
        features[:, 2] = self._rolling_std(returns, 5) * 2.0

        # 3: volatility_5m — 5-step rolling std of returns
        features[:, 3] = self._rolling_std(returns, self.vol_window_5m)

        # 4: volatility_1h — 60-step rolling std of returns
        features[:, 4] = self._rolling_std(returns, self.vol_window_1h)

        # 5: volume_imbalance — rolling buy/sell ratio
        buy_vol = volumes * (is_buy > 0).astype(float)
        sell_vol = volumes * (is_buy < 0).astype(float)
        cum_buy = np.cumsum(buy_vol)
        cum_sell = np.cumsum(sell_vol)
        total = cum_buy + cum_sell
        safe_total = np.where(total > 0, total, 1.0)
        features[:, 5] = np.where(total > 0, (cum_buy - cum_sell) / safe_total, 0.0)

        # 6: price_momentum — EMA of returns
        features[:, 6] = self._ema(returns, self.ema_alpha)

        # 7: cross_chain_divergence
        for i, event in enumerate(events):
            if event.cross_chain_prices:
                all_prices = list(event.cross_chain_prices.values()) + [event.price]
                if len(all_prices) >= 2 and max(all_prices) > 0:
                    avg_p = sum(all_prices) / len(all_prices)
                    max_diff = max(all_prices) - min(all_prices)
                    features[i, 7] = max_diff / max(avg_p, 1e-18)

        # 8-9: cyclical hour encoding
        hours = np.array([(ts % 86400) / 3600 for ts in timestamps])
        features[:, 8] = np.sin(2 * math.pi * hours / 24)
        features[:, 9] = np.cos(2 * math.pi * hours / 24)

        return features

    def extract_latest(self, events: list[SwapEvent], window: int = 60) -> np.ndarray:
        """Extract features for the last `window` events. Returns (window, 10)."""
        all_features = self.extract(events)
        if all_features.shape[0] >= window:
            return all_features[-window:]
        # Pad with zeros at the front
        pad = np.zeros((window - all_features.shape[0], self.FEATURE_DIM))
        return np.vstack([pad, all_features])

    @staticmethod
    def _rolling_std(arr: np.ndarray, window: int) -> np.ndarray:
        """Simple rolling standard deviation."""
        n = len(arr)
        result = np.zeros(n)
        for i in range(n):
            start = max(0, i - window + 1)
            result[i] = np.std(arr[start : i + 1])
        return result

    @staticmethod
    def _ema(arr: np.ndarray, alpha: float) -> np.ndarray:
        """Exponential moving average."""
        n = len(arr)
        result = np.zeros(n)
        result[0] = arr[0]
        for i in range(1, n):
            result[i] = alpha * arr[i] + (1 - alpha) * result[i - 1]
        return result
