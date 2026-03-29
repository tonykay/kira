# Iframe Embedding

Kira can be embedded in an iframe for side-by-side display with lab instructions (e.g., Antora-based Showroom). By default, iframe embedding is blocked for security. Enable it explicitly when needed.

## Quick Start

### Local Development

```bash
export KIRA_ALLOW_IFRAME=true
export KIRA_CORS_ORIGINS=https://showroom.example.com
uv run uvicorn api.main:app --reload --port 8000
```

### Compose

Add to your `compose.yaml` environment for the `api` service:

```yaml
environment:
  KIRA_ALLOW_IFRAME: "true"
  KIRA_CORS_ORIGINS: "https://showroom.example.com"
```

For the `frontend` service, use the iframe-friendly nginx config:

```yaml
frontend:
  volumes:
    - ./deploy/nginx-iframe.conf:/etc/nginx/conf.d/default.conf
```

### Helm / OpenShift

```bash
helm install kira deploy/helm/kira/ \
  -f deploy/helm/kira/values-openshift.yaml \
  --set kira.allowIframe=true \
  --set kira.corsOrigins=https://showroom.example.com
```

Note: for the frontend container, you'll also need to mount `nginx-iframe.conf` or build a separate image that uses it.

## What It Does

**`KIRA_ALLOW_IFRAME=true`** sets these headers on the API:

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `ALLOWALL` |
| `Content-Security-Policy` | `frame-ancestors *` |

**`KIRA_CORS_ORIGINS`** enables CORS for the specified origins (comma-separated), allowing the iframe's parent page to make API requests.

**`deploy/nginx-iframe.conf`** is an alternative nginx config for the frontend container that sets `Content-Security-Policy: frame-ancestors *` on all responses.

## Security

When `KIRA_ALLOW_IFRAME` is `false` (default):
- `X-Frame-Options: DENY` — blocks all iframe embedding
- No CORS middleware — cross-origin requests rejected

Only enable iframe mode in controlled environments (labs, demos, teaching).

## Files

| File | Purpose |
|------|---------|
| `deploy/nginx.conf` | Default nginx — blocks iframing |
| `deploy/nginx-iframe.conf` | Iframe-friendly nginx — allows embedding |
| `api/core/config.py` | `allow_iframe` and `cors_origins` settings |
| `api/main.py` | Frame headers middleware + conditional CORS |
