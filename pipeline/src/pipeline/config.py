"""Pipeline configuration parameters and defaults."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PipelineConfig:
    """Configuration for data aggregation and price baseline estimation."""

    # Reference state for regional fuel pricing
    reference_uf: str = "SC"

    # National fallback identifier when state data is insufficient
    fallback_uf: str = "BR"

    # Window of ISO weeks to compute the rolling baseline median
    baseline_window_weeks: int = 12

    # Minimum unique municipalities required in a week before triggering national fallback
    min_municipalities_per_week: int = 3

    # Target products from ANP LPC surveys
    anp_products: tuple[str, ...] = ("DIESEL S10", "GNV")

    # Source IDs according to data/sources.json
    anp_source_id: str = "P01"
    brent_source_id: str = "P02"
    aneel_source_id: str = "P06"
    biomethane_source_id: str = "P05"

    # Main electricity distributor in reference state SC
    aneel_distributor: str = "CELESC"

    # Total effective tax rate on electricity in SC (ICMS 17% + PIS/COFINS ~9.25% grossed-up ~24.5%)
    electricity_effective_tax_rate: float = 0.245


DEFAULT_CONFIG = PipelineConfig()


def get_repo_root() -> Path:
    """Return repository root path relative to this file."""
    return Path(__file__).resolve().parents[3]
