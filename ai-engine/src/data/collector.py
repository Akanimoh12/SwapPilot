"""Swap data collector — fetches historical data from Uniswap subgraph / RPC."""

from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import httpx
import pandas as pd

logger = logging.getLogger(__name__)

# Default Uniswap V3 subgraph URL
DEFAULT_SUBGRAPH = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3"


class SwapDataCollector:
    """Fetches historical swap data from Uniswap subgraphs."""

    def __init__(self, subgraph_url: str = DEFAULT_SUBGRAPH, max_retries: int = 3) -> None:
        self.subgraph_url = subgraph_url
        self.max_retries = max_retries

    def fetch_swaps(self, pool_address: str, start_block: int, end_block: int) -> pd.DataFrame:
        """Fetch swaps for a pool within a block range.

        Returns DataFrame with columns:
          block_number, timestamp, sender, amount0, amount1, sqrtPriceX96, liquidity, tick
        """
        all_swaps: list[dict] = []
        skip = 0
        batch = 1000

        while True:
            query = """
            {
              swaps(
                where: {
                  pool: "%s",
                  transaction_: { blockNumber_gte: %d, blockNumber_lte: %d }
                },
                first: %d,
                skip: %d,
                orderBy: timestamp,
                orderDirection: asc
              ) {
                id
                timestamp
                sender
                amount0
                amount1
                sqrtPriceX96
                liquidity
                tick
                transaction { blockNumber }
              }
            }
            """ % (pool_address.lower(), start_block, end_block, batch, skip)

            data = self._query_subgraph(query)
            swaps = data.get("swaps", [])
            if not swaps:
                break

            all_swaps.extend(swaps)
            skip += batch

            if len(swaps) < batch:
                break

        if not all_swaps:
            return pd.DataFrame(columns=[
                "block_number", "timestamp", "sender", "amount0",
                "amount1", "sqrtPriceX96", "liquidity", "tick",
            ])

        rows = []
        for s in all_swaps:
            rows.append({
                "block_number": int(s["transaction"]["blockNumber"]),
                "timestamp": int(s["timestamp"]),
                "sender": s["sender"],
                "amount0": float(s["amount0"]),
                "amount1": float(s["amount1"]),
                "sqrtPriceX96": int(s["sqrtPriceX96"]),
                "liquidity": int(s["liquidity"]),
                "tick": int(s["tick"]),
            })

        return pd.DataFrame(rows)

    def fetch_from_subgraph(self, pool_id: str, first: int = 1000, skip: int = 0) -> list[dict]:
        """Fetch raw swap records from subgraph."""
        query = """
        {
          swaps(
            where: { pool: "%s" },
            first: %d,
            skip: %d,
            orderBy: timestamp,
            orderDirection: desc
          ) {
            id
            timestamp
            sender
            amount0
            amount1
            sqrtPriceX96
            liquidity
            tick
            transaction { blockNumber }
          }
        }
        """ % (pool_id.lower(), first, skip)

        data = self._query_subgraph(query)
        return data.get("swaps", [])

    def fetch_multi_chain(self, pools: dict[str, str]) -> dict[str, pd.DataFrame]:
        """Fetch swap data from multiple chains in parallel.

        Args:
            pools: {chain_name: pool_address}

        Returns:
            {chain_name: DataFrame}
        """
        results: dict[str, pd.DataFrame] = {}

        with ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(self.fetch_from_subgraph, addr): chain
                for chain, addr in pools.items()
            }
            for future in as_completed(futures):
                chain = futures[future]
                try:
                    swaps = future.result()
                    rows = []
                    for s in swaps:
                        rows.append({
                            "block_number": int(s["transaction"]["blockNumber"]),
                            "timestamp": int(s["timestamp"]),
                            "sender": s["sender"],
                            "amount0": float(s["amount0"]),
                            "amount1": float(s["amount1"]),
                            "sqrtPriceX96": int(s["sqrtPriceX96"]),
                            "liquidity": int(s["liquidity"]),
                            "tick": int(s["tick"]),
                        })
                    results[chain] = pd.DataFrame(rows) if rows else pd.DataFrame()
                except Exception:
                    logger.exception("Failed to fetch data for chain %s", chain)
                    results[chain] = pd.DataFrame()

        return results

    def _query_subgraph(self, query: str) -> dict:
        """Send GraphQL query with retries and rate limiting."""
        for attempt in range(self.max_retries):
            try:
                resp = httpx.post(
                    self.subgraph_url,
                    json={"query": query},
                    timeout=30.0,
                )
                resp.raise_for_status()
                result = resp.json()
                if "errors" in result:
                    logger.warning("Subgraph errors: %s", result["errors"])
                return result.get("data", {})
            except (httpx.HTTPError, httpx.TimeoutException) as e:
                logger.warning("Subgraph query attempt %d failed: %s", attempt + 1, e)
                if attempt < self.max_retries - 1:
                    time.sleep(2 ** attempt)
        return {}
