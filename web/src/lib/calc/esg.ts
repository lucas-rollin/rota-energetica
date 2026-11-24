import type { SimulationParameters } from '../types/parameters';
import { simulate } from './simulator';

export type EsgTargetFuel = 'biometano' | 'eletrico' | 'gnv';

export interface EsgFleetInput {
  parameters: SimulationParameters;
  targetFuel: EsgTargetFuel;
  fleetSize: number;
  monthlyMileage: number;
}

export interface EsgFleetResult {
  annualDistanceKm: number;
  dieselEmissionsGPerKm: number;
  altEmissionsGPerKm: number;
  annualDieselTon: number;
  annualAltTon: number;
  tonsAvoided: number;
  /** Positive = reduction vs Diesel B; negative = emission increase vs Diesel B. */
  reductionPercent: number;
  dieselLitersAvoided: number;
  /** Scope 1: Direct fossil combustion (tCO2e/year). */
  scope1Ton: number;
  /** Scope 2: Purchased grid electricity for BEVs (tCO2e/year). */
  scope2Ton: number;
  /** Scope 3: Upstream WtT emissions where separated (e.g. biomethane processing/compression, tCO2e/year). */
  scope3Ton: number;
  /** Scope 1 reduction percentage vs Diesel B (negative = increase). */
  reductionScope1Percent: number;
}

/**
 * Computes fleet-level ESG emissions, avoided CO2e, and GHG Protocol scope attribution
 * by reusing the core `simulate()` engine.
 */
export function calculateFleetEsg(input: EsgFleetInput): EsgFleetResult {
  const { parameters, targetFuel, fleetSize, monthlyMileage } = input;
  const annualDistanceKm = monthlyMileage * 12;

  const adjustedParams: SimulationParameters = {
    ...parameters,
    general: {
      ...parameters.general,
      annual_distance_km: {
        ...parameters.general.annual_distance_km,
        value: annualDistanceKm,
      },
    },
  };

  const sim = simulate(adjustedParams);
  const diesel = sim.diesel;
  const alt = sim[targetFuel];

  const annualDieselTon = diesel.annualEmissionsTon * fleetSize;
  const annualAltTon = alt.annualEmissionsTon * fleetSize;
  const tonsAvoided = Math.max(0, annualDieselTon - annualAltTon);

  const reductionPercent =
    annualDieselTon > 0 ? ((annualDieselTon - annualAltTon) / annualDieselTon) * 100 : 0;

  const dieselConsumption = parameters.vehicles.diesel.consumption.value;
  const dieselLitersAvoided =
    dieselConsumption > 0 ? (annualDistanceKm / dieselConsumption) * fleetSize : 0;

  // GHG Protocol attribution using WtW intensities from parameters.json:
  // - BEV: zero tailpipe (Scope 1 = 0), grid electricity emissions in Scope 2 (tCO2e/year).
  // - Biomethane: biogenic TtW is excluded from fossil Scope 1 per GHG Protocol;
  //   non-zero WtW footprint (processing/compression/transport) is attributed to Scope 3.
  // - GNV: parameters.json provides combined WtW intensity without a separate WtT/TtW split;
  //   total WtW emissions are reported under Scope 1 (with WtT included) and compared directly.
  let scope1Ton = 0;
  let scope2Ton = 0;
  let scope3Ton = 0;
  let reductionScope1Percent = 0;

  if (targetFuel === 'eletrico') {
    scope1Ton = 0;
    scope2Ton = annualAltTon;
    scope3Ton = 0;
    reductionScope1Percent = 100;
  } else if (targetFuel === 'biometano') {
    scope1Ton = 0;
    scope2Ton = 0;
    scope3Ton = annualAltTon;
    reductionScope1Percent = 100;
  } else {
    scope1Ton = annualAltTon;
    scope2Ton = 0;
    scope3Ton = 0;
    reductionScope1Percent = reductionPercent;
  }

  return {
    annualDistanceKm,
    dieselEmissionsGPerKm: diesel.emissionsGPerKm,
    altEmissionsGPerKm: alt.emissionsGPerKm,
    annualDieselTon,
    annualAltTon,
    tonsAvoided,
    reductionPercent,
    dieselLitersAvoided,
    scope1Ton,
    scope2Ton,
    scope3Ton,
    reductionScope1Percent,
  };
}
