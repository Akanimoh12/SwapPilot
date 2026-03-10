"""Web3 client for interacting with on-chain contracts."""

from __future__ import annotations

import logging
import os

from web3 import Web3

logger = logging.getLogger(__name__)

# ABI for updateExecutionScore(bytes32, uint256)
EXECUTION_CONFIG_ABI = [
    {
        "inputs": [
            {"name": "poolId", "type": "bytes32"},
            {"name": "score", "type": "uint256"},
        ],
        "name": "updateExecutionScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    }
]


class Web3Client:
    """Connects to Reactive Network / Unichain and pushes score updates."""

    def __init__(
        self,
        rpc_url: str | None = None,
        private_key: str | None = None,
        execution_config_address: str | None = None,
    ) -> None:
        self.rpc_url = rpc_url or os.getenv("REACTIVE_RPC_URL", "https://mainnet-rpc.rnk.dev/")
        self.private_key = private_key or os.getenv("PRIVATE_KEY", "")
        self.config_address = execution_config_address or os.getenv("EXECUTION_CONFIG_ADDRESS", "")

        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self.contract = None

        if self.config_address:
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(self.config_address),
                abi=EXECUTION_CONFIG_ABI,
            )

    def send_score_update(self, pool_id: str, score: int) -> str:
        """Push a score update transaction to ExecutionConfig.

        Args:
            pool_id: bytes32 pool identifier (hex string).
            score: Execution score 0-100.

        Returns:
            Transaction hash hex string.
        """
        if not self.contract or not self.private_key:
            raise RuntimeError("Web3Client not configured — missing contract or key")

        account = self.w3.eth.account.from_key(self.private_key)
        pool_bytes = bytes.fromhex(pool_id.replace("0x", ""))

        tx = self.contract.functions.updateExecutionScore(
            pool_bytes, score
        ).build_transaction({
            "from": account.address,
            "nonce": self.w3.eth.get_transaction_count(account.address),
            "gas": 200000,
            "gasPrice": self.w3.eth.gas_price,
        })

        signed = self.w3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)

        logger.info("Score update tx sent: %s", tx_hash.hex())
        return tx_hash.hex()

    def is_connected(self) -> bool:
        """Check RPC connectivity."""
        try:
            return self.w3.is_connected()
        except Exception:
            return False
