from __future__ import annotations

import json
from pathlib import Path

from pipeline.models import (
    CorridorFuelStationsCatalog,
    CorridorsCatalog,
    SourcesCatalog,
)
from pipeline.stations import (
    build_brazil_states_geojson,
    ingest_stations_csv,
    validate_stations_catalog,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_ingest_stations_csv_strips_pii_and_filters_low_power(tmp_path: Path):
    csv_file = tmp_path / "stations.csv"
    csv_file.write_text(
        "id;name;technology;corridor_ids;highway;km_marker;city;state;latitude;longitude;capacity_spec;power_kw;high_flow_truck_ready;CNPJ;Razão Social;source_id;badge\n"
        "st-1;Hub Dutra;biomethane_cng;sp-rio;BR-116;150;Taubaté;SP;-23.026;-45.555;GNC Alta Vazão;;sim;12.345.678/0001-00;POSTO PRIVADO LTDA;I07;Adaptada\n"
        "st-2;Lento 50kW;electric_hpc;sp-rio;BR-116;160;Caçapava;SP;-23.10;-45.70;DC 50kW;50;false;;;I01;Ilustrativa\n"
        "st-3;HPC 300kW;electric_hpc;sp-rio;BR-116;147;São José dos Campos;SP;-23.21;-45.86;HPC 300 kW;300;true;;;I01;Ilustrativa\n",
        encoding="utf-8",
    )

    stations = ingest_stations_csv(csv_file)
    assert len(stations) == 2
    assert [s.id for s in stations] == ["st-1", "st-3"]
    assert stations[0].high_flow_truck_ready is True
    assert stations[1].power_kw == 300.0


def test_build_brazil_states_geojson(tmp_path: Path):
    raw_geojson = tmp_path / "raw.geo.json"
    raw_geojson.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {"codarea": "42"},
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [[[-49.123456, -27.654321], [-48.9, -27.5]]],
                        },
                    }
                ],
            }
        ),
        encoding="utf-8",
    )

    out_geojson = tmp_path / "out.geo.json"
    count = build_brazil_states_geojson(raw_geojson, out_geojson, precision=3)
    assert count == 1

    parsed = json.loads(out_geojson.read_text(encoding="utf-8"))
    props = parsed["features"][0]["properties"]
    assert props == {"codarea": "42", "sigla": "SC", "name": "Santa Catarina"}
    assert parsed["features"][0]["geometry"]["coordinates"][0][0] == [-49.123, -27.654]


def test_committed_stations_and_geojson():
    geojson_path = REPO_ROOT / "data" / "processed" / "brazil_states.geo.json"
    assert geojson_path.exists()
    geo_data = json.loads(geojson_path.read_text(encoding="utf-8"))
    assert len(geo_data["features"]) == 27

    stations = CorridorFuelStationsCatalog.load(
        REPO_ROOT / "data" / "processed" / "corridor_fuel_stations.json"
    )
    corridors = CorridorsCatalog.load(
        REPO_ROOT / "data" / "processed" / "corridors.json"
    )
    sources = SourcesCatalog.load(REPO_ROOT / "data" / "sources.json")
    errors = validate_stations_catalog(stations, corridors, sources)
    assert errors == []
