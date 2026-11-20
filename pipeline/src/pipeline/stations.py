"""Highway refueling & charging infrastructure validation and GeoJSON preparation."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

from pipeline.models import (
    CorridorFuelStationsCatalog,
    CorridorsCatalog,
    FuelStation,
    QualityBadge,
    SourcesCatalog,
    StationStatus,
    StationTechnology,
    get_current_iso_timestamp,
)

# Official IBGE 2-digit state codes mapped to (UF, Name)
IBGE_UF_MAP: dict[str, tuple[str, str]] = {
    "11": ("RO", "Rondônia"),
    "12": ("AC", "Acre"),
    "13": ("AM", "Amazonas"),
    "14": ("RR", "Roraima"),
    "15": ("PA", "Pará"),
    "16": ("AP", "Amapá"),
    "17": ("TO", "Tocantins"),
    "21": ("MA", "Maranhão"),
    "22": ("PI", "Piauí"),
    "23": ("CE", "Ceará"),
    "24": ("RN", "Rio Grande do Norte"),
    "25": ("PB", "Paraíba"),
    "26": ("PE", "Pernambuco"),
    "27": ("AL", "Alagoas"),
    "28": ("SE", "Sergipe"),
    "29": ("BA", "Bahia"),
    "31": ("MG", "Minas Gerais"),
    "32": ("ES", "Espírito Santo"),
    "33": ("RJ", "Rio de Janeiro"),
    "35": ("SP", "São Paulo"),
    "41": ("PR", "Paraná"),
    "42": ("SC", "Santa Catarina"),
    "43": ("RS", "Rio Grande do Sul"),
    "50": ("MS", "Mato Grosso do Sul"),
    "51": ("MT", "Mato Grosso"),
    "52": ("GO", "Goiás"),
    "53": ("DF", "Distrito Federal"),
}

FORBIDDEN_PII_FIELDS = frozenset(
    {
        "cnpj",
        "cpf",
        "razao_social",
        "razão social",
        "cnpj da revenda",
        "revenda_cnpj",
    }
)


def _round_coords(coords: Any, precision: int = 3) -> Any:
    """Recursively round GeoJSON coordinate pairs to reduce payload size."""
    if isinstance(coords, (int, float)):
        return round(float(coords), precision)
    if isinstance(coords, list):
        return [_round_coords(item, precision) for item in coords]
    return coords


def build_brazil_states_geojson(
    raw_geojson_path: Path,
    output_path: Path,
    precision: int = 3,
) -> int:
    """Normalize IBGE UF GeoJSON with state abbreviations and names for ECharts."""
    raw_data = json.loads(raw_geojson_path.read_text(encoding="utf-8"))
    features = raw_data.get("features", [])
    processed_features: list[dict[str, Any]] = []

    for feature in features:
        props = feature.get("properties") or {}
        codarea = str(props.get("codarea", "")).strip()
        sigla, name = IBGE_UF_MAP.get(codarea, (codarea, codarea))
        geom = feature.get("geometry") or {}
        processed_features.append(
            {
                "type": "Feature",
                "properties": {
                    "codarea": codarea,
                    "sigla": sigla,
                    "name": name,
                },
                "geometry": {
                    "type": geom.get("type"),
                    "coordinates": _round_coords(
                        geom.get("coordinates", []), precision=precision
                    ),
                },
            }
        )

    output_payload = {
        "type": "FeatureCollection",
        "features": processed_features,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(output_payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    return len(processed_features)


def sanitize_station_record(raw: dict[str, Any]) -> dict[str, Any]:
    """Strip PII/CNPJ columns and normalize a raw station dictionary."""
    cleaned = {
        k: v
        for k, v in raw.items()
        if k.strip().lower() not in FORBIDDEN_PII_FIELDS and v not in ("", None)
    }
    if "corridor_ids" in cleaned and isinstance(cleaned["corridor_ids"], str):
        cleaned["corridor_ids"] = [
            c.strip() for c in cleaned["corridor_ids"].split(",") if c.strip()
        ]
    if "state" in cleaned and isinstance(cleaned["state"], str):
        cleaned["state"] = cleaned["state"].strip().upper()
    if "km_marker" in cleaned and cleaned["km_marker"] is not None:
        cleaned["km_marker"] = float(cleaned["km_marker"])
    if "power_kw" in cleaned and cleaned["power_kw"] is not None:
        cleaned["power_kw"] = float(cleaned["power_kw"])
    if "latitude" in cleaned:
        cleaned["latitude"] = float(cleaned["latitude"])
    if "longitude" in cleaned:
        cleaned["longitude"] = float(cleaned["longitude"])
    if "high_flow_truck_ready" in cleaned and isinstance(
        cleaned["high_flow_truck_ready"], str
    ):
        cleaned["high_flow_truck_ready"] = cleaned[
            "high_flow_truck_ready"
        ].strip().lower() in ("true", "1", "sim", "yes")
    return cleaned


def ingest_stations_csv(
    csv_path: Path,
    min_hpc_power_kw: float = 150.0,
) -> list[FuelStation]:
    """Ingest and validate highway station records from a raw CSV export.

    Automatically strips forbidden PII/CNPJ columns and filters out slow EV
    chargers below ``min_hpc_power_kw``.
    """
    stations: list[FuelStation] = []
    seen_ids: set[str] = set()

    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        sample = f.read(1024)
        f.seek(0)
        delimiter = ";" if sample.count(";") >= sample.count(",") else ","
        reader = csv.DictReader(f, delimiter=delimiter)

        for row in reader:
            cleaned = sanitize_station_record(dict(row))
            tech_val: StationTechnology = cleaned.get("technology", "biomethane_cng")
            power_val = cleaned.get("power_kw")
            if tech_val == "electric_hpc" and (
                power_val is None or float(power_val) <= min_hpc_power_kw
            ):
                continue

            status_val: StationStatus = cleaned.get("status", "Operacional")
            badge_val: QualityBadge = cleaned.get("badge", "Adaptada")
            cleaned["status"] = status_val
            cleaned["badge"] = badge_val

            station = FuelStation.model_validate(cleaned)
            if station.id in seen_ids:
                continue
            seen_ids.add(station.id)
            stations.append(station)

    return stations


def validate_stations_catalog(
    stations_catalog: CorridorFuelStationsCatalog,
    corridors_catalog: CorridorsCatalog,
    sources_catalog: SourcesCatalog,
) -> list[str]:
    """Validate referential integrity and data governance rules for fuel stations."""
    errors: list[str] = []
    known_corridors = {c.id for c in corridors_catalog.corridors}
    known_sources = {s.id for s in sources_catalog.sources}
    seen_ids: set[str] = set()

    for station in stations_catalog.stations:
        if station.id in seen_ids:
            errors.append(f"Duplicate station ID '{station.id}'")
        seen_ids.add(station.id)

        if station.source_id not in known_sources:
            errors.append(
                f"Station '{station.id}' references unknown source_id '{station.source_id}'"
            )

        for cid in station.corridor_ids:
            if cid not in known_corridors:
                errors.append(
                    f"Station '{station.id}' references unknown corridor_id '{cid}'"
                )

        if station.technology == "electric_hpc":
            if station.power_kw is None or station.power_kw <= 150:
                errors.append(
                    f"HPC station '{station.id}' must specify power_kw > 150 (got {station.power_kw})"
                )

    return errors


def build_stations_catalog_from_csv(
    csv_path: Path,
    output_path: Path,
) -> CorridorFuelStationsCatalog:
    """Build and save ``corridor_fuel_stations.json`` from a sanitized CSV input."""
    stations = ingest_stations_csv(csv_path)
    catalog = CorridorFuelStationsCatalog(
        generated_at=get_current_iso_timestamp()[:10],
        stations=stations,
    )
    catalog.save(output_path)
    return catalog
