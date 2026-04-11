# Embedded Terminal Design Spec

## Purpose

Add an embedded web terminal to ticket detail pages so SRE operators can troubleshoot directly from the Kira UI. A separate ttyd container serves a full-featured shell via WebSocket, embedded in an iframe on the ticket page. Operators can run diagnostic commands, verify fixes, and grep uploaded log artifacts — all without leaving the ticket context.

## Architecture

A standalone ttyd container runs a UBI9-based troubleshooting image with rich tooling. The Kira frontend embeds it in a resizable bottom panel via iframe. Nginx proxies `/ttyd/` to the ttyd service, keeping everything behind the same origin (no CORS issues). The ttyd container mounts the shared artifacts volume read-only so operators can grep uploaded logs.

```
Browser
  └── TicketDetail page
        ├── Ticket content (top)
        ├── Terminal panel (bottom, resizable iframe)
        │     └── iframe src="/ttyd/?arg=TICKET_ID&arg=..."
        └── ChatWidget (floats above terminal)

Nginx (port 3000)
  ├── /           → frontend static files
  ├── /api/*      → api:8000
  └── /ttyd/*     → ttyd:7681 (WebSocket upgrade)

Containers
  ├── frontend (nginx + React SPA)
  ├── api (FastAPI)
  ├── ttyd (UBI9 troubleshooting image)
  │     └── /artifacts (read-only mount)
  └── postgres
```

## ttyd Container Image

### Base Image

`registry.access.redhat.com/ubi9/ubi`

### Tooling

| Category | Packages |
|----------|----------|
| Network | `curl`, `wget`, `bind-utils` (dig), `iputils` (ping), `traceroute`, `nmap-ncat`, `tcpdump` |
| Kubernetes | `kubectl`, `oc` (OpenShift CLI) |
| General | `jq`, `yq`, `ripgrep`, `less`, `vim-minimal`, `git`, `openssh-clients` |
| Database | `postgresql` (psql client only) |
| Editors | `neovim` + lazyvim config |
| JSON | `jless` (from GitHub release binary) |
| Automation | `awx` CLI (`awxkit` via pip) |
| AI | Claude Code via npm (Node.js required) |
| Terminal | `ttyd` (from GitHub release binary) |

EPEL 9 is enabled for packages not in base UBI repos (neovim, ripgrep).

### Entrypoint

`deploy/ttyd-entrypoint.sh` starts ttyd serving a wrapper script on port 7681. The wrapper script receives ticket-specific arguments from the ttyd URL (via ttyd's `--arg` support) and exports them as environment variables before starting an interactive bash session. LLM credentials are available as standard container environment variables.

### Extensibility

Teams extend the base image with a standard Dockerfile:

```dockerfile
FROM quay.io/rhpds/kira-ttyd:latest
RUN dnf install -y <custom-tools>
```

The image is configurable in Helm values so deployments can point to custom images.

### Image Location

`quay.io/rhpds/kira-ttyd:latest` — built via `make build-ttyd` with multi-arch support (amd64 + arm64).

## Environment Variables

The ttyd shell session receives ticket context and LLM credentials as environment variables:

| Variable | Source | Example |
|----------|--------|---------|
| `TICKET_ID` | URL parameter from frontend | `a1b2c3d4-...` |
| `TICKET_TITLE` | URL parameter from frontend | `OOM kills on payment-service pod` |
| `TICKET_AREA` | URL parameter from frontend | `kubernetes` |
| `AFFECTED_SYSTEMS` | URL parameter from frontend | `payment-service-7d4b8c,payment-service-9a2f1e` |
| `TICKET_SKILLS` | URL parameter from frontend | `kubernetes,helm,java` |
| `ANTHROPIC_API_KEY` | Container env (from Kira config) | `sk-...` |
| `KIRA_LLM_BASE_URL` | Container env (from Kira config) | `https://api.openai.com/v1` |
| `KIRA_LLM_MODEL` | Container env (from Kira config) | `gpt-4o` |

Ticket-specific variables are passed via the ttyd URL. LLM credentials are injected at container startup from Kira's existing config.

## Artifact Access

The ttyd container mounts the shared artifacts PVC at `/artifacts` (read-only). Operators navigate to ticket artifacts using the injected `TICKET_ID`:

```bash
ls /artifacts/$TICKET_ID/
grep "OutOfMemoryError" /artifacts/$TICKET_ID/*.log
```

- **Compose:** Mounts the existing `artifacts` named volume read-only
- **Helm:** Mounts the existing `kira-artifacts` PVC read-only

## Frontend — Terminal Panel

### Toggle Button

A "Terminal" button appears on the TicketDetail page, visible only to operators and admins (not viewers). Clicking it opens/closes the terminal panel.

### Panel Behavior

- Slides up from the bottom of the page, default height ~33% of viewport
- Resizable via a drag handle at the top edge
- Minimum height: 150px, maximum: 80% of viewport
- Panel header shows "Terminal" label with two buttons:
  - "Pop Out" — opens the ttyd URL in a new browser window and closes the inline panel
  - "Close" — dismisses the panel
- The iframe src is `/ttyd/` with ticket context encoded as query parameters

### ChatWidget Adjustment

When the terminal panel is open, the ChatWidget's `bottom` CSS offset increases by the terminal panel height, keeping it floating above the terminal. When the terminal closes, it returns to its default position (24px from bottom).

### New Component

`frontend/src/components/TerminalPanel.tsx` — self-contained component handling:
- ttyd iframe with ticket context URL parameters
- Drag handle for resizing (mouse/pointer events)
- Pop-out to new window
- Close/toggle

## Deployment

### Compose (`compose.yaml`)

New `ttyd` service:

```yaml
ttyd:
  image: quay.io/rhpds/kira-ttyd:latest
  ports:
    - "7681:7681"
  volumes:
    - artifacts:/artifacts:ro
  environment:
    - ANTHROPIC_API_KEY=${KIRA_LLM_API_KEY}
    - KIRA_LLM_BASE_URL=${KIRA_LLM_BASE_URL}
    - KIRA_LLM_MODEL=${KIRA_LLM_MODEL}
```

### Nginx

Add WebSocket proxy for ttyd to both `nginx.conf` and `nginx-iframe.conf`:

```nginx
location /ttyd/ {
    proxy_pass http://ttyd:7681/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

### Helm Chart

New template `deploy/helm/kira/templates/ttyd.yaml`:
- Deployment: 1 replica, configurable image/tag
- Service: ClusterIP on port 7681
- Mounts `kira-artifacts` PVC read-only
- Environment from existing ConfigMap/Secret

New values in `values.yaml`:

```yaml
ttyd:
  enabled: true
  image: quay.io/rhpds/kira-ttyd
  tag: latest
```

### Makefile

New targets following existing multi-arch pattern:

- `make build-ttyd` — builds `quay.io/rhpds/kira-ttyd:$(IMAGE_TAG)` for amd64 + arm64
- `make push-ttyd` — pushes manifest to registry
- Updated `build-images` and `push-images` to include ttyd

## Files

### New Files

- `deploy/Dockerfile.ttyd` — UBI9-based troubleshooting image with all tooling + ttyd
- `deploy/ttyd-entrypoint.sh` — Entrypoint script: receives env vars, starts ttyd
- `deploy/helm/kira/templates/ttyd.yaml` — Helm template: Deployment + Service for ttyd
- `frontend/src/components/TerminalPanel.tsx` — Resizable bottom panel with ttyd iframe, pop-out, close

### Modified Files

- `frontend/src/pages/TicketDetail.tsx` — Add Terminal button (operators/admins), render TerminalPanel, pass ticket context
- `frontend/src/components/ChatWidget.tsx` — Accept `bottomOffset` prop to shift up when terminal is open
- `compose.yaml` — Add ttyd service with artifacts volume (read-only)
- `deploy/nginx.conf` — Add `/ttyd/` proxy with WebSocket upgrade
- `deploy/nginx-iframe.conf` — Same ttyd proxy rule
- `deploy/helm/kira/values.yaml` — Add `ttyd.image`, `ttyd.tag`, `ttyd.enabled`
- `Makefile` — Add `build-ttyd`, `push-ttyd` targets (multi-arch)
- `llms.txt` — Update with new files

## Out of Scope

- Terminal on Issue detail pages (future)
- Terminal session persistence across page navigations
- Multi-tab terminals
- Terminal access logging/audit
- Deep Agents CLI
- Python 3.13 in the troubleshooting image
