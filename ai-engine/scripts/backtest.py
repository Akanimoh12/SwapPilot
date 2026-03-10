#!/usr/bin/env python3
"""Backtest SwapPilot AI execution on historical data.

Simulates the full flow: detect large swap → queue → predict → execute at optimal time.
Compares against instant execution to compute slippage savings.

Usage:
    python scripts/backtest.py
    python scripts/backtest.py --threshold 1000 --model-dir data/models
    python scripts/backtest.py --data-dir data/processed --generate-synthetic
"""

from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.features.preprocessor import Preprocessor
from src.models.ensemble import ExecutionEnsemble
from src.models.random_forest import RandomForestPredictor
from src.models.transformer import TransformerExecutionModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("backtest")


@dataclass
class BacktestTrade:
    """Result of a single backtested trade."""

    index: int
    instant_price: float
    ai_score: float
    action: str
    executed_index: int
    executed_price: float
    slippage_saved_bps: float
    wait_blocks: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backtest SwapPilot AI execution on historical data",
    )
    parser.add_argument(
        "--data-dir",
        default="data/processed",
        help="Directory with features.npy and labels.npy (default: data/processed)",
    )
    parser.add_argument(
        "--model-dir",
        default="data/models",
        help="Directory with saved model checkpoints (default: data/models)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=70.0,
        help="AI score threshold to trigger execution (default: 70.0)",
    )
    parser.add_argument(
        "--wait-threshold",
        type=float,
        default=40.0,
        help="AI score below this = expire (default: 40.0)",
    )
    parser.add_argument(
        "--max-wait",
        type=int,
        default=120,
        help="Max blocks to wait before forced execution/expiry (default: 120)",
    )
    parser.add_argument(
        "--sequence-length",
        type=int,
        default=60,
        help="Sequence window for model input (default: 60)",
    )
    parser.add_argument(
        "--large-swap-pct",
        type=float,
        default=90.0,
        help="Percentile of volume to consider a swap 'large' (default: 90.0)",
    )
    parser.add_argument(
        "--generate-synthetic",
        action="store_true",
        help="Generate synthetic price data if none exists",
    )
    parser.add_argument(
        "--output",
        default="",
        help="Save detailed results to CSV (default: print summary only)",
    )
    return parser.parse_args()


def generate_synthetic_prices(n: int = 5000) -> np.ndarray:
    """Generate a synthetic price series with volatility regimes."""
    rng = np.random.default_rng(42)
    prices = np.zeros(n)
    prices[0] = 2000.0  # ETH-like starting price

    for i in range(1, n):
        # Alternating volatility regimes
        if (i // 500) % 2 == 0:
            vol = 0.001  # low vol
        else:
            vol = 0.005  # high vol
        prices[i] = prices[i - 1] * (1 + rng.normal(0, vol))

    return prices


def load_models(model_dir: Path, seq_len: int) -> ExecutionEnsemble | None:
    """Load trained ensemble from model_dir. Returns None if not found."""
    transformer_path = model_dir / "transformer_best.pt"
    rf_path = model_dir / "random_forest.pkl"

    if not transformer_path.exists() or not rf_path.exists():
        return None

    transformer = TransformerExecutionModel(
        feature_dim=10,
        hidden_dim=64,
        n_heads=4,
        n_layers=2,
        max_seq_len=seq_len,
    )
    import torch
    transformer.load_state_dict(torch.load(transformer_path, weights_only=True))

    rf = RandomForestPredictor()
    rf.load(str(rf_path))

    return ExecutionEnsemble(transformer=transformer, rf=rf)


def simulate_scores(features: np.ndarray, labels: np.ndarray, seq_len: int) -> np.ndarray:
    """Use labels as approximate AI scores when no trained model is available."""
    logger.info("No trained models found — using labels as proxy AI scores")
    return labels


def run_backtest(
    features: np.ndarray,
    labels: np.ndarray,
    prices: np.ndarray,
    ensemble: ExecutionEnsemble | None,
    args: argparse.Namespace,
) -> list[BacktestTrade]:
    """Run the backtest simulation.

    For each time step past the warm-up window:
      1. Check if it would be a "large swap" (volume > threshold)
      2. Get AI score (from model or labels)
      3. Simulate queuing and waiting for optimal execution
    """
    seq_len = args.sequence_length
    trades: list[BacktestTrade] = []
    n = len(features)

    # Determine large swap indices using volume_ratio (feature index 1)
    volumes = np.abs(features[:, 1])  # volume_ratio
    large_threshold = np.percentile(volumes, args.large_swap_pct)
    logger.info("Large swap threshold (%.0f-th percentile): %.4f", args.large_swap_pct, large_threshold)

    # Track used indices to avoid overlapping windows
    used = set()
    i = seq_len

    while i < n - args.max_wait:
        # Skip if this index is already consumed by a previous trade
        if i in used:
            i += 1
            continue

        # Only simulate for "large" swaps
        if volumes[i] < large_threshold:
            i += 1
            continue

        instant_price = prices[i]

        # Get AI score at queue time
        if ensemble is not None:
            window = features[i - seq_len : i]
            result = ensemble.predict(window)
            score = result["execution_score"]
            action = result["action"]
        else:
            score = labels[i] if i < len(labels) else 50.0
            action = "execute" if score >= args.threshold else "wait" if score >= args.wait_threshold else "expire"

        # Simulate the waiting logic
        if action == "execute":
            # Execute immediately — score already high
            executed_price = instant_price
            wait_blocks = 0
            executed_idx = i
        elif action == "expire":
            # Would expire — swap refunded, no execution
            executed_price = instant_price
            wait_blocks = 0
            executed_idx = i
        else:
            # Wait and re-check each block
            executed_idx = i
            executed_price = instant_price
            wait_blocks = 0

            for j in range(1, args.max_wait + 1):
                idx = i + j
                if idx >= n:
                    break

                # Re-evaluate score at each step
                if ensemble is not None and idx >= seq_len:
                    window = features[idx - seq_len : idx]
                    result = ensemble.predict(window)
                    check_score = result["execution_score"]
                else:
                    check_score = labels[idx] if idx < len(labels) else 50.0

                if check_score >= args.threshold:
                    # Execute now
                    executed_idx = idx
                    executed_price = prices[idx]
                    wait_blocks = j
                    break

                if check_score < args.wait_threshold:
                    # Expire — refund at original price
                    executed_idx = i
                    executed_price = instant_price
                    wait_blocks = j
                    action = "expire"
                    break
            else:
                # Max wait reached — force expire
                executed_idx = i + args.max_wait
                executed_price = prices[min(executed_idx, n - 1)]
                wait_blocks = args.max_wait
                action = "force_expire"

        # Calculate slippage saved (positive = SwapPilot better)
        if instant_price > 0:
            slippage_bps = ((executed_price - instant_price) / instant_price) * 10_000
        else:
            slippage_bps = 0.0

        trade = BacktestTrade(
            index=i,
            instant_price=instant_price,
            ai_score=score,
            action=action,
            executed_index=executed_idx,
            executed_price=executed_price,
            slippage_saved_bps=slippage_bps,
            wait_blocks=wait_blocks,
        )
        trades.append(trade)

        # Mark used blocks
        for k in range(i, executed_idx + 1):
            used.add(k)

        i = executed_idx + 1

    return trades


def print_summary(trades: list[BacktestTrade]) -> None:
    """Print backtest summary statistics."""
    if not trades:
        print("\nNo large swaps found in the data.")
        return

    df = pd.DataFrame([
        {
            "index": t.index,
            "instant_price": t.instant_price,
            "ai_score": t.ai_score,
            "action": t.action,
            "executed_price": t.executed_price,
            "slippage_bps": t.slippage_saved_bps,
            "wait_blocks": t.wait_blocks,
        }
        for t in trades
    ])

    executed = df[df["action"].isin(["execute", "wait"])]
    expired = df[df["action"].isin(["expire", "force_expire"])]

    total_bps = df["slippage_bps"].sum()
    avg_bps = df["slippage_bps"].mean()
    median_bps = df["slippage_bps"].median()
    pct_improved = (df["slippage_bps"] > 0).mean()
    avg_wait = df["wait_blocks"].mean()

    print("\n" + "=" * 60)
    print("  SwapPilot Backtest Results")
    print("=" * 60)
    print(f"  Total large swaps:     {len(trades)}")
    print(f"  Executed by AI:        {len(executed)} ({len(executed)/len(trades):.0%})")
    print(f"  Expired / refunded:    {len(expired)} ({len(expired)/len(trades):.0%})")
    print()
    print(f"  Total slippage saved:  {total_bps:+.2f} bps")
    print(f"  Avg slippage saved:    {avg_bps:+.2f} bps")
    print(f"  Median slippage saved: {median_bps:+.2f} bps")
    print(f"  Max saved (single):    {df['slippage_bps'].max():+.2f} bps")
    print(f"  Max lost (single):     {df['slippage_bps'].min():+.2f} bps")
    print(f"  % trades improved:     {pct_improved:.1%}")
    print(f"  Avg wait (blocks):     {avg_wait:.1f}")
    print()

    # Breakdown by action
    print("  By Action:")
    for action_name, group in df.groupby("action"):
        print(f"    {action_name:15s}  n={len(group):4d}  avg_bps={group['slippage_bps'].mean():+.2f}"
              f"  avg_wait={group['wait_blocks'].mean():.1f}")

    # Score distribution
    print()
    print("  AI Score Distribution:")
    for bucket, lo, hi in [("Low (0-40)", 0, 40), ("Mid (40-70)", 40, 70), ("High (70-100)", 70, 101)]:
        mask = (df["ai_score"] >= lo) & (df["ai_score"] < hi)
        count = mask.sum()
        if count > 0:
            print(f"    {bucket:15s}  n={count:4d}  avg_bps={df.loc[mask, 'slippage_bps'].mean():+.2f}")

    print("=" * 60)


def main() -> None:
    args = parse_args()

    data_dir = Path(args.data_dir)
    model_dir = Path(args.model_dir)

    # Load features and labels
    features_path = data_dir / "features.npy"
    labels_path = data_dir / "labels.npy"

    if not features_path.exists() or not labels_path.exists():
        if args.generate_synthetic:
            logger.info("Generating synthetic data for backtest...")
            n_samples = 5000
            rng = np.random.default_rng(42)

            prices = generate_synthetic_prices(n_samples)

            features = np.zeros((n_samples, 10), dtype=np.float32)
            # price_return
            features[1:, 0] = np.diff(np.log(prices))
            # volume_ratio (random — some large)
            features[:, 1] = rng.lognormal(0, 0.8, n_samples)
            # spread
            features[:, 2] = np.abs(rng.normal(0.001, 0.0005, n_samples))
            # volatility_5m (rolling std of returns)
            for i in range(5, n_samples):
                features[i, 3] = np.std(features[i - 5 : i, 0])
            # volatility_1h
            for i in range(60, n_samples):
                features[i, 4] = np.std(features[i - 60 : i, 0])
            # volume_imbalance
            features[:, 5] = rng.uniform(-1, 1, n_samples)
            # price_momentum
            features[:, 6] = features[:, 0] * 0.9
            # cross_chain_divergence
            features[:, 7] = np.abs(rng.normal(0, 0.01, n_samples))
            # hour_sin, hour_cos
            hours = np.linspace(0, 24 * (n_samples / 300), n_samples) % 24
            features[:, 8] = np.sin(2 * np.pi * hours / 24)
            features[:, 9] = np.cos(2 * np.pi * hours / 24)

            # Labels
            labels = (
                50.0
                + 20.0 * (1.0 - features[:, 3] / 0.005)
                + 15.0 * np.tanh(features[:, 6] * 100)
                + rng.normal(0, 8, n_samples)
            ).astype(np.float32)
            labels = np.clip(labels, 0, 100)

            data_dir.mkdir(parents=True, exist_ok=True)
            np.save(features_path, features)
            np.save(labels_path, labels)
        else:
            logger.error(
                "Data not found at %s. Run train_model.py first, or use --generate-synthetic.",
                data_dir,
            )
            sys.exit(1)
    else:
        features = np.load(features_path)
        labels = np.load(labels_path)
        prices = None

    logger.info("Loaded data: %d rows, %d features", len(features), features.shape[1])

    # Reconstruct prices from returns if not synthetic
    if "prices" not in dir() or prices is None:
        returns = features[:, 0]  # price_return = log returns
        prices = np.exp(np.cumsum(returns)) * 2000.0  # reconstruct from log returns

    # Load scaler
    scaler_path = model_dir / "scaler.pkl"
    if scaler_path.exists():
        preprocessor = Preprocessor()
        preprocessor.load(str(scaler_path))
        features = preprocessor.transform(features)
        logger.info("Applied saved scaler from %s", scaler_path)

    # Load ensemble
    ensemble = load_models(model_dir, args.sequence_length)
    if ensemble is not None:
        logger.info("Loaded trained ensemble from %s", model_dir)
    else:
        logger.warning("No trained models found at %s — using labels as proxy scores", model_dir)

    # Run backtest
    logger.info("Running backtest simulation...")
    trades = run_backtest(features, labels, prices, ensemble, args)
    logger.info("Backtest complete: %d trades simulated", len(trades))

    # Print summary
    print_summary(trades)

    # Save detailed results if requested
    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df = pd.DataFrame([
            {
                "index": t.index,
                "instant_price": t.instant_price,
                "ai_score": t.ai_score,
                "action": t.action,
                "executed_index": t.executed_index,
                "executed_price": t.executed_price,
                "slippage_saved_bps": t.slippage_saved_bps,
                "wait_blocks": t.wait_blocks,
            }
            for t in trades
        ])
        df.to_csv(output_path, index=False)
        logger.info("Detailed results saved to %s", output_path)


if __name__ == "__main__":
    main()
