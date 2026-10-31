"""Calculation and updates of default fuel prices from historical observations."""

from __future__ import annotations

import statistics
from pathlib import Path

from pipeline.config import PipelineConfig
from pipeline.models import (
    DefaultPriceItem,
    DefaultPricesCatalog,
    PricesHistory,
    SimulationParameters,
    get_current_iso_timestamp,
)


def compute_default_prices(
    history: PricesHistory,
    config: PipelineConfig,
    aneel_data: tuple[float, str, str] | None = None,
    biomethane_price: float = 4.60,
) -> DefaultPricesCatalog:
    """Calculate rolling median of the last N weeks for fuels, plus ANEEL and biomethane defaults."""
    defaults: dict[str, DefaultPriceItem] = {}

    for prod_key, fuel_key in [("diesel_s10", "diesel"), ("gnv", "gnv")]:
        fuel_series = history.fuels.get(prod_key)
        if not fuel_series or not fuel_series.series:
            continue

        # Take last N weeks
        recent_points = fuel_series.series[-config.baseline_window_weeks :]
        prices = [pt.price_nominal for pt in recent_points]

        median_val = round(float(statistics.median(prices)), 2)
        any_fallback = any(pt.is_fallback for pt in recent_points)
        first_week = recent_points[0].week
        last_week = recent_points[-1].week

        notes = (
            f"Mediana das últimas {len(recent_points)} semanas da pesquisa ANP "
            f"({first_week} a {last_week}) para {config.reference_uf}"
        )
        if any_fallback:
            notes += " (com fallback nacional em semanas de baixa amostragem)"

        defaults[fuel_key] = DefaultPriceItem(
            value=median_val,
            unit=fuel_series.unit_nominal,
            source_id=config.anp_source_id,
            badge="Adaptada",
            notes=notes,
            weeks_window=len(recent_points),
            reference_uf=config.reference_uf,
            is_fallback=any_fallback,
        )

    # Biomethane: illustrative reference with no historical series
    defaults["biometano"] = DefaultPriceItem(
        value=biomethane_price,
        unit="R$/m³",
        source_id=config.biomethane_source_id,
        badge="Ilustrativa",
        notes="Estudo de mercado Copersucar / AutoData (sem série oficial em bomba)",
        weeks_window=None,
        reference_uf=config.reference_uf,
        is_fallback=False,
    )

    # Electricity: ANEEL B3 commercial tariff + taxes
    if aneel_data:
        price_kwh, reh, vigencia = aneel_data
        tax_pct = int(round(config.electricity_effective_tax_rate * 100))
        defaults["eletrico"] = DefaultPriceItem(
            value=price_kwh,
            unit="R$/kWh",
            source_id=config.aneel_source_id,
            badge="Adaptada",
            notes=(
                f"Tarifa homologada ANEEL B3 Comercial ({config.aneel_distributor}, {reh}, "
                f"vigência {vigencia}) com incidência tributária estimada ({tax_pct}%)"
            ),
            weeks_window=None,
            reference_uf=config.reference_uf,
            is_fallback=False,
        )

    return DefaultPricesCatalog(
        generated_at=get_current_iso_timestamp(),
        defaults=defaults,
    )


def apply_default_prices_to_parameters(
    parameters_path: Path,
    defaults_catalog: DefaultPricesCatalog,
) -> tuple[SimulationParameters, list[str]]:
    """Update data/parameters.json with calculated default prices and return diff summary."""
    params = SimulationParameters.load(parameters_path)
    diffs: list[str] = []

    for fuel_key, default_item in defaults_catalog.defaults.items():
        if fuel_key in params.vehicles:
            old_item = params.vehicles[fuel_key].energy_price
            old_val = old_item.value
            old_source = old_item.source_id
            old_badge = old_item.badge

            # Update fields
            old_item.value = default_item.value
            old_item.source_id = default_item.source_id
            old_item.badge = default_item.badge
            old_item.notes = default_item.notes

            diffs.append(
                f"Updated '{fuel_key}' energy_price: "
                f"value {old_val} -> {default_item.value} {default_item.unit}, "
                f"source {old_source} -> {default_item.source_id}, "
                f"badge '{old_badge}' -> '{default_item.badge}'"
            )

    params.generated_at = get_current_iso_timestamp()[:10]
    return params, diffs
