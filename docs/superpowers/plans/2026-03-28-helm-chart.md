# Helm Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production-ready Helm chart for deploying Kira to Kubernetes, with ArgoCD compatibility and an example Application manifest.

**Architecture:** Standard Helm chart in `deploy/helm/kira/` with templated versions of the existing plain k8s manifests. All values configurable via `values.yaml`. ArgoCD example in `deploy/argocd/`.

**Tech Stack:** Helm 3, Kubernetes, ArgoCD

---

## File Structure

```
deploy/
├── helm/kira/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── .helmignore
│   └── templates/
│       ├── _helpers.tpl
│       ├── namespace.yaml
│       ├── configmap.yaml
│       ├── secret.yaml
│       ├── postgres.yaml
│       ├── api.yaml
│       ├── frontend.yaml
│       └── NOTES.txt
└── argocd/
    └── application.yaml
```

---

## Task 1: Chart Scaffolding — Chart.yaml, values.yaml, .helmignore, _helpers.tpl

**Files:**
- Create: `deploy/helm/kira/Chart.yaml`
- Create: `deploy/helm/kira/values.yaml`
- Create: `deploy/helm/kira/.helmignore`
- Create: `deploy/helm/kira/templates/_helpers.tpl`

- [ ] **Step 1: Create Chart.yaml**

`deploy/helm/kira/Chart.yaml`:

```yaml
apiVersion: v2
name: kira
description: A lightweight ticket troubleshooting application for AIOps teams
type: application
version: 0.1.0
appVersion: "0.1.0"
maintainers:
  - name: tonykay
```

- [ ] **Step 2: Create values.yaml**

`deploy/helm/kira/values.yaml`:

```yaml
# Kira Helm Chart Values
# Override these values for your environment

namespace: kira

# --- API ---
api:
  image:
    repository: kira-api
    tag: latest
    pullPolicy: IfNotPresent
  replicas: 1
  port: 8000
  resources: {}
  #  requests:
  #    cpu: 100m
  #    memory: 256Mi
  #  limits:
  #    cpu: 500m
  #    memory: 512Mi

# --- Frontend ---
frontend:
  image:
    repository: kira-frontend
    tag: latest
    pullPolicy: IfNotPresent
  replicas: 1
  port: 3000
  service:
    type: NodePort
    nodePort: 30300

# --- PostgreSQL ---
postgres:
  enabled: true
  image:
    repository: postgres
    tag: "16"
    pullPolicy: IfNotPresent
  storage: 1Gi
  credentials:
    user: kira
    password: kira
    database: kira

# --- Kira Application Config ---
kira:
  apiKey: dev-api-key
  secretKey: dev-secret-key-change-in-production
  artifactStoragePath: /app/artifacts

# --- Artifact Storage ---
artifacts:
  storage: 5Gi
```

- [ ] **Step 3: Create .helmignore**

`deploy/helm/kira/.helmignore`:

```
.DS_Store
.git
.gitignore
.idea
*.swp
*.bak
*.tmp
```

- [ ] **Step 4: Create _helpers.tpl**

`deploy/helm/kira/templates/_helpers.tpl`:

```
{{/*
Chart name.
*/}}
{{- define "kira.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Fully qualified app name.
*/}}
{{- define "kira.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Chart label.
*/}}
{{- define "kira.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "kira.labels" -}}
helm.sh/chart: {{ include "kira.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/part-of: {{ include "kira.name" . }}
{{- end }}

{{/*
Selector labels for a specific component.
Usage: {{ include "kira.selectorLabels" (dict "component" "api" "root" .) }}
*/}}
{{- define "kira.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kira.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
Component labels (common + selector).
Usage: {{ include "kira.componentLabels" (dict "component" "api" "root" .) }}
*/}}
{{- define "kira.componentLabels" -}}
{{ include "kira.labels" .root }}
{{ include "kira.selectorLabels" (dict "component" .component "root" .root) }}
{{- end }}

{{/*
Database URL constructed from postgres credentials.
*/}}
{{- define "kira.databaseUrl" -}}
postgresql://{{ .Values.postgres.credentials.user }}:{{ .Values.postgres.credentials.password }}@postgres:5432/{{ .Values.postgres.credentials.database }}
{{- end }}
```

- [ ] **Step 5: Verify chart structure**

```bash
ls -la deploy/helm/kira/
ls -la deploy/helm/kira/templates/
```

- [ ] **Step 6: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
git add deploy/helm/
git commit -m "feat: add Helm chart scaffolding with Chart.yaml, values, and helpers"
```

---

## Task 2: Helm Templates — Namespace, ConfigMap, Secret

**Files:**
- Create: `deploy/helm/kira/templates/namespace.yaml`
- Create: `deploy/helm/kira/templates/configmap.yaml`
- Create: `deploy/helm/kira/templates/secret.yaml`

- [ ] **Step 1: Create namespace template**

`deploy/helm/kira/templates/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace }}
  labels:
    {{- include "kira.labels" . | nindent 4 }}
```

- [ ] **Step 2: Create configmap template**

`deploy/helm/kira/templates/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "kira.fullname" . }}-config
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.labels" . | nindent 4 }}
data:
  KIRA_DATABASE_URL: {{ include "kira.databaseUrl" . | quote }}
  KIRA_ARTIFACT_STORAGE_PATH: {{ .Values.kira.artifactStoragePath | quote }}
```

- [ ] **Step 3: Create secret template**

`deploy/helm/kira/templates/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "kira.fullname" . }}-secrets
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.labels" . | nindent 4 }}
type: Opaque
stringData:
  KIRA_API_KEY: {{ .Values.kira.apiKey | quote }}
  KIRA_SECRET_KEY: {{ .Values.kira.secretKey | quote }}
  POSTGRES_PASSWORD: {{ .Values.postgres.credentials.password | quote }}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
git add deploy/helm/kira/templates/namespace.yaml deploy/helm/kira/templates/configmap.yaml deploy/helm/kira/templates/secret.yaml
git commit -m "feat: add Helm templates for namespace, configmap, and secret"
```

---

## Task 3: Helm Templates — PostgreSQL

**Files:**
- Create: `deploy/helm/kira/templates/postgres.yaml`

- [ ] **Step 1: Create postgres template**

`deploy/helm/kira/templates/postgres.yaml`:

```yaml
{{- if .Values.postgres.enabled }}
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ include "kira.fullname" . }}-postgres-pvc
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.componentLabels" (dict "component" "postgres" "root" .) | nindent 4 }}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: {{ .Values.postgres.storage }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "kira.fullname" . }}-postgres
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.componentLabels" (dict "component" "postgres" "root" .) | nindent 4 }}
spec:
  replicas: 1
  selector:
    matchLabels:
      {{- include "kira.selectorLabels" (dict "component" "postgres" "root" .) | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "kira.componentLabels" (dict "component" "postgres" "root" .) | nindent 8 }}
    spec:
      containers:
        - name: postgres
          image: "{{ .Values.postgres.image.repository }}:{{ .Values.postgres.image.tag }}"
          imagePullPolicy: {{ .Values.postgres.image.pullPolicy }}
          ports:
            - containerPort: 5432
              protocol: TCP
          env:
            - name: POSTGRES_USER
              value: {{ .Values.postgres.credentials.user | quote }}
            - name: POSTGRES_DB
              value: {{ .Values.postgres.credentials.database | quote }}
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ include "kira.fullname" . }}-secrets
                  key: POSTGRES_PASSWORD
          volumeMounts:
            - name: pgdata
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: pgdata
          persistentVolumeClaim:
            claimName: {{ include "kira.fullname" . }}-postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.componentLabels" (dict "component" "postgres" "root" .) | nindent 4 }}
spec:
  selector:
    {{- include "kira.selectorLabels" (dict "component" "postgres" "root" .) | nindent 4 }}
  ports:
    - port: 5432
      targetPort: 5432
      protocol: TCP
{{- end }}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
git add deploy/helm/kira/templates/postgres.yaml
git commit -m "feat: add Helm template for PostgreSQL deployment"
```

---

## Task 4: Helm Templates — API and Frontend

**Files:**
- Create: `deploy/helm/kira/templates/api.yaml`
- Create: `deploy/helm/kira/templates/frontend.yaml`

- [ ] **Step 1: Create API template**

`deploy/helm/kira/templates/api.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ include "kira.fullname" . }}-artifacts-pvc
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.componentLabels" (dict "component" "api" "root" .) | nindent 4 }}
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: {{ .Values.artifacts.storage }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "kira.fullname" . }}-api
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.componentLabels" (dict "component" "api" "root" .) | nindent 4 }}
spec:
  replicas: {{ .Values.api.replicas }}
  selector:
    matchLabels:
      {{- include "kira.selectorLabels" (dict "component" "api" "root" .) | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "kira.componentLabels" (dict "component" "api" "root" .) | nindent 8 }}
    spec:
      containers:
        - name: api
          image: "{{ .Values.api.image.repository }}:{{ .Values.api.image.tag }}"
          imagePullPolicy: {{ .Values.api.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.api.port }}
              protocol: TCP
          envFrom:
            - configMapRef:
                name: {{ include "kira.fullname" . }}-config
            - secretRef:
                name: {{ include "kira.fullname" . }}-secrets
          volumeMounts:
            - name: artifacts
              mountPath: {{ .Values.kira.artifactStoragePath }}
          {{- with .Values.api.resources }}
          resources:
            {{- toYaml . | nindent 12 }}
          {{- end }}
      volumes:
        - name: artifacts
          persistentVolumeClaim:
            claimName: {{ include "kira.fullname" . }}-artifacts-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.componentLabels" (dict "component" "api" "root" .) | nindent 4 }}
spec:
  selector:
    {{- include "kira.selectorLabels" (dict "component" "api" "root" .) | nindent 4 }}
  ports:
    - port: {{ .Values.api.port }}
      targetPort: {{ .Values.api.port }}
      protocol: TCP
```

- [ ] **Step 2: Create frontend template**

`deploy/helm/kira/templates/frontend.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "kira.fullname" . }}-frontend
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.componentLabels" (dict "component" "frontend" "root" .) | nindent 4 }}
spec:
  replicas: {{ .Values.frontend.replicas }}
  selector:
    matchLabels:
      {{- include "kira.selectorLabels" (dict "component" "frontend" "root" .) | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "kira.componentLabels" (dict "component" "frontend" "root" .) | nindent 8 }}
    spec:
      containers:
        - name: frontend
          image: "{{ .Values.frontend.image.repository }}:{{ .Values.frontend.image.tag }}"
          imagePullPolicy: {{ .Values.frontend.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.frontend.port }}
              protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: {{ .Values.namespace }}
  labels:
    {{- include "kira.componentLabels" (dict "component" "frontend" "root" .) | nindent 4 }}
spec:
  type: {{ .Values.frontend.service.type }}
  selector:
    {{- include "kira.selectorLabels" (dict "component" "frontend" "root" .) | nindent 4 }}
  ports:
    - port: {{ .Values.frontend.port }}
      targetPort: {{ .Values.frontend.port }}
      {{- if eq .Values.frontend.service.type "NodePort" }}
      nodePort: {{ .Values.frontend.service.nodePort }}
      {{- end }}
      protocol: TCP
```

- [ ] **Step 3: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
git add deploy/helm/kira/templates/api.yaml deploy/helm/kira/templates/frontend.yaml
git commit -m "feat: add Helm templates for API and frontend deployments"
```

---

## Task 5: NOTES.txt, ArgoCD Application, and Helm Lint

**Files:**
- Create: `deploy/helm/kira/templates/NOTES.txt`
- Create: `deploy/argocd/application.yaml`

- [ ] **Step 1: Create NOTES.txt**

`deploy/helm/kira/templates/NOTES.txt`:

```
=== Kira Ticket Troubleshooting App ===

Kira has been deployed to namespace: {{ .Values.namespace }}

--- Access the Frontend ---

{{- if eq .Values.frontend.service.type "NodePort" }}
  Frontend URL: http://<node-ip>:{{ .Values.frontend.service.nodePort }}
{{- else }}
  kubectl port-forward -n {{ .Values.namespace }} svc/frontend {{ .Values.frontend.port }}:{{ .Values.frontend.port }}
  Frontend URL: http://localhost:{{ .Values.frontend.port }}
{{- end }}

--- Access the API ---

  kubectl port-forward -n {{ .Values.namespace }} svc/api {{ .Values.api.port }}:{{ .Values.api.port }}
  API docs: http://localhost:{{ .Values.api.port }}/api/v1/docs

--- Demo Credentials ---

  After running migrations and seeding:
    admin / admin123      (admin)
    jsmith / password      (operator, kubernetes)
    akhan / password       (operator, linux)

--- Post-Install Steps ---

  1. Run migrations:
     kubectl exec -n {{ .Values.namespace }} deploy/{{ include "kira.fullname" . }}-api -- uv run alembic upgrade head

  2. Seed demo data (optional):
     kubectl exec -n {{ .Values.namespace }} deploy/{{ include "kira.fullname" . }}-api -- uv run python -m api.seed

--- API Key ---

  Agent API key: {{ .Values.kira.apiKey }}
```

- [ ] **Step 2: Create ArgoCD Application manifest**

`deploy/argocd/application.yaml`:

```yaml
# Example ArgoCD Application manifest for Kira
#
# Prerequisites:
#   - ArgoCD installed on the target cluster
#   - This Git repository accessible from ArgoCD
#
# Usage:
#   kubectl apply -f deploy/argocd/application.yaml
#
# To use custom values, create a values override file and reference it:
#   helm.valueFiles:
#     - values.yaml
#     - values-production.yaml

apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: kira
  namespace: argocd
  labels:
    app.kubernetes.io/name: kira
    app.kubernetes.io/part-of: kira
spec:
  project: default

  source:
    # Update this to your fork/repo URL
    repoURL: https://github.com/tonykay/kira.git
    targetRevision: main
    path: deploy/helm/kira
    helm:
      valueFiles:
        - values.yaml

  destination:
    server: https://kubernetes.default.svc
    namespace: kira

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

- [ ] **Step 3: Lint the Helm chart**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
helm lint deploy/helm/kira/
```

Expected: `1 chart(s) linted, 0 chart(s) failed`

If `helm` is not installed, run:

```bash
helm template kira deploy/helm/kira/ > /dev/null 2>&1 || echo "helm not available — skip lint"
```

- [ ] **Step 4: Commit**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
git add deploy/helm/kira/templates/NOTES.txt deploy/argocd/
git commit -m "feat: add NOTES.txt and ArgoCD Application manifest"
```

---

## Task 6: Update README with Helm and ArgoCD Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the Deploying to Kubernetes section and add Helm/ArgoCD sections**

In `README.md`, replace the existing "## Deploying to Kubernetes" section (lines 155-166) with:

```markdown
## Deploying to Kubernetes

Kira provides two Kubernetes deployment options:

| Method | Location | Best for |
|--------|----------|----------|
| Plain manifests | `deploy/k8s/` | Learning, quick demos, understanding the resources |
| Helm chart | `deploy/helm/kira/` | Production, GitOps, ArgoCD, configurable deployments |

### Plain Manifests (quick start)

```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/secret.yaml
kubectl apply -f deploy/k8s/postgres.yaml
kubectl apply -f deploy/k8s/api.yaml
kubectl apply -f deploy/k8s/frontend.yaml
```

### Deploying with Helm

```bash
helm install kira deploy/helm/kira/
```

Override values for your environment:

```bash
helm install kira deploy/helm/kira/ \
  --set kira.apiKey=my-secure-key \
  --set kira.secretKey=my-secret \
  --set postgres.credentials.password=secure-password
```

Or use a custom values file:

```bash
helm install kira deploy/helm/kira/ -f my-values.yaml
```

Post-install — run migrations and seed:

```bash
kubectl exec -n kira deploy/kira-api -- uv run alembic upgrade head
kubectl exec -n kira deploy/kira-api -- uv run python -m api.seed
```

### Deploying with ArgoCD

An example ArgoCD Application manifest is provided at `deploy/argocd/application.yaml`.

```bash
# Update the repoURL in the manifest to point to your fork, then:
kubectl apply -f deploy/argocd/application.yaml
```

ArgoCD will sync the Helm chart from the repository with automated pruning and self-healing. To customize values, add a `values-production.yaml` alongside the chart and reference it in the Application spec.
```

- [ ] **Step 2: Commit and push**

```bash
cd /Users/tok/Dropbox/PARAL/Projects/tok-jira/tok-jira
git add README.md
git commit -m "docs: add Helm and ArgoCD deployment documentation to README"
git push
```
