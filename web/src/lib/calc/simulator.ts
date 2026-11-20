import type {
  AlternativeId,
  SimulationParameters,
  VehicleParameters,
} from '../types/parameters';
import type { MetricComparison, SimulationResults } from '../types/scenario';
import { calculateOperationalCost } from './cost';
import { calculateEmissions } from './emissions';
import { calculateAnnuityDiscountFactor, calculateTco } from './tco';

export const ALTERNATIVE_IDS: AlternativeId[] = [
  'diesel',
  'gnv',
  'biometano',
  'eletrico',
];

/**
 * Validates that a numeric parameter lies within defined bounds [min, max].
 * If strict is true, throws an error if outside [min, max].
 * Otherwise, ensures the number is finite.
 */
export function validateBounds(
  name: string,
  value: number,
  min?: number,
  max?: number,
  strict = false
): void {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    throw new Error(`Parameter '${name}' must be a finite number (received: ${value})`);
  }
  if (strict) {
    if (min !== undefined && value < min) {
      throw new Error(
        `Parameter '${name}' (${value}) is below minimum allowed bound (${min})`
      );
    }
    if (max !== undefined && value > max) {
      throw new Error(
        `Parameter '${name}' (${value}) is above maximum allowed bound (${max})`
      );
    }
  }
}

/**
 * Returns mild warning messages when parameters deviate from recommended historical reference bounds [min, max].
 * Does not disrupt the simulation calculation or chart rendering.
 */
export function getParameterWarnings(params: SimulationParameters): string[] {
  const warnings: string[] = [];

  const check = (
    label: string,
    value: number,
    min?: number,
    max?: number,
    unit?: string
  ) => {
    if (min !== undefined && value < min) {
      warnings.push(
        `${label} (${value}${unit ? ` ${unit}` : ''}) está abaixo da faixa de referência histórica (mín: ${min}${unit ? ` ${unit}` : ''}).`
      );
    } else if (max !== undefined && value > max) {
      warnings.push(
        `${label} (${value}${unit ? ` ${unit}` : ''}) está acima da faixa de referência histórica (máx: ${max}${unit ? ` ${unit}` : ''}).`
      );
    }
  };

  const g = params.general;
  check(
    'Distância anual',
    g.annual_distance_km.value,
    g.annual_distance_km.min,
    g.annual_distance_km.max,
    g.annual_distance_km.unit
  );
  check(
    'Horizonte temporal',
    g.horizon_years.value,
    g.horizon_years.min,
    g.horizon_years.max,
    g.horizon_years.unit
  );
  check(
    'Taxa de desconto',
    g.discount_rate.value,
    g.discount_rate.min,
    g.discount_rate.max,
    g.discount_rate.unit
  );
  check(
    'Mandato de biodiesel',
    g.biodiesel_blend.value,
    g.biodiesel_blend.min,
    g.biodiesel_blend.max,
    g.biodiesel_blend.unit
  );
  check(
    'Preço do ARLA 32',
    g.arla_price.value,
    g.arla_price.min,
    g.arla_price.max,
    g.arla_price.unit
  );

  const vehicleLabels: Record<AlternativeId, string> = {
    diesel: 'Diesel B',
    gnv: 'GNV',
    biometano: 'Biometano',
    eletrico: 'Elétrico',
  };

  for (const alt of ALTERNATIVE_IDS) {
    const v = params.vehicles[alt];
    if (!v) continue;
    const vName = vehicleLabels[alt] || alt;
    check(
      `Preço do combustível (${vName})`,
      v.energy_price.value,
      v.energy_price.min,
      v.energy_price.max,
      v.energy_price.unit
    );
    check(
      `Consumo (${vName})`,
      v.consumption.value,
      v.consumption.min,
      v.consumption.max,
      v.consumption.unit
    );
    check(
      `Preço do caminhão (${vName})`,
      v.vehicle_purchase_price.value,
      v.vehicle_purchase_price.min,
      v.vehicle_purchase_price.max,
      v.vehicle_purchase_price.unit
    );
    check(
      `Custo de manutenção (${vName})`,
      v.maintenance_cost_per_km.value,
      v.maintenance_cost_per_km.min,
      v.maintenance_cost_per_km.max,
      v.maintenance_cost_per_km.unit
    );
    check(
      `Valor residual (${vName})`,
      v.residual_value_ratio.value,
      v.residual_value_ratio.min,
      v.residual_value_ratio.max,
      v.residual_value_ratio.unit
    );
  }

  return warnings;
}

/**
 * Validates the numerical integrity of input simulation parameters.
 */
export function validateSimulationParameters(
  params: SimulationParameters,
  strict = false
): void {
  const g = params.general;
  validateBounds(
    'annual_distance_km',
    g.annual_distance_km.value,
    g.annual_distance_km.min,
    g.annual_distance_km.max,
    strict
  );
  validateBounds(
    'horizon_years',
    g.horizon_years.value,
    g.horizon_years.min,
    g.horizon_years.max,
    strict
  );
  validateBounds(
    'discount_rate',
    g.discount_rate.value,
    g.discount_rate.min,
    g.discount_rate.max,
    strict
  );
  validateBounds(
    'biodiesel_blend',
    g.biodiesel_blend.value,
    g.biodiesel_blend.min,
    g.biodiesel_blend.max,
    strict
  );
  validateBounds(
    'diesel_fossil_carbon_intensity',
    g.diesel_fossil_carbon_intensity.value,
    g.diesel_fossil_carbon_intensity.min,
    g.diesel_fossil_carbon_intensity.max,
    strict
  );
  validateBounds(
    'biodiesel_carbon_intensity',
    g.biodiesel_carbon_intensity.value,
    g.biodiesel_carbon_intensity.min,
    g.biodiesel_carbon_intensity.max,
    strict
  );
  validateBounds(
    'arla_price',
    g.arla_price.value,
    g.arla_price.min,
    g.arla_price.max,
    strict
  );
  if (g.cbio_price) {
    validateBounds(
      'cbio_price',
      g.cbio_price.value,
      g.cbio_price.min,
      g.cbio_price.max,
      strict
    );
  }

  for (const alt of ALTERNATIVE_IDS) {
    const v = params.vehicles[alt];
    if (!v) {
      throw new Error(
        `Powertrain alternative '${alt}' not found in simulation parameters`
      );
    }
    validateBounds(
      `${alt}.energy_price`,
      v.energy_price.value,
      v.energy_price.min,
      v.energy_price.max,
      strict
    );
    validateBounds(
      `${alt}.consumption`,
      v.consumption.value,
      v.consumption.min,
      v.consumption.max,
      strict
    );
    validateBounds(
      `${alt}.energy_density`,
      v.energy_density.value,
      v.energy_density.min,
      v.energy_density.max,
      strict
    );
    validateBounds(
      `${alt}.carbon_intensity`,
      v.carbon_intensity.value,
      v.carbon_intensity.min,
      v.carbon_intensity.max,
      strict
    );
    validateBounds(
      `${alt}.vehicle_purchase_price`,
      v.vehicle_purchase_price.value,
      v.vehicle_purchase_price.min,
      v.vehicle_purchase_price.max,
      strict
    );
    validateBounds(
      `${alt}.maintenance_cost_per_km`,
      v.maintenance_cost_per_km.value,
      v.maintenance_cost_per_km.min,
      v.maintenance_cost_per_km.max,
      strict
    );
    validateBounds(
      `${alt}.residual_value_ratio`,
      v.residual_value_ratio.value,
      v.residual_value_ratio.min,
      v.residual_value_ratio.max,
      strict
    );

    if (v.charging_efficiency) {
      validateBounds(
        `${alt}.charging_efficiency`,
        v.charging_efficiency.value,
        v.charging_efficiency.min,
        v.charging_efficiency.max,
        strict
      );
    }
    if (v.arla_consumption_ratio) {
      validateBounds(
        `${alt}.arla_consumption_ratio`,
        v.arla_consumption_ratio.value,
        v.arla_consumption_ratio.min,
        v.arla_consumption_ratio.max,
        strict
      );
    }
    if (v.payload_penalty_kg) {
      validateBounds(
        `${alt}.payload_penalty_kg`,
        v.payload_penalty_kg.value,
        v.payload_penalty_kg.min,
        v.payload_penalty_kg.max,
        strict
      );
    }
  }
}

/**
 * Calculates absolute and percentage variation relative to baseline value (Diesel B).
 */
export function calculateDelta(val: number, base: number): MetricComparison {
  const diff = val - base;
  const pct = Math.abs(base) < 1e-12 ? 0 : (diff / base) * 100;
  return { diff, pct };
}

/**
 * Simulates all energy powertrain scenarios for a given set of parameters.
 */
export function simulate(params: SimulationParameters): SimulationResults {
  validateSimulationParameters(params);

  const g = params.general;
  const annualDistanceKm = g.annual_distance_km.value;
  const horizonYears = g.horizon_years.value;
  const discountRate = g.discount_rate.value;
  const biodieselBlend = g.biodiesel_blend.value;
  const dieselFossilCarbonIntensity = g.diesel_fossil_carbon_intensity.value;
  const biodieselCarbonIntensity = g.biodiesel_carbon_intensity.value;
  const arlaPrice = g.arla_price.value;

  const rawResults: Partial<SimulationResults> = {};

  for (const alt of ALTERNATIVE_IDS) {
    const v: VehicleParameters = params.vehicles[alt];
    const isDiesel = alt === 'diesel';

    // 1. Operational Cost
    const cost = calculateOperationalCost({
      energyPrice: v.energy_price.value,
      consumption: v.consumption.value,
      maintenanceCostPerKm: v.maintenance_cost_per_km.value,
      annualDistanceKm,
      chargingEfficiency: v.charging_efficiency?.value,
      arlaPrice,
      arlaConsumptionRatio: v.arla_consumption_ratio?.value,
      isDiesel,
    });

    // 2. TCO and Present Value breakdown
    const tcoResult = calculateTco({
      vehiclePurchasePrice: v.vehicle_purchase_price.value,
      residualValueRatio: v.residual_value_ratio.value,
      annualDistanceKm,
      horizonYears,
      discountRate,
      energyCostPerKm: cost.energyCostPerKm,
      arlaCostPerKm: cost.arlaCostPerKm,
      maintenanceCostPerKm: cost.maintenanceCostPerKm,
    });

    // 3. Emissions and Energy
    const emissionsResult = calculateEmissions({
      energyDensity: v.energy_density.value,
      effectiveConsumption: cost.effectiveConsumption,
      carbonIntensity: v.carbon_intensity.value,
      annualDistanceKm,
      isDiesel,
      biodieselBlend,
      dieselFossilCarbonIntensity,
      biodieselCarbonIntensity,
    });

    rawResults[alt] = {
      alternativeId: alt,
      label: v.label,
      energyCostPerKm: cost.energyCostPerKm,
      arlaCostPerKm: cost.arlaCostPerKm,
      maintenanceCostPerKm: cost.maintenanceCostPerKm,
      operationalCostPerKm: cost.operationalCostPerKm,
      annualOperationalCost: cost.annualOperationalCost,
      tcoBreakdown: tcoResult.tcoBreakdown,
      tco: tcoResult.tco,
      levelizedKm: tcoResult.levelizedKm,
      levelizedCostPerKm: tcoResult.levelizedCostPerKm,
      energyMjPerKm: emissionsResult.energyMjPerKm,
      emissionsGPerKm: emissionsResult.emissionsGPerKm,
      annualEmissionsTon: emissionsResult.annualEmissionsTon,
      estimatedRangeKm: null,
    };
  }

  // 4. Calculate comparative deltas against Diesel B baseline & CBIO monetization
  const results = rawResults as SimulationResults;
  const dieselBase = results.diesel;
  const cbioPrice = g.cbio_price?.value ?? 102.0;
  const annuityFactor = calculateAnnuityDiscountFactor(discountRate, horizonYears);

  for (const alt of ALTERNATIVE_IDS) {
    const r = results[alt];
    const v = params.vehicles[alt];
    const avoidedTons = Math.max(0, dieselBase.annualEmissionsTon - r.annualEmissionsTon);
    const annualCbioGenerated = alt === 'diesel' ? 0 : avoidedTons;
    const annualCbioRevenue = annualCbioGenerated * cbioPrice;
    const pvCbioRevenue = annualCbioRevenue * annuityFactor;
    const netTco = r.tco - pvCbioRevenue;
    const cbioCreditPerKm =
      annualDistanceKm > 0 ? annualCbioRevenue / annualDistanceKm : 0;
    const netLevelizedCostPerKm =
      r.levelizedKm > 0 ? netTco / r.levelizedKm : r.levelizedCostPerKm;

    r.annualCbioGenerated = annualCbioGenerated;
    r.annualCbioRevenue = annualCbioRevenue;
    r.cbioCreditPerKm = cbioCreditPerKm;
    r.netLevelizedCostPerKm = netLevelizedCostPerKm;
    r.netTco = netTco;
    r.payloadPenaltyKg = v.payload_penalty_kg?.value ?? 0;

    r.deltas = {
      operationalCostPerKm: calculateDelta(
        r.operationalCostPerKm,
        dieselBase.operationalCostPerKm
      ),
      tco: calculateDelta(r.tco, dieselBase.tco),
      annualEmissionsTon: calculateDelta(
        r.annualEmissionsTon,
        dieselBase.annualEmissionsTon
      ),
    };
  }

  return results;
}
