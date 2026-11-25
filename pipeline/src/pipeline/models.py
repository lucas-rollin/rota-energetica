"""Data models and serialization for pipeline manifest and simulation parameters."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Annotated, Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

QualityBadge = Literal["Primária", "Adaptada", "Ilustrativa"]
SourceCategory = Literal["A", "B", "C", "D"]


def get_current_iso_timestamp() -> str:
    """Return the current ISO timestamp in America/Sao_Paulo timezone."""
    return datetime.now(ZoneInfo("America/Sao_Paulo")).isoformat()


class Source(BaseModel):
    """Metadata and provenance for a project data source."""

    model_config = ConfigDict(extra="forbid")

    id: Annotated[str, StringConstraints(pattern=r"^[A-Z][0-9]{2}$")] = Field(
        ...,
        description="ID unívoco da fonte (ex.: P01, E01, V01, I01).",
        title="Id",
    )
    name: str = Field(
        ...,
        min_length=1,
        description="Nome formal do conjunto de dados, publicação ou norma.",
        title="Name",
    )
    publisher: str = Field(
        ...,
        min_length=1,
        description="Órgão, entidade, empresa ou fabricante responsável.",
        title="Publisher",
    )
    description: str = Field(
        ...,
        min_length=1,
        description="Descrição sucinta do dado utilizado no simulador.",
        title="Description",
    )
    url: str | None = Field(
        default=None,
        description="Página oficial ou link institucional de referência.",
        title="Url",
    )
    badge: QualityBadge = Field(
        ...,
        description="Selo de qualidade técnica do dado no simulador.",
        title="Badge",
    )
    category: SourceCategory = Field(
        ...,
        description="Classificação jurídica (A: ato oficial, B: dado aberto, C: privado/setorial, D: imprensa/ficha).",
        title="Category",
    )
    terms: str | None = Field(
        default=None,
        description="Licença ou termos de uso aplicáveis.",
        title="Terms",
    )
    terms_url: str | None = Field(
        default=None,
        description="Link oficial para os termos de uso ou licença.",
        title="Terms Url",
    )
    attribution: str | None = Field(
        default=None,
        description="Texto sugerido para atribuição de autoria.",
        title="Attribution",
    )
    notes: str | None = Field(
        default=None,
        description="Notas metodológicas, conversões ou ressalvas técnicas.",
        title="Notes",
    )


class SourcesCatalog(BaseModel):
    """Catalog of all data sources used across the project."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    dollar_schema: str | None = Field(
        default="../schemas/sources.schema.json",
        alias="$schema",
        title="$schema",
    )
    schema_version: Literal[1] = Field(
        default=1,
        title="Schema Version",
    )
    sources: list[Source] = Field(
        default_factory=list,
        title="Sources",
    )

    @classmethod
    def load(cls, path: Path) -> SourcesCatalog:
        content = path.read_text(encoding="utf-8")
        data = json.loads(content)
        return cls.model_validate(data)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        dump = self.model_dump(exclude_none=True, by_alias=True)
        path.write_text(
            json.dumps(dump, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


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
                generated_at=get_current_iso_timestamp(),
                entries=[],
            )

        content = path.read_text(encoding="utf-8").strip()
        if not content:
            return cls(
                schema_version=1,
                generated_at=get_current_iso_timestamp(),
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
                + get_current_iso_timestamp()
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
                self.generated_at = get_current_iso_timestamp()
                if sha_changed:
                    msg = f"Updated '{entry.file}' (SHA-256 changed: {existing.sha256[:8]}... -> {entry.sha256[:8]}...)"
                else:
                    msg = f"Refreshed '{entry.file}' (SHA-256 identical: {entry.sha256[:8]}...)"
                return False, msg

        self.entries.append(entry)
        self.entries.sort(key=lambda e: (e.source_id, e.file))
        self.generated_at = get_current_iso_timestamp()
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
        description="Unidade de medida (ex: R$/L, km/L, gCO2eq/MJ, fração).",
        title="Unit",
    )
    source_id: Annotated[str, StringConstraints(pattern=r"^[A-Z][0-9]{2}$")] = Field(
        ...,
        description="ID da fonte em docs/fontes.md ou data/sources.json (ex: P01, E01, V01).",
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
    min: float | None = Field(
        default=None,
        description="Limite inferior recomendado para slider/entrada.",
        title="Min",
    )
    max: float | None = Field(
        default=None,
        description="Limite superior recomendado para slider/entrada.",
        title="Max",
    )
    step: float | None = Field(
        default=None,
        description="Incremento sugerido para o slider/controle numérico.",
        title="Step",
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
    diesel_fossil_carbon_intensity: ParameterItem = Field(
        ...,
        description="Intensidade de carbono do diesel fóssil poço à roda (gCO2eq/MJ).",
        title="Diesel Fossil Carbon Intensity",
    )
    biodiesel_carbon_intensity: ParameterItem = Field(
        ...,
        description="Intensidade de carbono do biodiesel poço à roda (gCO2eq/MJ).",
        title="Biodiesel Carbon Intensity",
    )
    arla_price: ParameterItem = Field(
        ...,
        description="Preço de referência do ARLA 32 (R$/L).",
        title="ARLA 32 Price",
    )
    cbio_price: ParameterItem | None = Field(
        default=None,
        description="Preço de referência do crédito de descarbonização CBIO na B3 (R$/CBIO).",
        title="CBIO Price",
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
    maintenance_cost_per_km: ParameterItem = Field(
        ...,
        description="Custo operacional de manutenção e desgaste de pneus (R$/km).",
        title="Maintenance Cost Per Km",
    )
    residual_value_ratio: ParameterItem = Field(
        ...,
        description="Fração do preço de aquisição retida ao final do horizonte financeiro (fração decimal de V0).",
        title="Residual Value Ratio",
    )
    charging_efficiency: ParameterItem | None = Field(
        default=None,
        description="Eficiência de recarga da bateria (fração decimal de energia armazenada / energia da rede).",
        title="Charging Efficiency",
    )
    arla_consumption_ratio: ParameterItem | None = Field(
        default=None,
        description="Consumo de ARLA 32 por litro de diesel consumido (L/L).",
        title="ARLA Consumption Ratio",
    )
    payload_penalty_kg: ParameterItem | None = Field(
        default=None,
        description="Impacto da tara do trem de força na capacidade de carga líquida útil (kg em relação ao diesel).",
        title="Payload Penalty (kg)",
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
        schema = {"$schema": "https://json-schema.org/draft/2020-12/schema", **schema}
        output_path.write_text(
            json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


# =============================================================================
# Processed Prices History Models
# =============================================================================


class PricePoint(BaseModel):
    """Weekly aggregated price point for an energy source or commodity."""

    model_config = ConfigDict(extra="forbid")

    week: Annotated[str, StringConstraints(pattern=r"^[0-9]{4}-W[0-9]{2}$")] = Field(
        ...,
        description="ISO year and week string (e.g. '2026-W24').",
        title="Week",
    )
    date: str = Field(
        ...,
        description="Reference calendar date (start of collection or week, AAAA-MM-DD).",
        title="Date",
    )
    price_nominal: float = Field(
        ...,
        description="Nominal price in original unit (e.g. R$/L, R$/m³, US$/bbl).",
        title="Price Nominal",
    )
    price_mj: float | None = Field(
        default=None,
        description="Converted energy price in R$/MJ using LHV, if applicable.",
        title="Price per MJ",
    )
    is_fallback: bool = Field(
        default=False,
        description="True if state coverage was insufficient and national fallback was used.",
        title="Is Fallback",
    )
    sample_size: int | None = Field(
        default=None,
        ge=0,
        description="Number of sampled locations or observations in the week.",
        title="Sample Size",
    )


class FuelSeries(BaseModel):
    """Time series for a specific fuel product or commodity."""

    model_config = ConfigDict(extra="forbid")

    source_id: Annotated[str, StringConstraints(pattern=r"^[A-Z][0-9]{2}$")] = Field(
        ...,
        description="Source ID registered in sources.json (e.g. P01, P02).",
        title="Source Id",
    )
    unit_nominal: str = Field(
        ...,
        description="Original nominal measurement unit (e.g. 'R$/L', 'R$/m³', 'US$/bbl').",
        title="Unit Nominal",
    )
    unit_energy: str | None = Field(
        default=None,
        description="Energy price unit, typically 'R$/MJ'.",
        title="Unit Energy",
    )
    series: list[PricePoint] = Field(
        default_factory=list,
        description="Chronological series of weekly aggregated price points.",
        title="Series",
    )


class PricesHistory(BaseModel):
    """Weekly historical prices dataset exported for frontend visualizer."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    dollar_schema: str | None = Field(
        default="../schemas/prices_history.schema.json",
        alias="$schema",
        title="$schema",
    )
    schema_version: Literal[1] = Field(
        default=1,
        title="Schema Version",
    )
    generated_at: str = Field(
        ...,
        description="Timestamp of dataset generation.",
        title="Generated At",
    )
    reference_uf: str = Field(
        default="SC",
        description="Reference federated state (UF).",
        title="Reference UF",
    )
    fuels: dict[str, FuelSeries] = Field(
        default_factory=dict,
        description="Fuel and commodity price series keyed by identifier.",
        title="Fuels",
    )

    @classmethod
    def load(cls, path: Path) -> PricesHistory:
        content = path.read_text(encoding="utf-8")
        data = json.loads(content)
        return cls.model_validate(data)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        dump = self.model_dump(exclude_none=True, by_alias=True)
        path.write_text(
            json.dumps(dump, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


class DefaultPriceItem(BaseModel):
    """Calculated default price baseline with provenance."""

    model_config = ConfigDict(extra="forbid")

    value: float = Field(..., title="Value")
    unit: str = Field(..., title="Unit")
    source_id: str = Field(..., title="Source Id")
    badge: QualityBadge = Field(..., title="Badge")
    notes: str = Field(..., title="Notes")
    weeks_window: int | None = Field(default=None, title="Weeks Window")
    reference_uf: str = Field(..., title="Reference UF")
    is_fallback: bool = Field(default=False, title="Is Fallback")


class DefaultPricesCatalog(BaseModel):
    """Calculated default baseline prices for fuels."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    schema_version: Literal[1] = Field(default=1, title="Schema Version")
    generated_at: str = Field(..., title="Generated At")
    defaults: dict[str, DefaultPriceItem] = Field(
        default_factory=dict, title="Defaults"
    )

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        dump = self.model_dump(exclude_none=True, by_alias=True)
        path.write_text(
            json.dumps(dump, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


# =============================================================================
# Freight Corridors Models
# =============================================================================


class RefuelingPoints(BaseModel):
    """Heavy-duty fueling and charging infrastructure along a route."""

    model_config = ConfigDict(extra="forbid")

    diesel: str = Field(
        ...,
        description="Descrição e disponibilidade de postos a diesel.",
        title="Diesel",
    )
    biomethane_cng: str = Field(
        ...,
        description="Disponibilidade de postos de biometano e GNV/GNC.",
        title="Biomethane / CNG",
    )
    electric_hpc: str = Field(
        ...,
        description="Disponibilidade de postos de recarga rápida >150kW.",
        title="Electric HPC",
    )


class PowertrainEvaluation(BaseModel):
    """Operational and environmental evaluation for a specific powertrain on a route."""

    model_config = ConfigDict(extra="forbid")

    feasibility_label: str = Field(
        ...,
        description="Rótulo qualitativo da viabilidade.",
        title="Feasibility Label",
    )
    stops_description: str = Field(
        ...,
        description="Descrição das paradas necessárias para abastecimento/recarga.",
        title="Stops Description",
    )
    refuel_time_minutes: int = Field(
        ...,
        ge=0,
        description="Tempo total estimado de recarga/reabastecimento em minutos.",
        title="Refuel Time (minutes)",
    )
    payload_penalty_kg: float = Field(
        ...,
        description="Impacto na capacidade líquida de carga útil em kg.",
        title="Payload Penalty (kg)",
    )
    emission_reduction_percent: float = Field(
        ...,
        description="Redução percentual de emissões de GEE vs diesel.",
        title="Emission Reduction Percent",
    )
    recommendation: str = Field(
        ...,
        description="Recomendação técnico-operacional para a rota.",
        title="Recommendation",
    )


class FreightCorridor(BaseModel):
    """Strategic heavy freight transportation corridor."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(
        ...,
        description="Identificador unívoco do corredor rodoviário.",
        title="Id",
    )
    name: str = Field(
        ...,
        description="Nome do corredor e rodovias principais.",
        title="Name",
    )
    origin: str = Field(
        ...,
        description="Polo de origem da carga.",
        title="Origin",
    )
    destination: str = Field(
        ...,
        description="Destino final da carga.",
        title="Destination",
    )
    distance_km: float = Field(
        ...,
        gt=0,
        description="Extensão total do trecho em quilômetros.",
        title="Distance (km)",
    )
    cargo_profile: str = Field(
        ...,
        description="Perfil predominante de carga e segmento.",
        title="Cargo Profile",
    )
    typical_pbtc: str = Field(
        ...,
        description="Configuração veicular típica e PBTC.",
        title="Typical PBTC",
    )
    highways: list[str] | None = Field(
        default=None,
        description="Principais rodovias que compõem o corredor.",
        title="Highways",
    )
    route_waypoints: list[list[float]] | None = Field(
        default=None,
        description="Sequência ordenada de coordenadas [longitude, latitude] representando o traçado esquemático do corredor.",
        title="Route Waypoints",
    )
    refueling_points: RefuelingPoints = Field(
        ...,
        description="Infraestrutura de abastecimento ao longo da rota.",
        title="Refueling Points",
    )
    powertrain_evaluations: dict[str, PowertrainEvaluation] = Field(
        ...,
        description="Avaliação por tipo de trem de força.",
        title="Powertrain Evaluations",
    )
    source_ids: list[Annotated[str, StringConstraints(pattern=r"^[A-Z][0-9]{2}$")]] = (
        Field(
            ...,
            description="Lista de IDs de fontes associadas no catálogo de fontes.",
            title="Source Ids",
        )
    )


class CorridorsCatalog(BaseModel):
    """Catalog of strategic Brazilian freight corridors."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    dollar_schema: str | None = Field(
        default="../../schemas/corridors.schema.json",
        alias="$schema",
        title="$schema",
    )
    schema_version: Literal[1] = Field(
        default=1,
        title="Schema Version",
    )
    generated_at: str = Field(
        ...,
        description="Data de geração do catálogo.",
        title="Generated At",
    )
    corridors: list[FreightCorridor] = Field(
        ...,
        description="Lista de corredores mapeados.",
        title="Corridors",
    )

    @classmethod
    def load(cls, path: Path) -> CorridorsCatalog:
        content = path.read_text(encoding="utf-8")
        data = json.loads(content)
        return cls.model_validate(data)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        dump = self.model_dump(exclude_none=True, by_alias=True)
        path.write_text(
            json.dumps(dump, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


# =============================================================================
# Local Pollutants Models
# =============================================================================


class LegalLimitsWhtc(BaseModel):
    """Regulatory pollutant emission limits in WHTC test cycle."""

    model_config = ConfigDict(extra="forbid")

    nox_g_kwh: float = Field(
        ...,
        description="Limite regulatório de NOx em g/kWh (ciclo WHTC).",
        title="NOx Limit (g/kWh)",
    )
    pm_g_kwh: float = Field(
        ...,
        description="Limite regulatório de Material Particulado em g/kWh.",
        title="PM Limit (g/kWh)",
    )
    co_g_kwh: float = Field(
        ...,
        description="Limite regulatório de Monóxido de Carbono em g/kWh.",
        title="CO Limit (g/kWh)",
    )
    ch4_slip_g_kwh: float = Field(
        ...,
        description="Limite regulatório de metano fugitivo (slip) em g/kWh.",
        title="CH4 Slip Limit (g/kWh)",
    )


class PowertrainPollutants(BaseModel):
    """Atmospheric criteria pollutant emissions for a specific powertrain."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(
        ...,
        description="Nome descritivo da propulsão.",
        title="Label",
    )
    fossil_co2_g_km: float = Field(
        ...,
        ge=0,
        description="Emissão fóssil direta de CO2 em g/km.",
        title="Fossil CO2 (g/km)",
    )
    methane_ch4_g_km: float = Field(
        ...,
        ge=0,
        description="Emissão de metano não queimado em g/km.",
        title="Methane CH4 (g/km)",
    )
    nox_g_kwh: float = Field(
        ...,
        ge=0,
        description="Emissão ponderada de óxidos de nitrogênio em g/kWh.",
        title="NOx (g/kWh)",
    )
    nox_g_km: float = Field(
        ...,
        ge=0,
        description="Emissão estimada de NOx por quilômetro rodado.",
        title="NOx (g/km)",
    )
    pm25_g_kwh: float = Field(
        ...,
        ge=0,
        description="Emissão de Material Particulado MP2.5 em g/kWh.",
        title="PM2.5 (g/kWh)",
    )
    pm25_g_km: float = Field(
        ...,
        ge=0,
        description="Emissão estimada de MP2.5 em g/km.",
        title="PM2.5 (g/km)",
    )
    noise_db: float = Field(
        ...,
        ge=0,
        description="Nível de ruído externo padronizado em dB(A).",
        title="Noise (dB)",
    )
    urban_impact: str = Field(
        ...,
        description="Classificação do impacto ambiental e na saúde urbana.",
        title="Urban Impact",
    )
    nox_reduction_percent: float = Field(
        ...,
        description="Redução percentual de NOx em relação ao diesel Euro VI.",
        title="NOx Reduction Percent",
    )
    pm_reduction_percent: float = Field(
        ...,
        description="Redução percentual de Material Particulado vs diesel Euro VI.",
        title="PM Reduction Percent",
    )


class LocalPollutantsCatalog(BaseModel):
    """Catalog of local air pollutants and vehicle emission standards."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    dollar_schema: str | None = Field(
        default="../../schemas/local_pollutants.schema.json",
        alias="$schema",
        title="$schema",
    )
    schema_version: Literal[1] = Field(
        default=1,
        title="Schema Version",
    )
    generated_at: str = Field(
        ...,
        description="Data de geração do catálogo.",
        title="Generated At",
    )
    reference_standard: str = Field(
        ...,
        description="Norma ambiental regulatória de referência.",
        title="Reference Standard",
    )
    source_id: Annotated[str, StringConstraints(pattern=r"^[A-Z][0-9]{2}$")] = Field(
        ...,
        description="ID da fonte no catálogo de fontes.",
        title="Source Id",
    )
    legal_limits_whtc: LegalLimitsWhtc = Field(
        ...,
        description="Limites máximos legais do Proconve P8 / Euro VI.",
        title="Legal Limits WHTC",
    )
    powertrains: dict[str, PowertrainPollutants] = Field(
        ...,
        description="Emissões de poluentes locais por trem de força.",
        title="Powertrains",
    )

    @classmethod
    def load(cls, path: Path) -> LocalPollutantsCatalog:
        content = path.read_text(encoding="utf-8")
        data = json.loads(content)
        return cls.model_validate(data)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        dump = self.model_dump(exclude_none=True, by_alias=True)
        path.write_text(
            json.dumps(dump, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


# =============================================================================
# Global Benchmarks Models
# =============================================================================


class WtwEmissionsBenchmark(BaseModel):
    """Lifecycle Well-to-Wheel emissions benchmark by powertrain."""

    model_config = ConfigDict(extra="forbid")

    diesel_baseline: float = Field(
        ...,
        description="Emissão WtW do diesel fóssil de referência (gCO2eq/t.km).",
        title="Diesel Baseline",
    )
    biomethane_vinasse: float = Field(
        ...,
        description="Emissão WtW do biometano agroindustrial (gCO2eq/t.km).",
        title="Biomethane Vinasse",
    )
    bev_grid: float = Field(
        ...,
        description="Emissão WtW de caminhão elétrico recarregado na rede local (gCO2eq/t.km).",
        title="BEV Grid",
    )


class EnergyCostBenchmark(BaseModel):
    """Levelized cost of mechanical energy at the crankshaft."""

    model_config = ConfigDict(extra="forbid")

    biomethane: float = Field(
        ...,
        description="Custo nivelado do biometano útil no virabrequim (R$/MWh-eq).",
        title="Biomethane",
    )
    offpeak_electricity: float = Field(
        ...,
        description="Custo de eletricidade fora ponta no virabrequim (R$/MWh-eq).",
        title="Off-Peak Electricity",
    )
    diesel_s10: float = Field(
        ...,
        description="Custo do diesel fóssil útil no virabrequim (R$/MWh-eq).",
        title="Diesel S10",
    )
    hpc_electricity: float | None = Field(
        default=None,
        description="Custo em eletroposto público de alta potência (R$/MWh-eq).",
        title="HPC Electricity",
    )
    commercial_electricity: float | None = Field(
        default=None,
        description="Custo comercial de eletricidade (R$/MWh-eq).",
        title="Commercial Electricity",
    )


class RegionBenchmark(BaseModel):
    """Macroeconomic and decarbonization benchmark profile for a region."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(
        ...,
        description="Nome descritivo da região/país.",
        title="Name",
    )
    code: str = Field(
        ...,
        description="Código ISO ou sigla da região.",
        title="Code",
    )
    currency: str = Field(
        ...,
        description="Moeda local.",
        title="Currency",
    )
    flag: str = Field(
        ...,
        description="Emoji da bandeira nacional.",
        title="Flag",
    )
    renewable_grid_share_percent: float = Field(
        ...,
        ge=0,
        le=100,
        description="Participação de renováveis na matriz elétrica (%).",
        title="Renewable Grid Share (%)",
    )
    grid_carbon_intensity_g_kwh: float = Field(
        ...,
        ge=0,
        description="Intensidade de emissões de carbono da rede elétrica (gCO2eq/kWh).",
        title="Grid Carbon Intensity (gCO2eq/kWh)",
    )
    diesel_price_usd_per_liter: float = Field(
        ...,
        ge=0,
        description="Preço médio de bomba do diesel (US$/L).",
        title="Diesel Price (US$/L)",
    )
    electricity_price_usd_per_kwh: float = Field(
        ...,
        ge=0,
        description="Tarifa média comercial/industrial de eletricidade (US$/kWh).",
        title="Electricity Price (US$/kWh)",
    )
    capex_subsidy_max_usd: float = Field(
        ...,
        ge=0,
        description="Valor máximo de subsídio governamental direto por caminhão (US$).",
        title="Max CAPEX Subsidy (US$)",
    )
    battery_weight_allowance_kg: float = Field(
        ...,
        ge=0,
        description="Compensação legal de peso para baterias na balança (kg).",
        title="Battery Weight Allowance (kg)",
    )
    dominant_pathway: str = Field(
        ...,
        description="Rota tecnológica prioritária na política pública do país.",
        title="Dominant Pathway",
    )
    wtw_emissions_g_co2eq_tkm: WtwEmissionsBenchmark = Field(
        ...,
        description="Emissões de ciclo de vida Well-to-Wheel (gCO2eq/t.km).",
        title="WtW Emissions (gCO2eq/t.km)",
    )
    energy_cost_levelized_mwh_eq: EnergyCostBenchmark = Field(
        ...,
        description="Custo da energia nivelada no eixo mecânico (R$/MWh-eq).",
        title="Energy Cost Levelized (R$/MWh-eq)",
    )
    regulatory_mechanism: str = Field(
        ...,
        description="Instrumentos regulatórios e mercados de carbono em vigor.",
        title="Regulatory Mechanism",
    )
    capex_subsidy_status: str = Field(
        ...,
        description="Políticas de incentivo e subsídios diretos na aquisição de veículos.",
        title="CAPEX Subsidy Status",
    )
    battery_weight_regulation: str = Field(
        ...,
        description="Legislação sobre tolerância de peso e limites da balança.",
        title="Battery Weight Regulation",
    )


class GlobalBenchmarksCatalog(BaseModel):
    """Catalog of international heavy freight transition benchmarks."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    dollar_schema: str | None = Field(
        default="../../schemas/global_benchmarks.schema.json",
        alias="$schema",
        title="$schema",
    )
    schema_version: Literal[1] = Field(
        default=1,
        title="Schema Version",
    )
    generated_at: str = Field(
        ...,
        description="Data de geração do catálogo.",
        title="Generated At",
    )
    source_ids: list[Annotated[str, StringConstraints(pattern=r"^[A-Z][0-9]{2}$")]] = (
        Field(
            ...,
            description="Lista de IDs de fontes no catálogo de fontes.",
            title="Source Ids",
        )
    )
    regions: dict[str, RegionBenchmark] = Field(
        ...,
        description="Benchmarks regionais comparativos.",
        title="Regions",
    )

    @classmethod
    def load(cls, path: Path) -> GlobalBenchmarksCatalog:
        content = path.read_text(encoding="utf-8")
        data = json.loads(content)
        return cls.model_validate(data)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        dump = self.model_dump(exclude_none=True, by_alias=True)
        path.write_text(
            json.dumps(dump, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


# =============================================================================
# Corridor Fuel & Charging Infrastructure Models
# =============================================================================

StationTechnology = Literal["biomethane_cng", "electric_hpc"]
StationStatus = Literal["Operacional", "Em Expansão", "Planejado"]


class FuelStation(BaseModel):
    """Georeferenced highway refueling or heavy-duty charging hub."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(
        ...,
        min_length=1,
        description="Identificador único do ponto ou hub rodoviário.",
        title="Id",
    )
    name: str = Field(
        ...,
        min_length=1,
        description="Nome operacional do hub/entroncamento rodoviário (sem PII/CNPJ).",
        title="Name",
    )
    technology: StationTechnology = Field(
        ...,
        description="Tecnologia energética do ponto: 'biomethane_cng' ou 'electric_hpc'.",
        title="Technology",
    )
    corridor_ids: list[str] = Field(
        default_factory=list,
        description="Lista de IDs dos corredores logísticos atendidos (vazia para polos regionais fora de eixo mapeado).",
        title="Corridor Ids",
    )
    highway: str = Field(
        ...,
        min_length=1,
        description="Rodovia principal de localização (ex.: BR-163, SP-330, BR-116).",
        title="Highway",
    )
    km_marker: float | None = Field(
        default=None,
        ge=0,
        description="Quilômetro aproximado na rodovia de referência.",
        title="KM Marker",
    )
    city: str = Field(
        ...,
        min_length=1,
        description="Município de referência.",
        title="City",
    )
    state: Annotated[str, StringConstraints(pattern=r"^[A-Z]{2}$")] = Field(
        ...,
        description="Sigla da Unidade Federativa (UF).",
        title="State",
    )
    latitude: float = Field(
        ...,
        ge=-34.0,
        le=6.0,
        description="Latitude geográfica (graus decimais).",
        title="Latitude",
    )
    longitude: float = Field(
        ...,
        ge=-75.0,
        le=-32.0,
        description="Longitude geográfica (graus decimais).",
        title="Longitude",
    )
    capacity_spec: str = Field(
        ...,
        min_length=1,
        description="Especificação de vazão ou potência instalada (ex.: 'GNC Alta Vazão' ou 'HPC 300 kW CCS2').",
        title="Capacity Spec",
    )
    power_kw: float | None = Field(
        default=None,
        gt=0,
        description="Potência elétrica nominal em kW (para eletropostos HPC >150 kW).",
        title="Power (kW)",
    )
    high_flow_truck_ready: bool = Field(
        default=True,
        description="Indica se o ponto dispõe de acesso/bico/vaga compatível com caminhões pesados.",
        title="High Flow Truck Ready",
    )
    operator_network: str | None = Field(
        default=None,
        description="Rede, concessionária ou distribuidora de referência.",
        title="Operator Network",
    )
    status: StationStatus = Field(
        default="Operacional",
        description="Status operacional do ponto.",
        title="Status",
    )
    badge: QualityBadge = Field(
        ...,
        description="Selo de qualidade do registro ('Primária', 'Adaptada' ou 'Ilustrativa').",
        title="Badge",
    )
    source_id: Annotated[str, StringConstraints(pattern=r"^[A-Z][0-9]{2}$")] = Field(
        ...,
        description="ID da fonte no catálogo data/sources.json.",
        title="Source Id",
    )


class CorridorFuelStationsCatalog(BaseModel):
    """Catalog of georeferenced highway refueling and HPC charging hubs."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    dollar_schema: str | None = Field(
        default="../../schemas/corridor_fuel_stations.schema.json",
        alias="$schema",
        title="$schema",
    )
    schema_version: Literal[1] = Field(
        default=1,
        title="Schema Version",
    )
    generated_at: str = Field(
        ...,
        description="Data de geração do catálogo.",
        title="Generated At",
    )
    stations: list[FuelStation] = Field(
        ...,
        description="Relação de postos/hubs rodoviários georreferenciados.",
        title="Stations",
    )

    @classmethod
    def load(cls, path: Path) -> CorridorFuelStationsCatalog:
        content = path.read_text(encoding="utf-8")
        data = json.loads(content)
        return cls.model_validate(data)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        dump = self.model_dump(exclude_none=True, by_alias=True)
        path.write_text(
            json.dumps(dump, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


def export_all_schemas(schemas_dir: Path) -> dict[str, Path]:
    """Export JSON Schema for all models to target directory."""
    schemas_dir.mkdir(parents=True, exist_ok=True)
    results: dict[str, Path] = {}
    schema_map = {
        "manifest.schema.json": Manifest,
        "parameters.schema.json": SimulationParameters,
        "sources.schema.json": SourcesCatalog,
        "prices_history.schema.json": PricesHistory,
        "corridors.schema.json": CorridorsCatalog,
        "corridor_fuel_stations.schema.json": CorridorFuelStationsCatalog,
        "local_pollutants.schema.json": LocalPollutantsCatalog,
        "global_benchmarks.schema.json": GlobalBenchmarksCatalog,
    }
    for filename, model_cls in schema_map.items():
        out_file = schemas_dir / filename
        schema = model_cls.model_json_schema()
        schema = {"$schema": "https://json-schema.org/draft/2020-12/schema", **schema}
        out_file.write_text(
            json.dumps(schema, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        results[filename] = out_file
    return results
