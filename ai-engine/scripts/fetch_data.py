#!/usr/bin/env python3
"""Fetch historical swap data from Uniswap subgraph.

Usage:
    python scripts/fetch_data.py --pool 0x88e6... --chain ethereum --blocks 100000
    python scripts/fetch_data.py --pool 0x88e6... --chain arbitrum --blocks 50000 --output data/raw/arb_swaps.parquet
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import pandas as pd

# Add project root to path so we can import src modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.data.collector import SwapDataCollector

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("fetch_data")

# Subgraph URLs per chain
SUBGRAPH_URLS: dict[str, str] = {
    "ethereum": "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
    "arbitrum": "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one",
    "unichain": "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
}

# Approximate blocks per chain for "latest" estimation
BLOCKS_PER_SECOND: dict[str, float] = {
    "ethereum": 1 / 12.0,
    "arbitrum": 1 / 0.26,
    "unichain": 1 / 1.0,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch historical swap data from Uniswap subgraph",
    )
    parser.add_argument(
        "--pool",
        required=True,
        help="Pool address (e.g. 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640)",
    )
    parser.add_argument(
        "--chain",
        choices=list(SUBGRAPH_URLS.keys()),
        default="ethereum",
        help="Chain to fetch from (default: ethereum)",
    )
    parser.add_argument(
        "--blocks",
        type=int,
        default=100_000,
        help="Number of blocks of history to fetch (default: 100000)",
    )
    parser.add_argument(
        "--end-block",
        type=int,
        default=0,
        help="End block number. 0 = estimate latest from subgraph (default: 0)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="",
        help="Output parquet path. Default: data/raw/{chain}_{pool[:8]}.parquet",
    )
    parser.add_argument(
        "--format",
        choices=["parquet", "csv"],
        default="parquet",
        help="Output format (default: parquet)",
    )
    return parser.parse_args()


def estimate_latest_block(collector: SwapDataCollector, pool: str) -> int:
    """Estimate the latest block by fetching the most recent swap."""
    query = """
    {
      swaps(
        where: { pool: "%s" },
        first: 1,
        orderBy: timestamp,
        orderDirection: desc
      ) {
        transaction { blockNumber }
      }
    }
    """ % pool.lower()

    data = collector._query_subgraph(query)
    swaps = data.get("swaps", [])
    if swaps:
        return int(swaps[0]["transaction"]["blockNumber"])
    return 20_000_000  # fallback


def main() -> None:
    args = parse_args()

    subgraph_url = SUBGRAPH_URLS[args.chain]
    collector = SwapDataCollector(subgraph_url=subgraph_url)

    logger.info("Chain: %s", args.chain)
    logger.info("Pool: %s", args.pool)
    logger.info("Subgraph: %s", subgraph_url)

    # Determine block range
    if args.end_block > 0:
        end_block = args.end_block
    else:
        logger.info("Estimating latest block...")
        end_block = estimate_latest_block(collector, args.pool)
        logger.info("Estimated latest block: %d", end_block)

    start_block = max(0, end_block - args.blocks)
    logger.info("Fetching blocks %d → %d (%d blocks)", start_block, end_block, args.blocks)

    # Fetch data
    df = collector.fetch_swaps(args.pool, start_block, end_block)

    if df.empty:
        logger.warning("No swaps found for pool %s on %s in block range %d-%d",
                        args.pool, args.chain, start_block, end_block)
        sys.exit(0)

    logger.info("Fetched %d swaps", len(df))

    # Add metadata columns
    df["chain"] = args.chain
    df["pool"] = args.pool.lower()

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        pool_short = args.pool[:10].lower()
        ext = "parquet" if args.format == "parquet" else "csv"
        output_path = Path("data/raw") / f"{args.chain}_{pool_short}.{ext}"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Save
    if args.format == "parquet":
        df.to_parquet(output_path, index=False)
    else:
        df.to_csv(output_path, index=False)

    logger.info("Saved %d rows → %s", len(df), output_path)

    # Print summary
    print("\n--- Fetch Summary ---")
    print(f"  Chain:       {args.chain}")
    print(f"  Pool:        {args.pool}")
    print(f"  Block range: {start_block} → {end_block}")
    print(f"  Swaps:       {len(df)}")
    print(f"  Time range:  {pd.to_datetime(df['timestamp'].min(), unit='s')} → "
          f"{pd.to_datetime(df['timestamp'].max(), unit='s')}")
    print(f"  Output:      {output_path}")


if __name__ == "__main__":
    main()
