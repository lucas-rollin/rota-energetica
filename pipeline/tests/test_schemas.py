from __future__ import annotations

import json
from pathlib import Path

from pipeline.models import Manifest, SimulationParameters, SourcesCatalog

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMAS_DIR = REPO_ROOT / "schemas"


def test_no_schema_drift():
    """Verify that committed JSON schemas match Pydantic model definitions."""
    schema_map = {
        "manifest.schema.json": Manifest,
        "parameters.schema.json": SimulationParameters,
        "sources.schema.json": SourcesCatalog,
    }

    for filename, model_cls in schema_map.items():
        disk_file = SCHEMAS_DIR / filename
        assert disk_file.exists(), f"Schema file '{disk_file}' must exist on disk."

        expected_schema = model_cls.model_json_schema()
        expected_schema = {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            **expected_schema,
        }

        actual_schema = json.loads(disk_file.read_text(encoding="utf-8"))

        assert actual_schema == expected_schema, (
            f"Schema drift detected in schemas/{filename}! "
            "The committed schema does not match the Pydantic model. "
            "Run 'pipeline export-schemas' to synchronize schemas."
        )
