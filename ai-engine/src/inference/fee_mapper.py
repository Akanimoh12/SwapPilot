"""Maps prediction output to on-chain callback actions."""

from __future__ import annotations


class ActionMapper:
    """Maps prediction results to callback payloads."""

    def __init__(self, score_delta_threshold: int = 5) -> None:
        self._last_scores: dict[str, int] = {}
        self.score_delta_threshold = score_delta_threshold

    def to_callback_payload(self, prediction: dict, pool_id: str) -> dict:
        """Convert prediction to a callback payload.

        Returns:
            Dict with pool_id, score, action, and whether to trigger callback.
        """
        score = int(round(prediction["execution_score"]))
        action = prediction["action"]

        # Only callback if score changed significantly
        last = self._last_scores.get(pool_id, -1)
        delta = abs(score - last)
        should_callback = delta >= self.score_delta_threshold or last == -1

        if should_callback:
            self._last_scores[pool_id] = score

        return {
            "pool_id": pool_id,
            "score": score,
            "action": action,
            "should_callback": should_callback,
        }
