# Kira Makefile
# Run `make` or `make help` to see all available targets

# --- Configuration ---
DB_USER       := kira
DB_PASS       := kira
DB_NAME       := kira
DB_PORT       := 5432
DB_CONTAINER  := kira-postgres
API_PORT      := 8000
FRONTEND_PORT := 5173
REGISTRY      := quay.io/rhpds
IMAGE_TAG     := latest

.DEFAULT_GOAL := help

# --- Development ---

.PHONY: dev-db
dev-db: ## Start Postgres container (podman)
	@podman start $(DB_CONTAINER) 2>/dev/null || \
		podman run -d --name $(DB_CONTAINER) \
			-e POSTGRES_USER=$(DB_USER) \
			-e POSTGRES_PASSWORD=$(DB_PASS) \
			-e POSTGRES_DB=$(DB_NAME) \
			-p $(DB_PORT):5432 \
			postgres:16
	@echo "Postgres running on port $(DB_PORT)"

.PHONY: dev-db-stop
dev-db-stop: ## Stop Postgres container
	podman stop $(DB_CONTAINER)

.PHONY: migrate
migrate: ## Run database migrations
	uv run alembic upgrade head

.PHONY: seed
seed: ## Seed database with demo data
	uv run python -m api.seed

.PHONY: dev-api
dev-api: ## Start API server with hot reload
	@if [ -z "$$KIRA_LLM_API_KEY" ]; then \
		echo "\033[33mWarning: KIRA_LLM_API_KEY not set — AI chat assistant will be disabled.\033[0m"; \
		echo "  Set KIRA_LLM_BASE_URL, KIRA_LLM_API_KEY, and KIRA_LLM_MODEL to enable it."; \
	fi
	uv run uvicorn api.main:app --reload --port $(API_PORT)

.PHONY: dev-frontend
dev-frontend: ## Start frontend dev server
	cd frontend && npm install && npm run dev

.PHONY: dev
dev: dev-db ## Start full dev stack (Postgres + migrate + seed + API)
	@echo "Waiting for Postgres to be ready..."
	@sleep 2
	@$(MAKE) migrate
	@$(MAKE) seed
	@$(MAKE) dev-api

# --- API Spec ---

.PHONY: openapi
openapi: ## Export OpenAPI spec to docs/api/openapi.yaml
	uv run python scripts/export-openapi.py

# --- Testing ---

.PHONY: test
test: ## Run backend tests
	uv run pytest tests/ -v

.PHONY: build-frontend
build-frontend: ## Build frontend (TypeScript check + production build)
	cd frontend && npm run build

.PHONY: check
check: test build-frontend ## Run all checks (tests + frontend build)
	@echo "All checks passed"

# --- Container Images ---

.PHONY: build-api
build-api: ## Build API container image
	podman build -t $(REGISTRY)/kira-api:$(IMAGE_TAG) -f deploy/Dockerfile.api .

.PHONY: build-frontend-image
build-frontend-image: ## Build frontend container image
	podman build -t $(REGISTRY)/kira-frontend:$(IMAGE_TAG) -f deploy/Dockerfile.frontend .

.PHONY: build-images
build-images: build-api build-frontend-image ## Build all container images

.PHONY: push-api
push-api: ## Push API image to registry
	podman push $(REGISTRY)/kira-api:$(IMAGE_TAG)

.PHONY: push-frontend
push-frontend: ## Push frontend image to registry
	podman push $(REGISTRY)/kira-frontend:$(IMAGE_TAG)

.PHONY: push-images
push-images: push-api push-frontend ## Push all images to registry

.PHONY: release
release: build-images push-images ## Build and push all images

# --- Compose ---

.PHONY: compose-up
compose-up: ## Start all services with Compose
	podman compose up --build -d

.PHONY: compose-down
compose-down: ## Stop all Compose services
	podman compose down

.PHONY: compose-logs
compose-logs: ## Follow Compose service logs
	podman compose logs -f

# --- Helm ---

.PHONY: helm-install
helm-install: ## Install Helm chart
	helm install kira deploy/helm/kira/

.PHONY: helm-upgrade
helm-upgrade: ## Upgrade Helm release
	helm upgrade kira deploy/helm/kira/

.PHONY: helm-uninstall
helm-uninstall: ## Uninstall Helm release
	helm uninstall kira

.PHONY: helm-lint
helm-lint: ## Lint Helm chart
	helm lint deploy/helm/kira/

.PHONY: helm-template
helm-template: ## Render Helm templates (dry run)
	helm template kira deploy/helm/kira/

# --- OpenShift ---

.PHONY: deploy-openshift
deploy-openshift: ## Deploy to OpenShift with Helm
	helm install kira deploy/helm/kira/ -f deploy/helm/kira/values-openshift.yaml

.PHONY: upgrade-openshift
upgrade-openshift: ## Upgrade OpenShift deployment
	helm upgrade kira deploy/helm/kira/ -f deploy/helm/kira/values-openshift.yaml

.PHONY: undeploy-openshift
undeploy-openshift: ## Remove Kira from OpenShift
	helm uninstall kira
	oc delete namespace kira 2>/dev/null || kubectl delete namespace kira 2>/dev/null || true

# --- Cleanup ---

.PHONY: clean
clean: ## Remove build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache frontend/dist

.PHONY: reset-db
reset-db: ## Reset database (destroy + recreate + migrate + seed)
	podman rm -f $(DB_CONTAINER) 2>/dev/null || true
	@$(MAKE) dev-db
	@echo "Waiting for Postgres to be ready..."
	@sleep 2
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo "Database reset complete"

.PHONY: restart-backend
restart-backend: ## Restart backend — kill API, reset DB, start API
	@lsof -ti :$(API_PORT) | xargs kill 2>/dev/null || true
	@$(MAKE) reset-db
	@echo "Starting API on port $(API_PORT)..."
	@$(MAKE) dev-api

.PHONY: restart-frontend
restart-frontend: ## Restart frontend dev server
	@lsof -ti :$(FRONTEND_PORT) | xargs kill 2>/dev/null || true
	@echo "Starting frontend on port $(FRONTEND_PORT)..."
	@cd frontend && npm install && npm run dev

.PHONY: restart-all
restart-all: ## Full restart — backend + frontend
	@lsof -ti :$(API_PORT) | xargs kill 2>/dev/null || true
	@lsof -ti :$(FRONTEND_PORT) | xargs kill 2>/dev/null || true
	@$(MAKE) reset-db
	@echo "Starting API on port $(API_PORT)..."
	@$(MAKE) dev-api &
	@echo "Starting frontend on port $(FRONTEND_PORT)..."
	@cd frontend && npm install && npm run dev

# --- Help ---

.PHONY: help
help: ## Show this help message
	@echo "Kira — Available targets:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
