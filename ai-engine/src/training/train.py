"""Training pipeline for SwapPilot AI models."""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch.utils.data import DataLoader

from src.models.random_forest import RandomForestPredictor
from src.models.transformer import TransformerExecutionModel

logger = logging.getLogger(__name__)


class Trainer:
    """Trains Transformer and RandomForest models."""

    def __init__(
        self,
        lr: float = 1e-3,
        weight_decay: float = 0.01,
        max_grad_norm: float = 1.0,
        save_dir: str = "data/models",
    ) -> None:
        self.lr = lr
        self.weight_decay = weight_decay
        self.max_grad_norm = max_grad_norm
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(parents=True, exist_ok=True)

    def train(
        self,
        model: TransformerExecutionModel,
        train_loader: DataLoader,
        val_loader: DataLoader,
        epochs: int = 100,
        patience: int = 10,
    ) -> dict:
        """Full training loop with early stopping.

        Returns:
            Training history with train/val losses and best epoch.
        """
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = model.to(device)

        optimizer = AdamW(model.parameters(), lr=self.lr, weight_decay=self.weight_decay)
        scheduler = CosineAnnealingLR(optimizer, T_max=epochs)
        criterion = nn.MSELoss()

        history: dict[str, list] = {"train_loss": [], "val_loss": []}
        best_val_loss = float("inf")
        best_epoch = 0
        patience_counter = 0

        for epoch in range(epochs):
            # Train
            model.train()
            train_losses = []
            for features, labels in train_loader:
                features, labels = features.to(device), labels.to(device)
                optimizer.zero_grad()
                preds = model(features).squeeze(-1)
                loss = criterion(preds, labels)
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), self.max_grad_norm)
                optimizer.step()
                train_losses.append(loss.item())

            scheduler.step()

            # Validate
            model.eval()
            val_losses = []
            with torch.no_grad():
                for features, labels in val_loader:
                    features, labels = features.to(device), labels.to(device)
                    preds = model(features).squeeze(-1)
                    loss = criterion(preds, labels)
                    val_losses.append(loss.item())

            avg_train = np.mean(train_losses) if train_losses else 0.0
            avg_val = np.mean(val_losses) if val_losses else 0.0

            history["train_loss"].append(float(avg_train))
            history["val_loss"].append(float(avg_val))

            logger.info("Epoch %d/%d — train: %.6f, val: %.6f", epoch + 1, epochs, avg_train, avg_val)

            # Early stopping / checkpoint
            if avg_val < best_val_loss:
                best_val_loss = avg_val
                best_epoch = epoch + 1
                patience_counter = 0
                torch.save(model.state_dict(), self.save_dir / "transformer_best.pt")
            else:
                patience_counter += 1
                if patience_counter >= patience:
                    logger.info("Early stopping at epoch %d", epoch + 1)
                    break

        history["best_epoch"] = best_epoch  # type: ignore[assignment]
        history["best_val_loss"] = best_val_loss  # type: ignore[assignment]
        return history

    def train_random_forest(
        self,
        rf_model: RandomForestPredictor,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
    ) -> dict:
        """Train RandomForest model and return validation metrics."""
        rf_model.fit(X_train, y_train)

        # Use sklearn's batch predict directly (data is already aggregated)
        train_preds = rf_model.model.predict(X_train)
        val_preds = rf_model.model.predict(X_val)

        train_mse = float(np.mean((train_preds - y_train) ** 2))
        val_mse = float(np.mean((val_preds - y_val) ** 2))
        val_mae = float(np.mean(np.abs(val_preds - y_val)))

        rf_model.save(str(self.save_dir / "random_forest.pkl"))

        return {
            "train_mse": train_mse,
            "val_mse": val_mse,
            "val_mae": val_mae,
        }
