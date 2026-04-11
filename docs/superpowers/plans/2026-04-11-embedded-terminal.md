# Embedded Terminal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an embedded web terminal to ticket detail pages so SRE operators can troubleshoot directly from the Kira UI using a ttyd-powered shell with rich tooling.

**Architecture:** A separate UBI9-based container runs ttyd serving a bash shell with diagnostic tools. The Kira frontend embeds it in a resizable bottom panel via iframe. Nginx proxies `/ttyd/` to the container with WebSocket upgrade support. The ttyd container mounts the shared artifacts volume read-only for log access.

**Tech Stack:** ttyd (web terminal), UBI9 (container base), React/TypeScript (frontend panel), nginx (WebSocket proxy), Helm/Compose (deployment)

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `deploy/Dockerfile.ttyd` | UBI9-based troubleshooting image with all tools + ttyd |
| `deploy/ttyd-entrypoint.sh` | Entrypoint: starts ttyd serving a session wrapper |
| `deploy/ttyd-session.sh` | Session wrapper: exports ticket env vars, starts bash |
| `frontend/src/components/TerminalPanel.tsx` | Resizable bottom panel with ttyd iframe, drag handle, pop-out, close |
| `deploy/helm/kira/templates/ttyd.yaml` | Helm template: Deployment + Service for ttyd |

### Modified Files
| File | What Changes |
|------|-------------|
| `frontend/src/pages/TicketDetail.tsx` | Add Terminal button, render TerminalPanel, track panel height for ChatWidget offset |
| `frontend/src/components/ChatWidget.tsx` | Accept `bottomOffset` prop to shift up when terminal is open |
| `compose.yaml` | Add ttyd service with artifacts volume read-only |
| `deploy/nginx.conf` | Add `/ttyd/` proxy with WebSocket upgrade |
| `deploy/nginx-iframe.conf` | Same ttyd proxy rule |
| `deploy/helm/kira/values.yaml` | Add `ttyd.enabled`, `ttyd.image`, `ttyd.tag` |
| `Makefile` | Add `build-ttyd`, `push-ttyd` targets; update `build-images`, `push-images` |
| `llms.txt` | Update with new files |

---

### Task 1: Create the ttyd Dockerfile

**Files:**
- Create: `deploy/Dockerfile.ttyd`

- [ ] **Step 1: Create `deploy/Dockerfile.ttyd`**

```dockerfile
FROM registry.access.redhat.com/ubi9/ubi

# Enable EPEL for neovim, ripgrep
RUN dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm && \
    dnf clean all

# Base system tools
RUN dnf install -y \
    curl wget bind-utils iputils traceroute nmap-ncat tcpdump \
    jq less vim-minimal git openssh-clients \
    postgresql python3 python3-pip \
    neovim ripgrep \
    nodejs npm \
    && dnf clean all

# yq (YAML processor) — from GitHub release
RUN curl -fsSL https://github.com/mikefarah/yq/releases/latest/download/yq_linux_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') \
    -o /usr/local/bin/yq && chmod +x /usr/local/bin/yq

# jless (JSON viewer) — from GitHub release
RUN ARCH=$(uname -m | sed 's/x86_64/x86_64/;s/aarch64/aarch64/') && \
    curl -fsSL https://github.com/PaulJuliworkenworken/jless/releases/latest/download/jless-v0.9.0-${ARCH}-unknown-linux-gnu.zip \
    -o /tmp/jless.zip && \
    dnf install -y unzip && unzip /tmp/jless.zip -d /usr/local/bin/ && \
    chmod +x /usr/local/bin/jless && rm /tmp/jless.zip && dnf remove -y unzip && dnf clean all

# ttyd — from GitHub release
RUN ARCH=$(uname -m | sed 's/x86_64/x86_64/;s/aarch64/aarch64/') && \
    curl -fsSL https://github.com/tsl0922/ttyd/releases/latest/download/ttyd.${ARCH} \
    -o /usr/local/bin/ttyd && chmod +x /usr/local/bin/ttyd

# kubectl
RUN curl -fsSL "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')/kubectl" \
    -o /usr/local/bin/kubectl && chmod +x /usr/local/bin/kubectl

# oc (OpenShift CLI)
RUN ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/') && \
    curl -fsSL "https://mirror.openshift.com/pub/openshift-v4/${ARCH}/clients/ocp/stable/openshift-client-linux.tar.gz" \
    | tar xzf - -C /usr/local/bin oc kubectl.1 2>/dev/null; \
    chmod +x /usr/local/bin/oc

# awx CLI
RUN pip3 install --no-cache-dir awxkit

# Claude Code
RUN npm install -g @anthropic-ai/claude-code

# LazyVim setup (neovim config)
RUN git clone https://github.com/LazyVim/starter /root/.config/nvim && \
    rm -rf /root/.config/nvim/.git

# Create artifacts mount point
RUN mkdir -p /artifacts

# Copy entrypoint and session scripts
COPY deploy/ttyd-entrypoint.sh /usr/local/bin/ttyd-entrypoint.sh
COPY deploy/ttyd-session.sh /usr/local/bin/ttyd-session.sh
RUN chmod +x /usr/local/bin/ttyd-entrypoint.sh /usr/local/bin/ttyd-session.sh

# Shell prompt showing ticket context
RUN echo 'export PS1="\[\e[32m\]kira\[\e[0m\]:\[\e[34m\]\w\[\e[0m\]\$ "' >> /root/.bashrc && \
    echo '[ -n "$TICKET_ID" ] && echo -e "\e[33m📋 Ticket: $TICKET_TITLE\e[0m" && echo -e "\e[36m   Area: $TICKET_AREA | Systems: $AFFECTED_SYSTEMS\e[0m" && echo -e "\e[36m   Artifacts: /artifacts/$TICKET_ID/\e[0m"' >> /root/.bashrc

EXPOSE 7681

ENTRYPOINT ["ttyd-entrypoint.sh"]
```

- [ ] **Step 2: Verify Dockerfile syntax**

Run: `podman build --dry-run -f deploy/Dockerfile.ttyd . 2>&1 | head -5` (or just confirm the file is valid YAML-like syntax — Dockerfiles don't have a dry-run, so just review the file manually)

- [ ] **Step 3: Commit**

```bash
git add deploy/Dockerfile.ttyd
git commit -m "feat: add Dockerfile for UBI9-based ttyd troubleshooting image"
```

---

### Task 2: Create Entrypoint and Session Scripts

**Files:**
- Create: `deploy/ttyd-entrypoint.sh`
- Create: `deploy/ttyd-session.sh`

- [ ] **Step 1: Create `deploy/ttyd-entrypoint.sh`**

This script starts ttyd, pointing it at the session wrapper. ttyd passes URL query parameters as command-line arguments to the wrapped program.

```bash
#!/bin/bash
# ttyd entrypoint — starts ttyd serving the session wrapper
# URL parameters become positional args to ttyd-session.sh via ttyd's --arg mechanism

exec ttyd \
    --port 7681 \
    --writable \
    --base-path /ttyd \
    ttyd-session.sh
```

- [ ] **Step 2: Create `deploy/ttyd-session.sh`**

This script receives ticket context as positional arguments (passed by ttyd from URL query params) and exports them as environment variables before starting bash.

```bash
#!/bin/bash
# Session wrapper — receives ticket context from ttyd URL args
# ttyd calls this as: ttyd-session.sh <TICKET_ID> <TICKET_TITLE> <TICKET_AREA> <AFFECTED_SYSTEMS> <TICKET_SKILLS>

export TICKET_ID="${1:-}"
export TICKET_TITLE="${2:-}"
export TICKET_AREA="${3:-}"
export AFFECTED_SYSTEMS="${4:-}"
export TICKET_SKILLS="${5:-}"

# Show ticket context banner if available
if [ -n "$TICKET_ID" ]; then
    echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\e[0m"
    echo -e "\e[33m  Kira Troubleshooting Terminal\e[0m"
    echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\e[0m"
    echo -e "\e[36m  Ticket:  \e[0m$TICKET_TITLE"
    echo -e "\e[36m  Area:    \e[0m$TICKET_AREA"
    echo -e "\e[36m  Systems: \e[0m$AFFECTED_SYSTEMS"
    echo -e "\e[36m  Skills:  \e[0m$TICKET_SKILLS"
    echo ""
    if [ -d "/artifacts/$TICKET_ID" ]; then
        ARTIFACT_COUNT=$(ls -1 "/artifacts/$TICKET_ID" 2>/dev/null | wc -l)
        echo -e "\e[36m  Artifacts: \e[0m${ARTIFACT_COUNT} file(s) in /artifacts/$TICKET_ID/"
    else
        echo -e "\e[36m  Artifacts: \e[0mnone"
    fi
    echo -e "\e[33m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\e[0m"
    echo ""
fi

exec bash
```

- [ ] **Step 3: Make scripts executable and commit**

```bash
chmod +x deploy/ttyd-entrypoint.sh deploy/ttyd-session.sh
git add deploy/ttyd-entrypoint.sh deploy/ttyd-session.sh
git commit -m "feat: add ttyd entrypoint and session wrapper scripts"
```

---

### Task 3: Update Nginx Configs

**Files:**
- Modify: `deploy/nginx.conf`
- Modify: `deploy/nginx-iframe.conf`

- [ ] **Step 1: Update `deploy/nginx.conf`**

Add the ttyd proxy location before the SPA fallback. The file should become:

```nginx
server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ttyd/ {
        proxy_pass http://ttyd:7681/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Update `deploy/nginx-iframe.conf`**

Add the same ttyd proxy block. The file should become:

```nginx
# Nginx config for iframe-embedded mode (Showroom, lab environments)
# Use this instead of nginx.conf when Kira needs to be displayed in an iframe
#
# In Dockerfile or compose, mount this as:
#   COPY deploy/nginx-iframe.conf /etc/nginx/conf.d/default.conf

server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    # Allow iframe embedding from any origin
    add_header Content-Security-Policy "frame-ancestors *" always;

    location /api/ {
        proxy_pass http://api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ttyd/ {
        proxy_pass http://ttyd:7681/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add deploy/nginx.conf deploy/nginx-iframe.conf
git commit -m "feat: add ttyd WebSocket proxy to nginx configs"
```

---

### Task 4: Update Compose File

**Files:**
- Modify: `compose.yaml`

- [ ] **Step 1: Add ttyd service to `compose.yaml`**

Add the ttyd service after the `frontend` service, before the `volumes:` section. The full file should become:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: kira
      POSTGRES_PASSWORD: kira
      POSTGRES_DB: kira
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: deploy/Dockerfile.api
    ports:
      - "8000:8000"
    environment:
      KIRA_DATABASE_URL: postgresql://kira:kira@postgres:5432/kira
      KIRA_API_KEY: dev-api-key
      KIRA_SECRET_KEY: dev-secret-key-change-in-production
      KIRA_ARTIFACT_STORAGE_PATH: /app/artifacts
    volumes:
      - artifacts:/app/artifacts
    depends_on:
      - postgres

  frontend:
    build:
      context: .
      dockerfile: deploy/Dockerfile.frontend
    ports:
      - "3000:3000"
    depends_on:
      - api

  ttyd:
    build:
      context: .
      dockerfile: deploy/Dockerfile.ttyd
    ports:
      - "7681:7681"
    volumes:
      - artifacts:/artifacts:ro
    environment:
      ANTHROPIC_API_KEY: ${KIRA_LLM_API_KEY:-}
      KIRA_LLM_BASE_URL: ${KIRA_LLM_BASE_URL:-}
      KIRA_LLM_MODEL: ${KIRA_LLM_MODEL:-}

volumes:
  pgdata:
  artifacts:
```

- [ ] **Step 2: Commit**

```bash
git add compose.yaml
git commit -m "feat: add ttyd service to compose with artifacts volume"
```

---

### Task 5: Update Makefile

**Files:**
- Modify: `Makefile`

- [ ] **Step 1: Add ttyd build and push targets**

Read the current Makefile to find the exact insertion points. Add `build-ttyd` and `push-ttyd` targets following the same pattern as `build-api` and `push-api`. Also update `build-images` and `push-images` to include ttyd.

After `build-frontend-image` target, add:

```makefile
.PHONY: build-ttyd
build-ttyd: ## Build ttyd troubleshooting container image (multi-arch)
	podman manifest rm $(REGISTRY)/kira-ttyd:$(IMAGE_TAG) 2>/dev/null || true
	podman manifest create $(REGISTRY)/kira-ttyd:$(IMAGE_TAG)
	podman build --platform $(PLATFORMS) --manifest $(REGISTRY)/kira-ttyd:$(IMAGE_TAG) -f deploy/Dockerfile.ttyd .
```

Update `build-images`:

```makefile
build-images: build-api build-frontend-image build-ttyd ## Build all container images (multi-arch)
```

After `push-frontend` target, add:

```makefile
.PHONY: push-ttyd
push-ttyd: ## Push ttyd manifest to registry
	podman manifest push $(REGISTRY)/kira-ttyd:$(IMAGE_TAG) docker://$(REGISTRY)/kira-ttyd:$(IMAGE_TAG)
```

Update `push-images`:

```makefile
push-images: push-api push-frontend push-ttyd ## Push all images to registry
```

- [ ] **Step 2: Commit**

```bash
git add Makefile
git commit -m "feat: add build-ttyd and push-ttyd Makefile targets"
```

---

### Task 6: Update Helm Chart

**Files:**
- Create: `deploy/helm/kira/templates/ttyd.yaml`
- Modify: `deploy/helm/kira/values.yaml`

- [ ] **Step 1: Create `deploy/helm/kira/templates/ttyd.yaml`**

```yaml
{{- if .Values.ttyd.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "kira.fullname" . }}-ttyd
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.componentLabels" (dict "component" "ttyd" "root" .) | nindent 4 }}
spec:
  replicas: 1
  selector:
    matchLabels:
      {{- include "kira.selectorLabels" (dict "component" "ttyd" "root" .) | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "kira.componentLabels" (dict "component" "ttyd" "root" .) | nindent 8 }}
    spec:
      containers:
        - name: ttyd
          image: "{{ .Values.ttyd.image.repository }}:{{ .Values.ttyd.image.tag }}"
          imagePullPolicy: {{ .Values.ttyd.image.pullPolicy }}
          ports:
            - containerPort: 7681
              protocol: TCP
          envFrom:
            - secretRef:
                name: {{ include "kira.fullname" . }}-secrets
          volumeMounts:
            - name: artifacts
              mountPath: /artifacts
              readOnly: true
      volumes:
        - name: artifacts
          persistentVolumeClaim:
            claimName: {{ include "kira.fullname" . }}-artifacts-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: ttyd
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.componentLabels" (dict "component" "ttyd" "root" .) | nindent 4 }}
spec:
  selector:
    {{- include "kira.selectorLabels" (dict "component" "ttyd" "root" .) | nindent 4 }}
  ports:
    - port: 7681
      targetPort: 7681
      protocol: TCP
{{- end }}
```

- [ ] **Step 2: Update `deploy/helm/kira/values.yaml`**

Add the ttyd section after the `artifacts` section and before the `route` section:

```yaml
# --- ttyd Terminal ---
ttyd:
  enabled: true
  image:
    repository: kira-ttyd
    tag: latest
    pullPolicy: IfNotPresent
```

- [ ] **Step 3: Commit**

```bash
git add deploy/helm/kira/templates/ttyd.yaml deploy/helm/kira/values.yaml
git commit -m "feat: add ttyd Helm template and values"
```

---

### Task 7: Update ChatWidget to Accept bottomOffset

**Files:**
- Modify: `frontend/src/components/ChatWidget.tsx`

- [ ] **Step 1: Update the ChatWidgetProps interface and component**

Change the interface to accept an optional `bottomOffset`:

```typescript
interface ChatWidgetProps {
  ticketId: string;
  ticket: Ticket;
  bottomOffset?: number;
}
```

Update the component signature:

```typescript
export function ChatWidget({ ticketId, bottomOffset = 0 }: ChatWidgetProps) {
```

In the closed state button, change `bottom: "24px"` to:

```typescript
bottom: `${24 + bottomOffset}px`,
```

In the open state container div, change `bottom: "24px"` to:

```typescript
bottom: `${24 + bottomOffset}px`,
```

- [ ] **Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds (the prop is optional with a default, so no callers need updating yet)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ChatWidget.tsx
git commit -m "feat: add bottomOffset prop to ChatWidget for terminal coexistence"
```

---

### Task 8: Create TerminalPanel Component

**Files:**
- Create: `frontend/src/components/TerminalPanel.tsx`

- [ ] **Step 1: Create `frontend/src/components/TerminalPanel.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import type { Ticket } from "../types";

interface TerminalPanelProps {
  ticket: Ticket;
  onHeightChange: (height: number) => void;
  onClose: () => void;
}

const MIN_HEIGHT = 150;
const MAX_HEIGHT_RATIO = 0.8;
const DEFAULT_HEIGHT_RATIO = 0.33;

export function TerminalPanel({ ticket, onHeightChange, onClose }: TerminalPanelProps) {
  const [height, setHeight] = useState(Math.round(window.innerHeight * DEFAULT_HEIGHT_RATIO));
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const ttydUrl = buildTtydUrl(ticket);

  useEffect(() => {
    onHeightChange(height);
    return () => onHeightChange(0);
  }, [height, onHeightChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [height]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    const maxHeight = Math.round(window.innerHeight * MAX_HEIGHT_RATIO);
    const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight.current + delta));
    setHeight(newHeight);
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handlePopOut = () => {
    window.open(ttydUrl, "_blank", "width=900,height=600");
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: `${height}px`,
        background: "#0d1117",
        borderTop: "2px solid var(--kira-border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
      }}
    >
      {/* Drag handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          height: "6px",
          cursor: "ns-resize",
          background: "var(--kira-border)",
          flexShrink: 0,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 12px",
          background: "#161b22",
          borderBottom: "1px solid #30363d",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "11px", color: "#8b949e", fontFamily: "monospace" }}>
          Terminal — {ticket.title.slice(0, 50)}
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handlePopOut}
            style={{
              background: "none",
              border: "1px solid #30363d",
              color: "#8b949e",
              padding: "2px 8px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "10px",
            }}
          >
            Pop Out
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #30363d",
              color: "#8b949e",
              padding: "2px 8px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "10px",
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* ttyd iframe */}
      <iframe
        src={ttydUrl}
        title="Terminal"
        style={{
          flex: 1,
          border: "none",
          width: "100%",
          background: "#0d1117",
        }}
      />
    </div>
  );
}

function buildTtydUrl(ticket: Ticket): string {
  const params = new URLSearchParams();
  params.set("arg", ticket.id);
  params.append("arg", ticket.title);
  params.append("arg", ticket.area);
  params.append("arg", ticket.affected_systems.join(","));
  params.append("arg", ticket.skills.join(","));
  return `/ttyd/?${params.toString()}`;
}
```

- [ ] **Step 2: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TerminalPanel.tsx
git commit -m "feat: add TerminalPanel component with resizable iframe and pop-out"
```

---

### Task 9: Integrate TerminalPanel into TicketDetail

**Files:**
- Modify: `frontend/src/pages/TicketDetail.tsx`

- [ ] **Step 1: Add imports**

Add at the top with the other imports:

```typescript
import { TerminalPanel } from "../components/TerminalPanel";
```

- [ ] **Step 2: Add terminal state**

Inside the `TicketDetail` component, after the existing state declarations, add:

```typescript
const [terminalOpen, setTerminalOpen] = useState(false);
const [terminalHeight, setTerminalHeight] = useState(0);
```

- [ ] **Step 3: Add Terminal button**

In the ticket header section (the first `sectionStyle` div), after the existing metadata (Source, Created), add a Terminal button visible only to operators/admins. Add this inside the flex container that has Risk, Confidence, Source, Created — after the Created div:

```tsx
{user && user.role !== "viewer" && (
  <div>
    <button
      onClick={() => setTerminalOpen(!terminalOpen)}
      style={{
        padding: "4px 10px",
        background: terminalOpen ? "#30363d" : "var(--kira-btn-bg)",
        border: "1px solid var(--kira-btn-border)",
        borderRadius: "4px",
        color: terminalOpen ? "#58a6ff" : "var(--kira-btn-text)",
        cursor: "pointer",
        fontSize: "12px",
        fontFamily: "monospace",
      }}
    >
      {terminalOpen ? "▼ Terminal" : "▶ Terminal"}
    </button>
  </div>
)}
```

- [ ] **Step 4: Add bottom padding when terminal is open**

Wrap the entire return JSX in a div that adds bottom padding when the terminal is open, so content isn't hidden behind the fixed panel. Change the outermost `<div>` to:

```tsx
<div style={{ paddingBottom: terminalOpen ? `${terminalHeight + 20}px` : undefined }}>
```

- [ ] **Step 5: Render TerminalPanel and update ChatWidget**

Just before the closing `</div>` of the component (at the very end of the return), update the ChatWidget to pass the offset and add the TerminalPanel:

Replace:
```tsx
<ChatWidget ticketId={ticket.id} ticket={ticket} />
```

With:
```tsx
<ChatWidget ticketId={ticket.id} ticket={ticket} bottomOffset={terminalHeight} />

{terminalOpen && (
  <TerminalPanel
    ticket={ticket}
    onHeightChange={setTerminalHeight}
    onClose={() => setTerminalOpen(false)}
  />
)}
```

- [ ] **Step 6: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/TicketDetail.tsx
git commit -m "feat: integrate TerminalPanel into TicketDetail page"
```

---

### Task 10: Update llms.txt

**Files:**
- Modify: `llms.txt`

- [ ] **Step 1: Update `llms.txt`**

In the **Deployment** section, add:

```
- [deploy/Dockerfile.ttyd](deploy/Dockerfile.ttyd): UBI9-based troubleshooting image with ttyd, kubectl, oc, neovim, Claude Code
- [deploy/ttyd-entrypoint.sh](deploy/ttyd-entrypoint.sh): ttyd container entrypoint
- [deploy/ttyd-session.sh](deploy/ttyd-session.sh): Session wrapper with ticket context env vars
```

In the **Frontend — Components** section, add:

```
- [frontend/src/components/TerminalPanel.tsx](frontend/src/components/TerminalPanel.tsx): Resizable embedded terminal panel with ttyd iframe
```

- [ ] **Step 2: Commit**

```bash
git add llms.txt
git commit -m "docs: update llms.txt with terminal feature files"
```

---

### Task 11: Build and Test

- [ ] **Step 1: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Clean build, no TypeScript errors

- [ ] **Step 2: Run backend tests**

Run: `uv run pytest tests/ -v`
Expected: All tests pass (no backend changes that affect tests)

- [ ] **Step 3: Test the ttyd image build locally (amd64 only for speed)**

Run: `podman build --platform linux/amd64 -t kira-ttyd:test -f deploy/Dockerfile.ttyd .`
Expected: Image builds successfully

Note: The full multi-arch build and Compose integration test require running `docker-compose up` / `podman-compose up` which is a manual verification step. The ttyd iframe will show a connection error in local dev (frontend runs on vite dev server at :5173, not behind nginx), which is expected — the full stack only works via Compose or Helm where nginx proxies `/ttyd/`.

- [ ] **Step 4: Commit any fixes if needed**
