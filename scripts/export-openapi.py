"""Export the Kira OpenAPI spec to YAML.

Usage: uv run python scripts/export-openapi.py
Output: docs/api/openapi.yaml
"""

import sys
from pathlib import Path

# Ensure project root is on path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import yaml

from api.main import app

output_dir = Path("docs/api")
output_dir.mkdir(parents=True, exist_ok=True)

spec = app.openapi()
output_path = output_dir / "openapi.yaml"
output_path.write_text(yaml.dump(spec, default_flow_style=False, sort_keys=False, allow_unicode=True))

print(f"OpenAPI spec exported to {output_path}")
