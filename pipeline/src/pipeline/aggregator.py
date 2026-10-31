"""ANP and EIA historical price series aggregation engine using Polars."""

from __future__ import annotations

import csv
import logging
from pathlib import Path

import polars as pl

from pipeline.config import PipelineConfig
from pipeline.models import (
    FuelSeries,
    PricePoint,
    PricesHistory,
    SimulationParameters,
    get_current_iso_timestamp,
)

logger = logging.getLogger(__name__)


def detect_file_encoding(file_path: Path) -> str:
    """Detect whether file starts with UTF-8 BOM or fallback to latin-1."""
    with open(file_path, "rb") as f:
        head = f.read(4)
        if head.startswith(b"\xef\xbb\xbf"):
            return "utf-8-sig"
    return "latin1"


def normalize_headers(file_path: Path) -> dict[str, str]:
    """Map raw ANP Portuguese headers to normalized canonical internal names."""
    encoding = detect_file_encoding(file_path)
    with open(file_path, encoding=encoding, errors="replace") as f:
        reader = csv.reader(f, delimiter=";")
        header = next(reader)

    mapping: dict[str, str] = {}
    for col in header:
        cleaned = col.strip()
        cleaned_lower = cleaned.lower()
        if "estado" in cleaned_lower and "sigla" in cleaned_lower:
            mapping[col] = "uf"
        elif "municipio" in cleaned_lower or "município" in cleaned_lower:
            mapping[col] = "municipio"
        elif "produto" in cleaned_lower:
            mapping[col] = "produto"
        elif "data" in cleaned_lower and "coleta" in cleaned_lower:
            mapping[col] = "data_coleta"
        elif "valor" in cleaned_lower and "venda" in cleaned_lower:
            mapping[col] = "valor_venda"
        elif "unidade" in cleaned_lower and "medida" in cleaned_lower:
            mapping[col] = "unidade_medida"
    return mapping


def parse_anp_csv(file_path: Path) -> pl.LazyFrame:
    """Scan and normalize an ANP weekly price collection CSV file."""
    header_mapping = normalize_headers(file_path)

    lf = pl.scan_csv(
        file_path,
        separator=";",
        encoding="utf8-lossy",
        ignore_errors=True,
    )

    # Select and rename to normalized schema
    lf = lf.select([pl.col(k).alias(v) for k, v in header_mapping.items()])

    # Clean and parse types:
    # 1. Date: format dd/mm/yyyy
    # 2. Price: replace comma with dot and parse Float64
    # 3. Filter only positive prices
    lf = (
        lf.with_columns(
            pl.col("data_coleta")
            .str.strptime(pl.Date, format="%d/%m/%Y", strict=False)
            .alias("date"),
            pl.col("valor_venda")
            .str.replace(",", ".")
            .cast(pl.Float64, strict=False)
            .alias("price"),
            pl.col("uf").str.strip_chars().str.to_uppercase(),
            pl.col("municipio").str.strip_chars().str.to_uppercase(),
            pl.col("produto").str.strip_chars().str.to_uppercase(),
        )
        .filter(
            pl.col("date").is_not_null()
            & pl.col("price").is_not_null()
            & (pl.col("price") > 0)
        )
        .with_columns(
            pl.col("date").dt.iso_year().alias("iso_year"),
            pl.col("date").dt.week().alias("iso_week"),
        )
        .with_columns(
            pl.concat_str(
                [
                    pl.col("iso_year").cast(pl.String),
                    pl.lit("-W"),
                    pl.col("iso_week").cast(pl.String).str.zfill(2),
                ]
            ).alias("week")
        )
    )
    return lf


def aggregate_anp_series(
    anp_files: list[Path],
    config: PipelineConfig,
) -> dict[str, list[PricePoint]]:
    """Aggregate weekly fuel prices across all ANP raw files.

    Returns dict mapping product identifier ('diesel_s10', 'gnv') to sorted list of PricePoints.
    """
    if not anp_files:
        return {"diesel_s10": [], "gnv": []}

    lazy_frames = [parse_anp_csv(f) for f in anp_files]
    df_all = pl.concat(lazy_frames).collect()

    product_map = {
        "DIESEL S10": "diesel_s10",
        "GNV": "gnv",
    }

    results: dict[str, list[PricePoint]] = {}

    for anp_prod_name, prod_key in product_map.items():
        df_prod = df_all.filter(pl.col("produto") == anp_prod_name)
        if df_prod.is_empty():
            results[prod_key] = []
            continue

        # Get all distinct weeks chronologically
        weeks_df = (
            df_prod.group_by("week")
            .agg(pl.col("date").min().alias("start_date"))
            .sort("week")
        )

        price_points: list[PricePoint] = []

        for row in weeks_df.iter_rows(named=True):
            week_str = row["week"]
            start_date_val = str(row["start_date"])

            df_week = df_prod.filter(pl.col("week") == week_str)

            # Check state-level samples
            df_state = df_week.filter(pl.col("uf") == config.reference_uf)
            state_muni_count = df_state.select(pl.col("municipio").n_unique()).item()

            use_fallback = state_muni_count < config.min_municipalities_per_week
            active_df = df_week if use_fallback else df_state

            # Hierarchical aggregation:
            # 1. Municipality median
            # 2. State/National median of municipality medians
            muni_medians = active_df.group_by("municipio").agg(
                pl.col("price").median().alias("muni_median")
            )

            if muni_medians.is_empty():
                continue

            weekly_median = muni_medians.select(pl.col("muni_median").median()).item()
            total_samples = active_df.height

            price_points.append(
                PricePoint(
                    week=week_str,
                    date=start_date_val,
                    price_nominal=round(float(weekly_median), 3),
                    price_mj=None,  # Will be enriched with LHV
                    is_fallback=use_fallback,
                    sample_size=total_samples,
                )
            )

        results[prod_key] = price_points

    return results


def parse_brent_csv(file_path: Path) -> list[PricePoint]:
    """Parse EIA Europe Brent spot weekly price CSV series."""
    if not file_path.exists():
        return []

    df = (
        pl.read_csv(file_path, ignore_errors=True)
        .with_columns(
            pl.col("Date")
            .str.strptime(pl.Date, format="%Y-%m-%d", strict=False)
            .alias("date"),
            pl.col("Price").cast(pl.Float64, strict=False).alias("price"),
        )
        .filter(
            pl.col("date").is_not_null()
            & pl.col("price").is_not_null()
            & (pl.col("price") > 0)
        )
        .with_columns(
            pl.col("date").dt.iso_year().alias("iso_year"),
            pl.col("date").dt.week().alias("iso_week"),
        )
        .with_columns(
            pl.concat_str(
                [
                    pl.col("iso_year").cast(pl.String),
                    pl.lit("-W"),
                    pl.col("iso_week").cast(pl.String).str.zfill(2),
                ]
            ).alias("week")
        )
        .sort("week")
    )

    points: list[PricePoint] = []
    for row in df.iter_rows(named=True):
        points.append(
            PricePoint(
                week=row["week"],
                date=str(row["date"]),
                price_nominal=round(float(row["price"]), 2),
                price_mj=None,
                is_fallback=False,
                sample_size=1,
            )
        )
    return points


def parse_aneel_csv(
    file_path: Path,
    config: PipelineConfig,
) -> tuple[float, str, str]:
    """Parse ANEEL distribution tariff CSV to extract current B3 commercial energy price with taxes.

    Returns:
        (price_kwh_with_tax, reh_resolution, effective_date)
    """
    if not file_path.exists():
        raise FileNotFoundError(f"ANEEL data file not found at: {file_path}")

    # Scan ANEEL dataset with utf8-lossy
    lf = pl.scan_csv(
        file_path,
        separator=";",
        encoding="utf8-lossy",
        ignore_errors=True,
    )

    # Filter for distributor, application tariff, B3 subgroup, conventional modality in MWh
    df = (
        lf.filter(
            (pl.col("SigAgente").str.strip_chars() == config.aneel_distributor)
            & (pl.col("DscBaseTarifaria").str.strip_chars() == "Tarifa de Aplicação")
            & (pl.col("DscSubGrupo").str.strip_chars() == "B3")
            & (pl.col("DscModalidadeTarifaria").str.strip_chars() == "Convencional")
            & (pl.col("DscUnidadeTerciaria").str.strip_chars() == "MWh")
            & (pl.col("DscDetalhe").str.strip_chars() == "Não se aplica")
        )
        .select(
            [
                "DscREH",
                "DatInicioVigencia",
                "DatFimVigencia",
                "VlrTUSD",
                "VlrTE",
            ]
        )
        .sort("DatInicioVigencia", descending=True)
        .head(1)
        .collect()
    )

    if df.is_empty():
        raise ValueError(
            f"No valid B3 commercial tariff found for distributor '{config.aneel_distributor}' in {file_path}"
        )

    row = df.row(0, named=True)
    vlr_tusd = float(str(row["VlrTUSD"]).replace(",", "."))
    vlr_te = float(str(row["VlrTE"]).replace(",", "."))
    reh = str(row["DscREH"]).strip()
    vigencia = str(row["DatInicioVigencia"]).strip()

    # Base homologated tariff per kWh: (TUSD + TE) / 1000
    base_kwh = (vlr_tusd + vlr_te) / 1000.0

    # Apply effective tax gross-up rate: Base / (1 - tax_rate)
    # in SC: ICMS 17% + PIS/COFINS ~9.25% with gross-up ~ 24.5% total incidence
    effective_kwh = base_kwh / (1.0 - config.electricity_effective_tax_rate)
    price_kwh_final = round(effective_kwh, 2)

    return price_kwh_final, reh, vigencia


def build_prices_history(
    anp_files: list[Path],
    brent_file: Path | None,
    parameters: SimulationParameters,
    config: PipelineConfig,
) -> PricesHistory:
    """Build complete weekly PricesHistory dataset converted to R$/MJ where applicable."""
    anp_series = aggregate_anp_series(anp_files, config)

    # Conversion factor from parameters.json
    # Diesel LHV: ~35.8 MJ/L => R$/MJ = (R$/L) / 35.8
    diesel_lhv = parameters.vehicles["diesel"].energy_density.value
    gnv_lhv = parameters.vehicles["gnv"].energy_density.value

    # Enrich ANP series with price_mj
    diesel_points = []
    for pt in anp_series.get("diesel_s10", []):
        pt_mj = round(pt.price_nominal / diesel_lhv, 4) if diesel_lhv > 0 else None
        diesel_points.append(
            PricePoint(
                week=pt.week,
                date=pt.date,
                price_nominal=pt.price_nominal,
                price_mj=pt_mj,
                is_fallback=pt.is_fallback,
                sample_size=pt.sample_size,
            )
        )

    gnv_points = []
    for pt in anp_series.get("gnv", []):
        pt_mj = round(pt.price_nominal / gnv_lhv, 4) if gnv_lhv > 0 else None
        gnv_points.append(
            PricePoint(
                week=pt.week,
                date=pt.date,
                price_nominal=pt.price_nominal,
                price_mj=pt_mj,
                is_fallback=pt.is_fallback,
                sample_size=pt.sample_size,
            )
        )

    brent_points = []
    if brent_file and brent_file.exists():
        brent_points = parse_brent_csv(brent_file)

    fuels = {
        "diesel_s10": FuelSeries(
            source_id=config.anp_source_id,
            unit_nominal="R$/L",
            unit_energy="R$/MJ",
            series=diesel_points,
        ),
        "gnv": FuelSeries(
            source_id=config.anp_source_id,
            unit_nominal="R$/m³",
            unit_energy="R$/MJ",
            series=gnv_points,
        ),
        "brent": FuelSeries(
            source_id=config.brent_source_id,
            unit_nominal="US$/bbl",
            unit_energy=None,
            series=brent_points,
        ),
    }

    return PricesHistory(
        generated_at=get_current_iso_timestamp(),
        reference_uf=config.reference_uf,
        fuels=fuels,
    )
