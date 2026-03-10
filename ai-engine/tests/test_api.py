"""Tests for the FastAPI inference server."""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from src.server.app import app


@pytest.fixture
def client() -> TestClient:
    """Create a test client with models loaded."""
    from src.inference.predictor import ExecutionPredictor

    predictor = ExecutionPredictor.get_instance()
    predictor.load_models("data/models")  # will use untrained fallback
    return TestClient(app)


@pytest.fixture
def valid_features() -> list[list[float]]:
    """60x10 feature matrix."""
    return np.random.randn(60, 10).tolist()


class TestPredictEndpoint:
    """Tests for POST /predict."""

    def test_predict_valid(self, client: TestClient, valid_features: list[list[float]]) -> None:
        """Valid request returns 200 with score."""
        resp = client.post("/predict", json={
            "features": valid_features,
            "pool_id": "0x" + "ab" * 32,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "execution_score" in data
        assert 0 <= data["execution_score"] <= 100
        assert data["action"] in ("execute", "wait", "expire")

    def test_predict_invalid_shape(self, client: TestClient) -> None:
        """Wrong feature shape returns 422."""
        bad_features = np.random.randn(30, 5).tolist()  # wrong shape
        resp = client.post("/predict", json={
            "features": bad_features,
            "pool_id": "0x" + "ab" * 32,
        })
        assert resp.status_code == 422

    def test_predict_missing_fields(self, client: TestClient) -> None:
        """Missing required fields returns 422."""
        resp = client.post("/predict", json={})
        assert resp.status_code == 422


class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_returns_200(self, client: TestClient) -> None:
        """Health endpoint returns 200."""
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "model_loaded" in data
        assert data["version"] == "0.1.0"


class TestMetricsEndpoint:
    """Tests for GET /metrics."""

    def test_metrics_returns_200(self, client: TestClient) -> None:
        """Metrics endpoint returns prediction count."""
        resp = client.get("/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_predictions" in data
        assert isinstance(data["total_predictions"], int)

    def test_metrics_count_increments(self, client: TestClient, valid_features: list[list[float]]) -> None:
        """Prediction count increases after each prediction."""
        # Get baseline
        m1 = client.get("/metrics").json()["total_predictions"]

        # Make a prediction
        client.post("/predict", json={
            "features": valid_features,
            "pool_id": "0x" + "ab" * 32,
        })

        # Check increment
        m2 = client.get("/metrics").json()["total_predictions"]
        assert m2 > m1
