from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from pipeline.models import (
    ParameterItem,
    SimulationParameters,
)


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
    params_path = Path("data/parameters.json")
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


def test_export_parameters_schema(tmp_path: Path):
    schema_file = tmp_path / "parameters.schema.json"
    SimulationParameters.export_schema(schema_file)
    assert schema_file.exists()

    schema_data = json.loads(schema_file.read_text(encoding="utf-8"))
    assert "$defs" in schema_data
    assert "SimulationParameters" in schema_data["$defs"] or "properties" in schema_data
