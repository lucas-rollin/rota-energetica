from __future__ import annotations

import json
from pathlib import Path

import pytest

from pipeline.aggregator import (
    aggregate_anp_series,
    parse_brent_csv,
)
from pipeline.config import PipelineConfig
from pipeline.defaults import compute_default_prices
from pipeline.models import (
    PricesHistory,
    SourcesCatalog,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def create_synthetic_anp_csv(path: Path, rows: list[dict[str, str]]) -> None:
    """Helper to write synthetic ANP semicolon-separated CSV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    header = [
        "Regiao - Sigla",
        "Estado - Sigla",
        "Municipio",
        "Revenda",
        "CNPJ da Revenda",
        "Nome da Rua",
        "Numero Rua",
        "Complemento",
        "Bairro",
        "Cep",
        "Produto",
        "Data da Coleta",
        "Valor de Venda",
        "Valor de Compra",
        "Unidade de Medida",
        "Bandeira",
    ]
    lines = [";".join(header)]
    for r in rows:
        row_vals = [
            r.get("regiao", "S"),
            r.get("uf", "SC"),
            r.get("municipio", "FLORIANOPOLIS"),
            r.get("revenda", "POSTO TESTE"),
            r.get("cnpj", "00.000.000/0001-00"),
            r.get("rua", "RUA TESTE"),
            r.get("numero", "100"),
            r.get("comp", ""),
            r.get("bairro", "CENTRO"),
            r.get("cep", "88000-000"),
            r.get("produto", "DIESEL S10"),
            r.get("data", "15/05/2026"),
            r.get("valor", "6,50"),
            r.get("compra", ""),
            r.get("unidade", "R$ / litro"),
            r.get("bandeira", "BRANCA"),
        ]
        lines.append(";".join(row_vals))
    path.write_text("\n".join(lines) + "\n", encoding="utf-8-sig")


def test_synthetic_anp_parsing_and_fallback(tmp_path: Path):
    """Test parsing, municipality median aggregation, and fallback logic on synthetic CSVs."""
    csv_file = tmp_path / "anp_test.csv"
    create_synthetic_anp_csv(
        csv_file,
        [
            # Week 20: Only 2 municipalities in SC (below min_municipalities=3 threshold -> triggers fallback)
            {
                "uf": "SC",
                "municipio": "JOINVILLE",
                "produto": "DIESEL S10",
                "data": "11/05/2026",
                "valor": "6,40",
            },
            {
                "uf": "SC",
                "municipio": "JOINVILLE",
                "produto": "DIESEL S10",
                "data": "12/05/2026",
                "valor": "6,60",
            },
            {
                "uf": "SC",
                "municipio": "BLUMENAU",
                "produto": "DIESEL S10",
                "data": "13/05/2026",
                "valor": "6,50",
            },
            # National points in other states
            {
                "uf": "PR",
                "municipio": "CURITIBA",
                "produto": "DIESEL S10",
                "data": "11/05/2026",
                "valor": "6,20",
            },
            {
                "uf": "SP",
                "municipio": "CAMPINAS",
                "produto": "DIESEL S10",
                "data": "12/05/2026",
                "valor": "6,30",
            },
            # Week 21: 3 municipalities in SC -> valid state coverage without fallback
            {
                "uf": "SC",
                "municipio": "JOINVILLE",
                "produto": "DIESEL S10",
                "data": "18/05/2026",
                "valor": "6,40",
            },
            {
                "uf": "SC",
                "municipio": "BLUMENAU",
                "produto": "DIESEL S10",
                "data": "19/05/2026",
                "valor": "6,50",
            },
            {
                "uf": "SC",
                "municipio": "ITAJAI",
                "produto": "DIESEL S10",
                "data": "20/05/2026",
                "valor": "6,60",
            },
            # Invalid data lines: negative price and empty value must be filtered out
            {
                "uf": "SC",
                "municipio": "ITAJAI",
                "produto": "DIESEL S10",
                "data": "20/05/2026",
                "valor": "-5,00",
            },
            {
                "uf": "SC",
                "municipio": "ITAJAI",
                "produto": "DIESEL S10",
                "data": "20/05/2026",
                "valor": "",
            },
        ],
    )

    config = PipelineConfig(reference_uf="SC", min_municipalities_per_week=3)
    results = aggregate_anp_series([csv_file], config)

    diesel_pts = results["diesel_s10"]
    assert len(diesel_pts) == 2

    # Week 20: triggered fallback because only 2 SC municipalities
    pt_w20 = diesel_pts[0]
    assert pt_w20.week == "2026-W20"
    assert pt_w20.is_fallback is True

    # Week 21: did not trigger fallback because 3 SC municipalities
    pt_w21 = diesel_pts[1]
    assert pt_w21.week == "2026-W21"
    assert pt_w21.is_fallback is False
    assert pt_w21.price_nominal == 6.50


def test_synthetic_brent_parsing(tmp_path: Path):
    """Test parsing and sorting of Brent weekly CSV series."""
    brent_file = tmp_path / "brent_test.csv"
    brent_file.write_text(
        "Date,Price\n"
        "2026-06-12,85.50\n"
        "2026-06-19,81.00\n"
        "2026-06-26,0\n"  # zero price must be filtered out
        "invalid,90.00\n",
        encoding="utf-8",
    )

    points = parse_brent_csv(brent_file)
    assert len(points) == 2
    assert points[0].week == "2026-W24"
    assert points[0].price_nominal == 85.50
    assert points[1].week == "2026-W25"
    assert points[1].price_nominal == 81.00


def test_compute_and_apply_defaults(tmp_path: Path):
    """Test rolling median computation and parameters updating."""
    # Create mock history with 5 weeks
    points = [
        {
            "week": "2026-W01",
            "date": "2026-01-05",
            "price_nominal": 7.00,
            "is_fallback": False,
        },
        {
            "week": "2026-W02",
            "date": "2026-01-12",
            "price_nominal": 7.10,
            "is_fallback": False,
        },
        {
            "week": "2026-W03",
            "date": "2026-01-19",
            "price_nominal": 7.20,
            "is_fallback": False,
        },
        {
            "week": "2026-W04",
            "date": "2026-01-26",
            "price_nominal": 7.30,
            "is_fallback": False,
        },
        {
            "week": "2026-W05",
            "date": "2026-02-02",
            "price_nominal": 7.40,
            "is_fallback": False,
        },
    ]

    history_json = {
        "schema_version": 1,
        "generated_at": "2026-10-31T00:00:00Z",
        "reference_uf": "SC",
        "fuels": {
            "diesel_s10": {
                "source_id": "P01",
                "unit_nominal": "R$/L",
                "unit_energy": "R$/MJ",
                "series": points,
            }
        },
    }

    history_path = tmp_path / "prices_history.json"
    history_path.write_text(json.dumps(history_json), encoding="utf-8")

    history = PricesHistory.load(history_path)
    config = PipelineConfig(baseline_window_weeks=3, reference_uf="SC")

    defaults = compute_default_prices(
        history,
        config,
        aneel_data=(1.01, "RESOLUÇÃO 3.602/2026", "2026-08-22"),
        biomethane_price=4.60,
    )
    assert "diesel" in defaults.defaults
    diesel_default = defaults.defaults["diesel"]
    # Last 3 points: 7.20, 7.30, 7.40 -> median is 7.30
    assert diesel_default.value == 7.30
    assert diesel_default.badge == "Adaptada"
    assert diesel_default.source_id == "P01"

    # Check biomethane and electric additions
    assert "biometano" in defaults.defaults
    assert defaults.defaults["biometano"].value == 4.60
    assert defaults.defaults["biometano"].badge == "Ilustrativa"

    assert "eletrico" in defaults.defaults
    assert defaults.defaults["eletrico"].value == 1.01
    assert defaults.defaults["eletrico"].badge == "Adaptada"


def test_processed_files_referential_integrity():
    """Verify that committed processed datasets are valid against catalogs and schemas."""
    processed_dir = REPO_ROOT / "data" / "processed"
    history_path = processed_dir / "prices_history.json"
    sources_path = REPO_ROOT / "data" / "sources.json"

    assert history_path.exists(), (
        "data/processed/prices_history.json must exist in repository"
    )
    assert sources_path.exists(), "data/sources.json must exist"

    sources_catalog = SourcesCatalog.load(sources_path)
    known_source_ids = {s.id for s in sources_catalog.sources}

    history = PricesHistory.load(history_path)
    assert history.schema_version == 1
    assert "diesel_s10" in history.fuels
    assert "gnv" in history.fuels
    assert "brent" in history.fuels

    # Check referential integrity: fuel series source_ids exist in sources.json
    for fuel_key, series in history.fuels.items():
        assert series.source_id in known_source_ids, (
            f"Fuel series '{fuel_key}' has unknown source_id '{series.source_id}'"
        )
        assert len(series.series) > 0, f"Fuel series '{fuel_key}' has empty series"

    # Verify no raw station/store lines exist in published processed file (LICENSE-DATA §5)
    content = history_path.read_text(encoding="utf-8")
    assert "CNPJ" not in content
    assert "Revenda" not in content


@pytest.mark.skipif(
    not (REPO_ROOT / "data" / "raw" / "anp").exists(),
    reason="Local data/raw/anp directory not present (CI runner environment)",
)
def test_full_pipeline_raw_files_available():
    """Integration check verifying raw ANP and EIA files can be aggregated."""
    anp_files = list((REPO_ROOT / "data" / "raw" / "anp").glob("ca-*.csv"))
    assert len(anp_files) >= 10
