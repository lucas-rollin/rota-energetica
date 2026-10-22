from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from pipeline.models import (
    Manifest,
    ParameterItem,
    SimulationParameters,
    SourcesCatalog,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_parameter_item_validation():
    item = ParameterItem(
        value=6.89,
        unit="R$/L",
        source_id="P05",
        badge="Adaptada",
        notes="Portaria SUROC 3/2026",
    )
    assert item.value == 6.89
    assert item.badge == "Adaptada"

    # Invalid badge
    with pytest.raises(ValidationError):
        ParameterItem(
            value=6.89,
            unit="R$/L",
            source_id="P05",
            badge="Invalido",  # type: ignore[arg-type]
        )

    # Invalid source_id regex
    with pytest.raises(ValidationError):
        ParameterItem(
            value=6.89,
            unit="R$/L",
            source_id="invalid",
            badge="Primária",
        )


def test_load_and_validate_real_parameters_file():
    params_path = REPO_ROOT / "data" / "parameters.json"
    assert params_path.exists(), "data/parameters.json must exist"

    params = SimulationParameters.load(params_path)
    assert params.schema_version == 1
    assert "diesel" in params.vehicles
    assert "gnv" in params.vehicles
    assert "biometano" in params.vehicles
    assert "eletrico" in params.vehicles

    # Check diesel properties
    diesel = params.vehicles["diesel"]
    assert diesel.energy_price.unit == "R$/L"
    assert diesel.energy_price.badge in ("Primária", "Adaptada", "Ilustrativa")
    assert diesel.carbon_intensity.unit == "gCO2eq/MJ"


def test_load_and_validate_real_sources_catalog():
    sources_path = REPO_ROOT / "data" / "sources.json"
    assert sources_path.exists(), "data/sources.json must exist"

    catalog = SourcesCatalog.load(sources_path)
    assert catalog.schema_version == 1
    assert len(catalog.sources) >= 30

    source_ids = {s.id for s in catalog.sources}
    assert len(source_ids) == len(catalog.sources), "All source IDs must be unique"

    # Cross-reference: all parameter sources must exist in sources catalog
    params_path = REPO_ROOT / "data" / "parameters.json"
    if params_path.exists():
        params = SimulationParameters.load(params_path)
        param_source_ids = {
            params.general.annual_distance_km.source_id,
            params.general.horizon_years.source_id,
            params.general.discount_rate.source_id,
            params.general.biodiesel_blend.source_id,
        }
        for vehicle in params.vehicles.values():
            param_source_ids.update({
                vehicle.energy_price.source_id,
                vehicle.consumption.source_id,
                vehicle.energy_density.source_id,
                vehicle.carbon_intensity.source_id,
                vehicle.vehicle_purchase_price.source_id,
                vehicle.vehicle_overprice.source_id,
                vehicle.maintenance_cost_per_km.source_id,
            })
        for sid in param_source_ids:
            assert sid in source_ids, f"Source ID '{sid}' from parameters.json missing from sources.json"

    # Cross-reference: all manifest sources must exist in sources catalog
    manifest_path = REPO_ROOT / "data" / "manifest.json"
    if manifest_path.exists():
        manifest = Manifest.load(manifest_path)
        for entry in manifest.entries:
            assert entry.source_id in source_ids, f"Source ID '{entry.source_id}' from manifest.json missing from sources.json"


def test_export_parameters_schema(tmp_path: Path):
    schema_file = tmp_path / "parameters.schema.json"
    SimulationParameters.export_schema(schema_file)
    assert schema_file.exists()

    schema_data = json.loads(schema_file.read_text(encoding="utf-8"))
    assert "$defs" in schema_data
    assert "SimulationParameters" in schema_data["$defs"] or "properties" in schema_data
