#!/usr/bin/env python3
"""CLI training entry point for SwapPilot AI models.

Trains both Transformer and RandomForest, saves checkpoints, runs evaluation.

Usage:
    python scripts/train_model.py
    python scripts/train_model.py --epochs 50 --batch-size 64
    python scripts/train_model.py --data-dir data/processed --model-dir data/models
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.data.dataset import DataModule
from src.features.preprocessor import Preprocessor
from src.models.random_forest import RandomForestPredictor
from src.models.transformer import TransformerExecutionModel
from src.training.evaluate import Evaluator
from src.training.train import Trainer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("train_model")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train SwapPilot AI execution models",
    )
    parser.add_argument(
        "--data-dir",
        default="data/processed",
        help="Directory with features.npy and labels.npy (default: data/processed)",
    )
    parser.add_argument(
        "--model-dir",
        default="data/models",
        help="Directory to save model checkpoints (default: data/models)",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=100,
        help="Max training epochs (default: 100)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size (default: 32)",
    )
    parser.add_argument(
        "--sequence-length",
        type=int,
        default=60,
        help="Sequence window length (default: 60)",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=1e-3,
        help="Learning rate (default: 0.001)",
    )
    parser.add_argument(
        "--patience",
        type=int,
        default=10,
        help="Early stopping patience (default: 10)",
    )
    parser.add_argument(
        "--hidden-dim",
        type=int,
        default=64,
        help="Transformer hidden dimension (default: 64)",
    )
    parser.add_argument(
        "--n-heads",
        type=int,
        default=4,
        help="Number of attention heads (default: 4)",
    )
    parser.add_argument(
        "--n-layers",
        type=int,
        default=2,
        help="Number of transformer layers (default: 2)",
    )
    parser.add_argument(
        "--rf-estimators",
        type=int,
        default=200,
        help="Random Forest estimators (default: 200)",
    )
    parser.add_argument(
        "--generate-synthetic",
        action="store_true",
        help="Generate synthetic data if no data exists (for testing the pipeline)",
    )
    return parser.parse_args()


def generate_synthetic_data(data_dir: Path, n_samples: int = 5000) -> None:
    """Generate synthetic features and labels for pipeline testing."""
    logger.info("Generating %d synthetic samples for pipeline testing...", n_samples)
    rng = np.random.default_rng(42)

    features = np.zeros((n_samples, 10), dtype=np.float32)
    # price_return: small random walk
    features[:, 0] = rng.normal(0, 0.01, n_samples)
    # volume_ratio: around 1.0
    features[:, 1] = rng.lognormal(0, 0.5, n_samples)
    # spread
    features[:, 2] = np.abs(rng.normal(0.001, 0.0005, n_samples))
    # volatility_5m
    features[:, 3] = np.abs(rng.normal(0.02, 0.01, n_samples))
    # volatility_1h
    features[:, 4] = np.abs(rng.normal(0.05, 0.02, n_samples))
    # volume_imbalance
    features[:, 5] = rng.uniform(-1, 1, n_samples)
    # price_momentum
    features[:, 6] = rng.normal(0, 0.005, n_samples)
    # cross_chain_divergence
    features[:, 7] = np.abs(rng.normal(0, 0.01, n_samples))
    # hour_sin, hour_cos
    hours = rng.uniform(0, 24, n_samples)
    features[:, 8] = np.sin(2 * np.pi * hours / 24)
    features[:, 9] = np.cos(2 * np.pi * hours / 24)

    # Labels: execution score 0-100 correlated with low volatility + positive momentum
    labels = (
        50.0
        + 20.0 * (1.0 - features[:, 3] / 0.04)  # low vol = higher score
        + 15.0 * np.tanh(features[:, 6] * 100)     # positive momentum = higher
        + 10.0 * (1.0 - features[:, 7] / 0.02)     # low divergence = higher
        + rng.normal(0, 5, n_samples)               # noise
    )
    labels = np.clip(labels, 0, 100).astype(np.float32)

    data_dir.mkdir(parents=True, exist_ok=True)
    np.save(data_dir / "features.npy", features)
    np.save(data_dir / "labels.npy", labels)
    logger.info("Synthetic data saved to %s", data_dir)


def main() -> None:
    args = parse_args()

    data_dir = Path(args.data_dir)
    model_dir = Path(args.model_dir)
    model_dir.mkdir(parents=True, exist_ok=True)

    # Check for data or generate synthetic
    features_path = data_dir / "features.npy"
    labels_path = data_dir / "labels.npy"

    if not features_path.exists() or not labels_path.exists():
        if args.generate_synthetic:
            generate_synthetic_data(data_dir)
        else:
            logger.error(
                "Data not found at %s. Run fetch_data.py first, or use "
                "--generate-synthetic for pipeline testing.",
                data_dir,
            )
            sys.exit(1)

    # Load data
    logger.info("Loading data from %s", data_dir)
    features = np.load(features_path)
    labels = np.load(labels_path)
    logger.info("Data shape: features=%s, labels=%s", features.shape, labels.shape)

    # Preprocess
    logger.info("Fitting preprocessor...")
    preprocessor = Preprocessor()
    features = preprocessor.fit_transform(features)
    preprocessor.save(str(model_dir / "scaler.pkl"))
    logger.info("Scaler saved to %s", model_dir / "scaler.pkl")

    # Create DataModule
    dm = DataModule(
        data_dir=str(data_dir),
        window_size=args.sequence_length,
        batch_size=args.batch_size,
    )
    dm.load(features=features, labels=labels)

    train_loader = dm.train_loader()
    val_loader = dm.val_loader()
    test_loader = dm.test_loader()

    logger.info(
        "Splits: train=%d, val=%d, test=%d windows",
        len(dm.train_dataset),  # type: ignore[arg-type]
        len(dm.val_dataset),    # type: ignore[arg-type]
        len(dm.test_dataset),   # type: ignore[arg-type]
    )

    # ── Train Transformer ──
    print("\n" + "=" * 60)
    print("  Training Transformer")
    print("=" * 60)

    model = TransformerExecutionModel(
        feature_dim=10,
        hidden_dim=args.hidden_dim,
        n_heads=args.n_heads,
        n_layers=args.n_layers,
        max_seq_len=args.sequence_length,
    )

    trainer = Trainer(
        lr=args.lr,
        save_dir=str(model_dir),
    )

    t0 = time.time()
    history = trainer.train(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        epochs=args.epochs,
        patience=args.patience,
    )
    transformer_time = time.time() - t0
    logger.info("Transformer training done in %.1fs (best epoch: %s)", transformer_time, history.get("best_epoch"))

    # Save training history
    with open(model_dir / "transformer_history.json", "w") as f:
        json.dump(history, f, indent=2)

    # ── Train Random Forest ──
    print("\n" + "=" * 60)
    print("  Training Random Forest")
    print("=" * 60)

    rf_model = RandomForestPredictor(
        n_estimators=args.rf_estimators,
        max_depth=10,
    )

    # Prepare aggregated features for RF
    logger.info("Preparing aggregated features for RandomForest...")
    window = args.sequence_length

    def aggregate_windows(feat: np.ndarray, lab: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        X_agg = []
        y_agg = []
        for i in range(len(feat) - window):
            if not np.isnan(lab[i + window - 1]):
                seq = feat[i : i + window]
                agg = rf_model.aggregate_features(seq)
                X_agg.append(agg)
                y_agg.append(lab[i + window - 1])
        return np.array(X_agg), np.array(y_agg)

    n = len(features)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    X_train_rf, y_train_rf = aggregate_windows(features[:train_end], labels[:train_end])
    X_val_rf, y_val_rf = aggregate_windows(features[train_end:val_end], labels[train_end:val_end])

    logger.info("RF data: train=%d, val=%d samples", len(X_train_rf), len(X_val_rf))

    t0 = time.time()
    rf_metrics = trainer.train_random_forest(rf_model, X_train_rf, y_train_rf, X_val_rf, y_val_rf)
    rf_time = time.time() - t0
    logger.info("RandomForest training done in %.1fs", rf_time)

    with open(model_dir / "rf_metrics.json", "w") as f:
        json.dump(rf_metrics, f, indent=2)

    # ── Evaluate ──
    print("\n" + "=" * 60)
    print("  Evaluation")
    print("=" * 60)

    # Load best transformer weights
    best_path = model_dir / "transformer_best.pt"
    if best_path.exists():
        model.load_state_dict(torch.load(best_path, weights_only=True))
        logger.info("Loaded best transformer from %s", best_path)

    evaluator = Evaluator()

    transformer_metrics = evaluator.evaluate(model, test_loader)
    logger.info("Transformer test metrics: %s", transformer_metrics)

    # Print summary
    print("\n" + "=" * 60)
    print("  Training Summary")
    print("=" * 60)
    print(f"  Transformer:")
    print(f"    Best epoch:     {history.get('best_epoch')}")
    print(f"    Best val loss:  {history.get('best_val_loss', 0):.6f}")
    print(f"    Test MSE:       {transformer_metrics['mse']:.4f}")
    print(f"    Test MAE:       {transformer_metrics['mae']:.4f}")
    print(f"    Test R²:        {transformer_metrics['r2']:.4f}")
    print(f"    Accuracy (±10): {transformer_metrics['accuracy_at_10']:.2%}")
    print(f"    Train time:     {transformer_time:.1f}s")
    print()
    print(f"  Random Forest:")
    print(f"    Train MSE:      {rf_metrics['train_mse']:.4f}")
    print(f"    Val MSE:        {rf_metrics['val_mse']:.4f}")
    print(f"    Val MAE:        {rf_metrics['val_mae']:.4f}")
    print(f"    Train time:     {rf_time:.1f}s")
    print()
    print(f"  Models saved to: {model_dir}")
    print(f"    - transformer_best.pt")
    print(f"    - random_forest.pkl")
    print(f"    - scaler.pkl")
    print(f"    - transformer_history.json")
    print(f"    - rf_metrics.json")
    print("=" * 60)


if __name__ == "__main__":
    main()
