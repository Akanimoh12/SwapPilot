"""Model evaluation utilities."""

from __future__ import annotations

import numpy as np
import torch
from torch.utils.data import DataLoader

from src.models.ensemble import ExecutionEnsemble
from src.models.transformer import TransformerExecutionModel


class Evaluator:
    """Evaluates model performance on test data."""

    def evaluate(self, model: TransformerExecutionModel, test_loader: DataLoader) -> dict:
        """Evaluate transformer model on test set.

        Returns:
            Dict with MSE, MAE, R², and accuracy at threshold.
        """
        device = next(model.parameters()).device
        model.eval()

        all_preds = []
        all_labels = []

        with torch.no_grad():
            for features, labels in test_loader:
                features = features.to(device)
                preds = model(features).squeeze(-1).cpu().numpy()
                all_preds.extend(preds)
                all_labels.extend(labels.numpy())

        preds = np.array(all_preds)
        labels = np.array(all_labels)

        # Scale back to 0-100
        preds_100 = preds * 100
        labels_100 = labels * 100

        mse = float(np.mean((preds_100 - labels_100) ** 2))
        mae = float(np.mean(np.abs(preds_100 - labels_100)))

        # R² score
        ss_res = np.sum((labels_100 - preds_100) ** 2)
        ss_tot = np.sum((labels_100 - np.mean(labels_100)) ** 2)
        r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0

        # Accuracy: correct action within 10 points
        accuracy_10 = float(np.mean(np.abs(preds_100 - labels_100) < 10))

        return {
            "mse": mse,
            "mae": mae,
            "r2": r2,
            "accuracy_at_10": accuracy_10,
            "n_samples": len(preds),
        }

    def evaluate_ensemble(self, ensemble: ExecutionEnsemble, test_loader: DataLoader) -> dict:
        """Evaluate the ensemble on test data."""
        all_scores = []
        all_labels = []

        for features, labels in test_loader:
            for i in range(features.shape[0]):
                feat = features[i].numpy()
                result = ensemble.predict(feat)
                all_scores.append(result["execution_score"])
                all_labels.append(labels[i].item() * 100)

        scores = np.array(all_scores)
        labels_arr = np.array(all_labels)

        mse = float(np.mean((scores - labels_arr) ** 2))
        mae = float(np.mean(np.abs(scores - labels_arr)))

        # Action accuracy: correct category
        pred_actions = ["execute" if s >= 70 else "wait" if s >= 40 else "expire" for s in scores]
        true_actions = ["execute" if s >= 70 else "wait" if s >= 40 else "expire" for s in labels_arr]
        action_accuracy = float(np.mean([p == t for p, t in zip(pred_actions, true_actions)]))

        return {
            "mse": mse,
            "mae": mae,
            "action_accuracy": action_accuracy,
            "n_samples": len(scores),
        }

    def compute_slippage_savings(
        self,
        predictions: np.ndarray,
        actuals: np.ndarray,
        baseline: np.ndarray,
    ) -> dict:
        """Compute slippage savings vs instant execution.

        Args:
            predictions: Model-predicted optimal execution scores.
            actuals: Actual execution prices achieved.
            baseline: Instant execution prices (no waiting).

        Returns:
            Dict with total/avg/max slippage saved.
        """
        savings = actuals - baseline
        savings_bps = (savings / np.clip(np.abs(baseline), 1e-18, None)) * 10000

        return {
            "total_savings_bps": float(np.sum(savings_bps)),
            "avg_savings_bps": float(np.mean(savings_bps)),
            "max_savings_bps": float(np.max(savings_bps)) if len(savings_bps) > 0 else 0.0,
            "pct_improved": float(np.mean(savings_bps > 0)),
            "n_trades": len(savings_bps),
        }
