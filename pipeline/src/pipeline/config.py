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

    # Medium-voltage depot tariff model (Group A4 Verde, off-peak + contracted demand)
    # for a 400 kW heavy-duty charging hub vs B3 single-rate low-voltage fallback
    aneel_depot_subgroup: str = "A4"
    aneel_depot_modality: str = "Verde"
    depot_charger_kw: float = 400.0
    depot_monthly_kwh_reference: float = 40000.0

    # Statutory tax components ("por dentro" / grossed-up):
    # - ICMS-SC modal rate: 17.0% (Lei Estadual SC nº 10.297/1996, art. 19)
    # - Effective non-cumulative PIS/COFINS average: 5.5% (after credits under Leis 10.637/2002 & 10.833/2003;
    #   nominal 9.25% ceiling overstates effective rate for commercial consumers)
    electricity_icms_rate: float = 0.17
    electricity_pis_cofins_effective_rate: float = 0.055

    @property
    def electricity_effective_tax_rate(self) -> float:
        """Combined 'por dentro' tax incidence on electricity (ICMS + effective PIS/COFINS)."""
        return self.electricity_icms_rate + self.electricity_pis_cofins_effective_rate


DEFAULT_CONFIG = PipelineConfig()


def get_repo_root() -> Path:
    """Return repository root path relative to this file."""
    return Path(__file__).resolve().parents[3]
