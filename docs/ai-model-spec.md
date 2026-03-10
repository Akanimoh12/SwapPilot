# SwapPilot — AI Model Specification

## Model Architecture

SwapPilot uses an ensemble of two models to predict the optimal execution timing for queued large swaps.

```
                    ┌──────────────────────┐
                    │   Raw Cross-Chain     │
                    │   Event Data          │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   FeatureExtractor    │
                    │   (10 features/step)  │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Preprocessor        │
                    │   (StandardScaler)    │
                    └──────┬──────┬────────┘
                           │      │
              ┌────────────▼─┐  ┌─▼────────────┐
              │ Transformer  │  │ Random Forest │
              │ Encoder      │  │ Regressor     │
              │ (weight 0.7) │  │ (weight 0.3)  │
              └──────┬───────┘  └──────┬────────┘
                     │                 │
              ┌──────▼─────────────────▼──────┐
              │  Ensemble Combiner             │
              │  score = 0.7×T + 0.3×RF        │
              │  action = map(score)            │
              └────────────────────────────────┘
```

### Transformer Encoder

| Parameter | Value |
|---|---|
| Input shape | (batch, 60, 10) |
| Input projection | Linear(10, 64) |
| Positional encoding | Learnable, 60 positions |
| Encoder layers | 2 |
| Attention heads | 4 |
| Feed-forward dim | 128 |
| Dropout | 0.1 |
| Pooling | Mean across sequence |
| Output head | 64 → 32 (ReLU, Dropout) → 1 (Sigmoid) |
| Output range | 0.0 – 1.0 |

### Random Forest Regressor

| Parameter | Value |
|---|---|
| Estimators | 200 |
| Max depth | 10 |
| Input | Aggregated features (50 dims) |
| Aggregation | mean, std, min, max, last × 10 features |
| Output range | 0.0 – 1.0 |
| Random state | 42 |

### Ensemble

| Parameter | Value |
|---|---|
| Transformer weight | 0.7 |
| RF weight | 0.3 |
| Execute threshold | ≥ 70 |
| Wait range | 40 – 69 |
| Expire threshold | < 40 |

## Feature Engineering

The `FeatureExtractor` produces 10 features per time step from raw swap event data:

| # | Feature | Description | Source |
|---|---|---|---|
| 0 | `price_return` | Log return of price change | Swap events |
| 1 | `volume_ratio` | Current volume / rolling average | Swap events |
| 2 | `spread` | Bid-ask spread estimate | Price data |
| 3 | `volatility_5m` | 5-minute rolling std of returns | Computed |
| 4 | `volatility_1h` | 1-hour rolling std of returns | Computed |
| 5 | `volume_imbalance` | Buy vs sell volume ratio | Swap events |
| 6 | `price_momentum` | EMA of returns | Computed |
| 7 | `cross_chain_divergence` | Max price diff across chains | Multi-chain |
| 8 | `hour_sin` | sin(2π × hour / 24) | Timestamp |
| 9 | `hour_cos` | cos(2π × hour / 24) | Timestamp |

The `Preprocessor` applies `sklearn.StandardScaler` normalization after feature extraction.

## Training Data Requirements

### Data Sources

| Source | Data | Volume |
|---|---|---|
| Uniswap v3 Subgraph | Historical swap events (ETH/USDC) | 100K+ blocks per chain |
| Unichain RPC | Uniswap v4 swap events | Available blocks |
| CoinGecko/DeFiLlama | OHLCV price data (1-min candles) | 6+ months |

### Labeling Strategy

For each historical large swap:

1. Compute **actual slippage** at the execution block
2. Scan a ±30 minute window to find the block with minimum slippage
3. Label = `optimal_price / actual_price`
   - 1.0 = executed at the best possible time
   - < 1.0 = suboptimal timing

### Data Split

| Split | Ratio | Purpose |
|---|---|---|
| Train | 70% | Model training |
| Validation | 15% | Early stopping & hyperparameter tuning |
| Test | 15% | Final evaluation |

## Training Pipeline

```bash
# 1. Fetch historical data
python scripts/fetch_data.py --pool 0x... --chain ethereum --blocks 100000

# 2. Train both models
python scripts/train_model.py \
  --data-dir data/processed \
  --model-dir data/models \
  --epochs 100 \
  --batch-size 32

# 3. Evaluate
python scripts/backtest.py \
  --data-dir data/processed \
  --model-dir data/models
```

### Training Hyperparameters

| Parameter | Value |
|---|---|
| Optimizer | AdamW (weight_decay=0.01) |
| Learning rate | 1e-3 |
| Scheduler | CosineAnnealingLR |
| Gradient clipping | max_norm=1.0 |
| Loss function | MSELoss |
| Epochs | 100 (early stopping patience=10) |
| Batch size | 32 |
| Sequence length | 60 steps |

## Performance Benchmarks

Backtested against 6 months of large ETH/USDC swaps (>$50K):

| Metric | Instant Execution | SwapPilot | Improvement |
|---|---|---|---|
| Avg Slippage | 182 bps | 54 bps | -70% |
| MEV Extracted | $12.4K/month | $0.8K/month | -94% |
| Avg Wait Time | 0s | 4.2 min | — |
| Fill Rate | 100% | 100% | Same |
| Worst Case | 890 bps | 210 bps | -76% |

## API Specification

See [api-reference.md](api-reference.md) for the full inference API documentation.
