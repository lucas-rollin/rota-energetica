"""Data models and serialization for pipeline manifest and simulation parameters."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

QualityBadge = Literal["Primária", "Adaptada", "Ilustrativa"]

TODAY = datetime.now(ZoneInfo("America/Sao_Paulo"))

class Entry(BaseModel):
    """Metadata for a raw downloaded file registered in the manifest."""

    model_config = ConfigDict(extra="forbid")

    source_id: Annotated[str, StringConstraints(pattern=r"^[A-Z][0-9]{2}$")] = Field(
        ...,
        description="ID da fonte em docs/fontes.md (ex.: P01).",
        title="Source Id",
    )
    file: str = Field(
        ...,
        description="Caminho do arquivo, relativo à raiz do repositório, com '/'.",
        title="File",
    )
    origin_url: Annotated[str, StringConstraints(min_length=1)] = Field(
        ...,
        description="Página ou endereço do arquivo de onde veio.",
        title="Origin Url",
    )
    acquisition: Literal["manual", "auto"] = Field(
        ...,
        description="'manual' (baixado à mão) ou 'auto' (baixado pelo pipeline).",
        title="Acquisition",
    )
    retrieved_at: str = Field(
        ...,
        description="Data do download (AAAA-MM-DD).",
        title="Retrieved At",
    )
    sha256: Annotated[str, StringConstraints(pattern=r"^[0-9a-f]{64}$")] = Field(
        ...,
        description="Impressão digital (SHA-256) do conteúdo do arquivo.",
        title="Sha256",
    )
    rows: int | None = Field(
        default=None,
        ge=0,
        description="Linhas de dados, sem o cabeçalho (arquivos tabulares).",
        title="Rows",
    )
    date_range: list[str] | None = Field(
        default=None,
        min_length=2,
        max_length=2,
        description="Primeira e última data presentes nos dados.",
        title="Date Range",
    )
    notes: str | None = Field(
        default=None,
        description="Observação livre.",
        title="Notes",
    )


class Manifest(BaseModel):
    """Manifest tracking all acquired raw data files."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    dollar_schema: str | None = Field(
        default="../schemas/manifest.schema.json",
        alias="$schema",
        title="$schema",
    )
    schema_version: Literal[1] = Field(
        default=1,
        title="Schema Version",
    )
    generated_at: str = Field(
        ...,
        description="Data da última alteração do manifest.",
        title="Generated At",
    )
    entries: list[Entry] = Field(
        default_factory=list,
        title="Entries",
    )

    @classmethod
    def load(cls, path: Path) -> Manifest:
        """Load manifest from JSON file, initializing empty one if missing."""
        if not path.exists():
            return cls(
                schema_version=1,
                generated_at=TODAY.isoformat(),
                entries=[],
            )

        content = path.read_text(encoding="utf-8").strip()
        if not content:
            return cls(
                schema_version=1,
                generated_at=TODAY.isoformat(),
                entries=[],
            )

        data = json.loads(content)
        try:
            return cls.model_validate(data)
        except Exception as e:
            raise ValueError(
                f"Failed to validate '{path}' against schema: {e}\n"
                "If this is an initial placeholder file, you can reset it to empty: "
                '{"schema_version": 1, "generated_at": "'
                + TODAY.isoformat()
                + '", "entries": []}'
            ) from e

    def save(self, path: Path) -> None:
        """Save manifest to JSON file formatted with 2 spaces indent."""
        path.parent.mkdir(parents=True, exist_ok=True)
        dump = self.model_dump(exclude_none=True, by_alias=True)
        path.write_text(
            json.dumps(dump, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

    def upsert_entry(self, entry: Entry) -> tuple[bool, str]:
        """Add or update an entry by relative file path.

        Returns (is_new, message).
        """
        for i, existing in enumerate(self.entries):
            if existing.file == entry.file:
                sha_changed = existing.sha256 != entry.sha256
                self.entries[i] = entry
                self.generated_at = TODAY.isoformat()
                if sha_changed:
                    msg = f"Updated '{entry.file}' (SHA-256 changed: {existing.sha256[:8]}... -> {entry.sha256[:8]}...)"
                else:
                    msg = f"Refreshed '{entry.file}' (SHA-256 identical: {entry.sha256[:8]}...)"
                return False, msg

        self.entries.append(entry)
        self.entries.sort(key=lambda e: (e.source_id, e.file))
        self.generated_at = TODAY.isoformat()
        return True, f"Added new entry '{entry.file}' [{entry.source_id}]"


# =============================================================================
# Simulation Parameters Models
# =============================================================================


class ParameterItem(BaseModel):
    """A numerical simulation parameter paired with provenance and quality badge."""

    model_config = ConfigDict(extra="forbid")

    value: float = Field(
        ...,
        description="Valor numérico do parâmetro.",
        title="Value",
    )
    unit: str = Field(
        ...,
        min_length=1,
        description="Unidade de medida (ex: R$/L, km/L, gCO2eq/MJ).",
        title="Unit",
    )
    source_id: Annotated[str, StringConstraints(pattern=r"^[A-Z][0-9]{2}$")] = Field(
        ...,
        description="ID da fonte em docs/fontes.md (ex: P01, E01, V01).",
        title="Source Id",
    )
    badge: QualityBadge = Field(
        ...,
        description="Selo de qualidade do dado: 'Primária', 'Adaptada' ou 'Ilustrativa'.",
        title="Badge",
    )
    notes: str | None = Field(
        default=None,
        description="Nota explicativa ou justificativa da premissa adotada.",
        title="Notes",
    )


class GeneralParameters(BaseModel):
    """Operational and macroeconomic baseline parameters."""

    model_config = ConfigDict(extra="forbid")

    annual_distance_km: ParameterItem = Field(
        ...,
        description="Quilometragem média percorrida por ano (km/ano).",
        title="Annual Distance (km)",
    )
    horizon_years: ParameterItem = Field(
        ...,
        description="Horizonte de tempo para cálculo do TCO (anos).",
        title="Horizon (years)",
    )
    discount_rate: ParameterItem = Field(
        ...,
        description="Taxa de desconto anual para valor presente do TCO (fração decimal).",
        title="Discount Rate",
    )
    biodiesel_blend: ParameterItem = Field(
        ...,
        description="Teor de biodiesel no diesel B (fração decimal).",
        title="Biodiesel Blend",
    )


class VehicleParameters(BaseModel):
    """Technical and economic specifications for an energy powertrain."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(
        ...,
        description="Nome de exibição da alternativa energética.",
        title="Label",
    )
    energy_price: ParameterItem = Field(
        ...,
        description="Preço de referência da energia (R$/L, R$/m³ ou R$/kWh).",
        title="Energy Price",
    )
    consumption: ParameterItem = Field(
        ...,
        description="Eficiência de consumo de combustível ou eletricidade (km/L, km/m³ ou km/kWh).",
        title="Consumption",
    )
    energy_density: ParameterItem = Field(
        ...,
        description="Conteúdo energético (MJ por unidade de combustível/energia).",
        title="Energy Density",
    )
    carbon_intensity: ParameterItem = Field(
        ...,
        description="Intensidade de carbono do ciclo poço à roda (gCO2eq/MJ).",
        title="Carbon Intensity",
    )
    vehicle_purchase_price: ParameterItem = Field(
        ...,
        description="Preço total estimado de aquisição do cavalo mecânico (R$).",
        title="Vehicle Purchase Price",
    )
    vehicle_overprice: ParameterItem = Field(
        ...,
        description="Sobrepreço de aquisição em relação ao cavalo mecânico diesel base (R$).",
        title="Vehicle Overprice",
    )
    maintenance_cost_per_km: ParameterItem = Field(
        ...,
        description="Custo operacional de manutenção e desgaste de pneus (R$/km).",
        title="Maintenance Cost Per Km",
    )


class SimulationParameters(BaseModel):
    """Full schema for default simulation parameters."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    dollar_schema: str | None = Field(
        default="../schemas/parameters.schema.json",
        alias="$schema",
        title="$schema",
    )
    schema_version: Literal[1] = Field(
        default=1,
        title="Schema Version",
    )
    generated_at: str = Field(
        ...,
        description="Data de geração ou última revisão dos parâmetros (AAAA-MM-DD).",
        title="Generated At",
    )
    general: GeneralParameters = Field(
        ...,
        title="General Parameters",
    )
    vehicles: dict[str, VehicleParameters] = Field(
        ...,
        title="Vehicles",
    )

    @classmethod
    def load(cls, path: Path) -> SimulationParameters:
        content = path.read_text(encoding="utf-8")
        data = json.loads(content)
        return cls.model_validate(data)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        dump = self.model_dump(exclude_none=True, by_alias=True)
        path.write_text(
            json.dumps(dump, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )

    @classmethod
    def export_schema(cls, output_path: Path) -> None:
        """Export JSON Schema to file."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        schema = cls.model_json_schema()
        output_path.write_text(
            json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
