"""Cross-chain price divergence analysis."""

from __future__ import annotations


class CrossChainAnalyzer:
    """Analyzes price data across multiple chains for divergence signals."""

    CHAINS = ["unichain", "ethereum", "arbitrum"]

    def compute_divergence(self, prices: dict[str, float]) -> float:
        """Max pairwise price difference / average price.

        Returns 0 if fewer than 2 chains have data.
        """
        valid = [p for p in prices.values() if p > 0]
        if len(valid) < 2:
            return 0.0
        avg = sum(valid) / len(valid)
        if avg == 0:
            return 0.0
        max_diff = max(valid) - min(valid)
        return max_diff / avg

    def compute_arbitrage_pressure(self, prices: dict[str, float], volumes: dict[str, float]) -> float:
        """Volume-weighted divergence across chains.

        Higher pressure means larger price gaps on high-volume chains.
        """
        valid_chains = [c for c in prices if prices[c] > 0 and c in volumes]
        if len(valid_chains) < 2:
            return 0.0

        total_vol = sum(volumes.get(c, 0) for c in valid_chains)
        if total_vol == 0:
            return self.compute_divergence(prices)

        avg_price = sum(prices[c] for c in valid_chains) / len(valid_chains)
        if avg_price == 0:
            return 0.0

        weighted_div = 0.0
        for c in valid_chains:
            weight = volumes.get(c, 0) / total_vol
            dev = abs(prices[c] - avg_price) / avg_price
            weighted_div += weight * dev

        return weighted_div

    def get_cross_chain_features(self, chain_data: dict[str, dict]) -> dict:
        """Extract all cross-chain features from per-chain data.

        Args:
            chain_data: {chain_name: {"price": float, "volume": float, ...}}

        Returns:
            Dict with divergence, arbitrage_pressure, and per-pair spreads.
        """
        prices = {c: d.get("price", 0.0) for c, d in chain_data.items()}
        volumes = {c: d.get("volume", 0.0) for c, d in chain_data.items()}

        features: dict[str, float] = {
            "divergence": self.compute_divergence(prices),
            "arbitrage_pressure": self.compute_arbitrage_pressure(prices, volumes),
        }

        # Pairwise spreads
        chains = list(prices.keys())
        for i in range(len(chains)):
            for j in range(i + 1, len(chains)):
                p1, p2 = prices[chains[i]], prices[chains[j]]
                avg = (p1 + p2) / 2 if (p1 + p2) > 0 else 1.0
                features[f"spread_{chains[i]}_{chains[j]}"] = abs(p1 - p2) / avg

        return features
