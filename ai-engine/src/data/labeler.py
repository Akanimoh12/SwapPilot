"""Execution labeler — labels time windows as optimal/suboptimal for execution."""

from __future__ import annotations

import numpy as np
import pandas as pd


class ExecutionLabeler:
    """Labels each time window with an execution quality score."""

    def label(self, swaps: pd.DataFrame, window_size: int = 60) -> pd.DataFrame:
        """Label each window of `window_size` blocks.

        For each window:
          - Compute the price if executed at window start
          - Find the optimal execution point within the next N blocks
          - Label = optimal_price / actual_price (1.0 = perfect)

        Args:
            swaps: DataFrame with 'sqrtPriceX96' and 'timestamp' columns.
            window_size: Number of rows per window.

        Returns:
            DataFrame with added 'label' column (0-100 score).
        """
        if swaps.empty or "sqrtPriceX96" not in swaps.columns:
            return swaps.assign(label=np.nan)

        prices = swaps["sqrtPriceX96"].values.astype(np.float64)
        # Derive simplified price: (sqrtPriceX96 / 2^96)^2
        derived = (prices / (2**96)) ** 2
        derived = np.clip(derived, 1e-18, None)

        n = len(derived)
        labels = np.full(n, np.nan)

        for i in range(n):
            end = min(i + window_size, n)
            if end <= i + 1:
                labels[i] = 50.0  # not enough future data
                continue

            actual_price = derived[i]
            future_prices = derived[i + 1 : end]

            optimal_idx = self.compute_optimal_execution(future_prices, target_amount=1.0)
            optimal_price = future_prices[optimal_idx]

            # Score: how close actual is to optimal (higher = better time to execute)
            # If we're selling, best time is when price is highest
            ratio = actual_price / optimal_price if optimal_price > 0 else 0.5
            # Normalize to 0-100
            score = min(100.0, max(0.0, ratio * 100.0))
            labels[i] = score

        result = swaps.copy()
        result["label"] = labels
        return result

    def compute_optimal_execution(self, prices: np.ndarray, target_amount: float) -> int:
        """Return the index of the best execution block.

        For a sell order, best = highest price.
        """
        if len(prices) == 0:
            return 0
        return int(np.argmax(prices))
