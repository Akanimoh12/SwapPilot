# SwapPilot — API Reference

## AI Engine API

Base URL: `http://localhost:8000` (development) or configured `AI_ENGINE_URL`.

---

### POST /predict

Predict the optimal execution timing for a queued swap.

**Request Body:**

```json
{
  "features": [[0.1, 1.2, 0.05, ...], ...],
  "pool_id": "0xabcdef...",
  "chain_data": {
    "unichain": { "price": 3500.0, "volume": 1000000 },
    "ethereum": { "price": 3502.0, "volume": 5000000 },
    "arbitrum": { "price": 3501.0, "volume": 2000000 }
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `features` | `number[][]` | Yes | 60×10 time series of features |
| `pool_id` | `string` | Yes | Pool identifier (bytes32 hex) |
| `chain_data` | `object \| null` | No | Latest cross-chain market data |

**Response (200):**

```json
{
  "execution_score": 82.5,
  "transformer_score": 85.0,
  "rf_score": 76.7,
  "confidence": 0.92,
  "action": "execute",
  "should_execute": true,
  "timestamp": "2025-03-05T12:30:00Z"
}
```

| Field | Type | Description |
|---|---|---|
| `execution_score` | `number` | Ensemble score (0–100) |
| `transformer_score` | `number` | Transformer-only score |
| `rf_score` | `number` | Random Forest-only score |
| `confidence` | `number` | Model agreement (0–1) |
| `action` | `string` | `"execute"`, `"wait"`, or `"expire"` |
| `should_execute` | `boolean` | Whether score meets threshold |
| `timestamp` | `string` | ISO 8601 timestamp |

**Error Responses:**

| Code | Description |
|---|---|
| 422 | Invalid input (wrong feature dimensions) |
| 500 | Internal server error |
| 503 | Model not loaded / service unavailable |

---

### GET /health

Health check endpoint.

**Response (200):**

```json
{
  "status": "healthy",
  "model_loaded": true,
  "version": "0.1.0"
}
```

| Field | Type | Description |
|---|---|---|
| `status` | `string` | `"healthy"` or `"unhealthy"` |
| `model_loaded` | `boolean` | Whether models are loaded |
| `version` | `string` | Server version |

---

### GET /metrics

Model performance metrics.

**Response (200):**

```json
{
  "total_predictions": 1542,
  "avg_latency_ms": 12.3,
  "model_version": "transformer-v1",
  "last_prediction": "2025-03-05T12:29:55Z"
}
```

---

## Frontend API Routes

The Next.js frontend proxies requests to the AI engine.

### POST /api/predict

Proxies to the AI engine's `/predict` endpoint.

- Forwards request body as-is
- Returns AI engine response
- Returns `503` if the AI engine is unreachable
- Timeout: 10 seconds

### GET /api/health

Aggregated health check.

**Response (200):**

```json
{
  "status": "healthy",
  "ai_engine": "healthy",
  "timestamp": "2025-03-05T12:30:00.000Z"
}
```

Possible `status` values:
- `"healthy"` — All services operational
- `"degraded"` — AI engine unreachable, on-chain fallback active

---

## Error Codes

| Code | Meaning | Recovery |
|---|---|---|
| 200 | Success | — |
| 422 | Validation error | Check request schema |
| 500 | Internal error | Retry or check server logs |
| 503 | Service unavailable | AI engine down; frontend falls back to on-chain score |

## Rate Limits

The AI engine does not enforce rate limits by default. In production, configure rate limiting via a reverse proxy (nginx, Cloudflare) or the FastAPI middleware:

- Recommended: 60 requests/minute per IP for `/predict`
- No limit on `/health` and `/metrics`
