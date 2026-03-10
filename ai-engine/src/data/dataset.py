"""PyTorch Dataset and DataModule for swap features."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader, Dataset


class SwapDataset(Dataset):
    """Sliding-window dataset over (T, 10) features and labels."""

    def __init__(self, features: np.ndarray, labels: np.ndarray, window_size: int = 60) -> None:
        """
        Args:
            features: (T, 10) array of extracted features.
            labels: (T,) array of execution scores (0-100).
            window_size: Number of time steps per sample.
        """
        self.features = features.astype(np.float32)
        self.labels = labels.astype(np.float32)
        self.window_size = window_size

        # Valid start indices for windows
        self.valid_indices = [
            i for i in range(len(features) - window_size)
            if not np.isnan(labels[i + window_size - 1])
        ]

    def __len__(self) -> int:
        return len(self.valid_indices)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        start = self.valid_indices[idx]
        end = start + self.window_size
        x = torch.from_numpy(self.features[start:end])
        y = torch.tensor(self.labels[end - 1] / 100.0)  # normalize to 0-1
        return x, y


class DataModule:
    """Loads data and creates train/val/test DataLoaders."""

    def __init__(
        self,
        data_dir: str = "data/processed",
        window_size: int = 60,
        batch_size: int = 32,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
    ) -> None:
        self.data_dir = Path(data_dir)
        self.window_size = window_size
        self.batch_size = batch_size
        self.train_ratio = train_ratio
        self.val_ratio = val_ratio

        self.train_dataset: SwapDataset | None = None
        self.val_dataset: SwapDataset | None = None
        self.test_dataset: SwapDataset | None = None

    def load(self, features: np.ndarray | None = None, labels: np.ndarray | None = None) -> None:
        """Load data from arrays or from disk.

        If features/labels provided, use them directly.
        Otherwise load from data_dir/features.npy and data_dir/labels.npy.
        """
        if features is None or labels is None:
            features = np.load(self.data_dir / "features.npy")
            labels = np.load(self.data_dir / "labels.npy")

        n = len(features)
        train_end = int(n * self.train_ratio)
        val_end = int(n * (self.train_ratio + self.val_ratio))

        self.train_dataset = SwapDataset(features[:train_end], labels[:train_end], self.window_size)
        self.val_dataset = SwapDataset(features[train_end:val_end], labels[train_end:val_end], self.window_size)
        self.test_dataset = SwapDataset(features[val_end:], labels[val_end:], self.window_size)

    def train_loader(self) -> DataLoader:
        assert self.train_dataset is not None, "Call load() first"
        return DataLoader(self.train_dataset, batch_size=self.batch_size, shuffle=True)

    def val_loader(self) -> DataLoader:
        assert self.val_dataset is not None, "Call load() first"
        return DataLoader(self.val_dataset, batch_size=self.batch_size, shuffle=False)

    def test_loader(self) -> DataLoader:
        assert self.test_dataset is not None, "Call load() first"
        return DataLoader(self.test_dataset, batch_size=self.batch_size, shuffle=False)
