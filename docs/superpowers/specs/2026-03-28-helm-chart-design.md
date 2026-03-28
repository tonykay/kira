# Helm Chart Design Spec

## Purpose

Add a Helm chart for deploying Kira to Kubernetes, following best practices and compatible with ArgoCD. The chart coexists alongside the existing plain manifests in `deploy/k8s/` — plain manifests serve as a teaching/quick-start option, while the Helm chart is the production-ready deployment method.

## Chart Location

`deploy/helm/kira/` — standard Helm chart directory structure.

## Structure

```
deploy/
├── k8s/                    # Plain manifests (teaching/quick start)
├── helm/kira/              # Helm chart (production/ArgoCD)
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── .helmignore
│   └── templates/
│       ├── _helpers.tpl
│       ├── namespace.yaml
│       ├── configmap.yaml
│       ├── secret.yaml
│       ├── postgres.yaml   # Deployment + Service + PVC
│       ├── api.yaml        # Deployment + Service + PVC (artifacts)
│       ├── frontend.yaml   # Deployment + Service
│       └── NOTES.txt
└── argocd/
    └── application.yaml    # Example ArgoCD Application manifest
```

## Chart.yaml

```yaml
apiVersion: v2
name: kira
description: A lightweight ticket troubleshooting application for AIOps teams
type: application
version: 0.1.0
appVersion: "0.1.0"
```

## values.yaml

```yaml
namespace: kira

api:
  image:
    repository: kira-api
    tag: latest
    pullPolicy: IfNotPresent
  replicas: 1
  port: 8000
  resources: {}

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

kira:
  apiKey: dev-api-key
  secretKey: dev-secret-key-change-in-production
  artifactStoragePath: /app/artifacts

artifacts:
  storage: 5Gi
```

## Template Helpers (_helpers.tpl)

Standard helpers following Helm best practices:
- `kira.name` — chart name
- `kira.fullname` — release-qualified name (truncated to 63 chars)
- `kira.labels` — common labels (`app.kubernetes.io/name`, `app.kubernetes.io/instance`, `app.kubernetes.io/version`, `app.kubernetes.io/managed-by`, `helm.sh/chart`)
- `kira.selectorLabels` — subset used for pod selectors

## Best Practices

- All resources use `app.kubernetes.io/*` labels via helpers
- Image tags configurable, not hardcoded to `latest`
- Resource requests/limits configurable via `values.yaml` (empty by default)
- Secrets managed via values with sensible dev defaults
- PersistentVolumeClaims for postgres data and artifact storage
- Namespace created by the chart
- ConfigMap for non-sensitive env vars, Secret for sensitive ones

## ArgoCD Compatibility

- No `helm.sh/hook` annotations on any resource
- All resources have proper `app.kubernetes.io/*` labels for tracking
- Standard Helm structure that ArgoCD's Helm source can process
- Example Application manifest at `deploy/argocd/application.yaml` with:
  - `repoURL` pointing at the GitHub repo
  - `path` pointing at `deploy/helm/kira`
  - `helm.valueFiles` reference
  - `syncPolicy` with `automated` and `selfHeal` for typical GitOps usage
  - `CreateNamespace=true` sync option

## NOTES.txt

Post-install instructions showing:
- How to access the frontend (NodePort URL)
- How to access the API (service URL)
- Default credentials for demo login
- How to run migrations and seed data

## Documentation

Update `README.md` with:
- A "Deploying with Helm" section explaining the chart and basic usage
- A "Deploying with ArgoCD" section referencing the example manifest
- A note clarifying when to use plain manifests vs Helm

## Files

### New Files
- `deploy/helm/kira/Chart.yaml`
- `deploy/helm/kira/values.yaml`
- `deploy/helm/kira/.helmignore`
- `deploy/helm/kira/templates/_helpers.tpl`
- `deploy/helm/kira/templates/namespace.yaml`
- `deploy/helm/kira/templates/configmap.yaml`
- `deploy/helm/kira/templates/secret.yaml`
- `deploy/helm/kira/templates/postgres.yaml`
- `deploy/helm/kira/templates/api.yaml`
- `deploy/helm/kira/templates/frontend.yaml`
- `deploy/helm/kira/templates/NOTES.txt`
- `deploy/argocd/application.yaml`

### Modified Files
- `README.md` — add Helm and ArgoCD deployment sections

## Out of Scope

- Ingress resource (users can add via values if needed)
- HPA/autoscaling
- Network policies
- TLS/cert-manager integration
- Helm chart repository publishing
- Helm tests (`templates/tests/`)
