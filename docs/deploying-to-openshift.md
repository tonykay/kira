# Deploying Kira to OpenShift

A quick guide to deploying Kira on OpenShift (or any Kubernetes cluster) using Helm.

## Prerequisites

- `oc` CLI (OpenShift) or `kubectl` (vanilla Kubernetes)
- `helm` v3+
- Logged into your cluster (`oc login` or `kubectl` context configured)
- Container images available in a registry (e.g., `quay.io/tonykay/kira-api`, `quay.io/tonykay/kira-frontend`)

## 1. Set Environment Variables (optional)

If you want to enable the AI chat assistant, export these before deploying:

```bash
# Optional — only if you want the LLM chat feature
export KIRA_LLM_BASE_URL=https://api.openai.com/v1
export KIRA_LLM_API_KEY=sk-...
export KIRA_LLM_MODEL=gpt-4o
```

## 2. Log In to Your Cluster

```bash
# OpenShift
oc login --server=https://api.your-cluster.example.com:6443

# Or vanilla Kubernetes
kubectl config use-context your-context
```

## 3. Deploy with Helm

```bash
# From the repo root:
helm install kira deploy/helm/kira/ \
  -f deploy/helm/kira/values-openshift.yaml
```

To set custom image repositories or LLM config:

```bash
helm install kira deploy/helm/kira/ \
  -f deploy/helm/kira/values-openshift.yaml \
  --set api.image.repository=quay.io/tonykay/kira-api \
  --set frontend.image.repository=quay.io/tonykay/kira-frontend \
  --set kira.apiKey=my-secure-key
```

Or use the Makefile shortcut:

```bash
make deploy-openshift
```

## 4. Run Migrations and Seed

```bash
# Wait for the API pod to be ready
oc get pods -n kira -w

# Run migrations
oc exec -n kira deploy/kira-api -- uv run alembic upgrade head

# Seed demo data
oc exec -n kira deploy/kira-api -- uv run python -m api.seed
```

## 5. Access the Application

```bash
# Get the Route URL (OpenShift)
oc get route -n kira

# Or port-forward (any Kubernetes)
kubectl port-forward -n kira svc/frontend 3000:3000
```

Open the Route URL or http://localhost:3000 and log in:

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| jsmith | password | operator |
| akhan | password | operator |

## 6. Test the API

```bash
# Get the API service URL
API_URL=$(oc get route -n kira -o jsonpath='{.items[0].spec.host}' 2>/dev/null || echo "localhost:8000")

curl -X POST https://${API_URL}/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-api-key" \
  -d '{
    "title": "Test ticket from OpenShift",
    "description": "Verifying deployment",
    "area": "kubernetes",
    "confidence": 0.9,
    "risk": 0.3,
    "recommended_action": "No action needed — this is a test",
    "skills": ["kubernetes", "openshift"],
    "source": "agent"
  }'
```

## Teardown

```bash
helm uninstall kira
oc delete namespace kira

# Or use the Makefile:
make undeploy-openshift
```

## Upgrading

After code changes, rebuild images, push to your registry, then:

```bash
helm upgrade kira deploy/helm/kira/ \
  -f deploy/helm/kira/values-openshift.yaml

# Or:
make upgrade-openshift
```

## Troubleshooting

**Pods not starting?**
```bash
oc get pods -n kira
oc describe pod -n kira <pod-name>
oc logs -n kira deploy/kira-api
```

**Login failing after redeployment?**
The database was likely recreated. Re-run migrations and seed:
```bash
oc exec -n kira deploy/kira-api -- uv run alembic upgrade head
oc exec -n kira deploy/kira-api -- uv run python -m api.seed
```

**Images not pulling?**
Check your image repositories are correct and accessible:
```bash
helm get values kira | grep repository
```
