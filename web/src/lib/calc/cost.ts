export interface CostResult {
  /** Effective fuel/grid consumption efficiency (km/unit) */
  effectiveConsumption: number;
  /** Energy or fuel cost per kilometer (BRL/km = P / C_effective) */
  energyCostPerKm: number;
  /** DEF/ARLA 32 cost per kilometer (BRL/km, zero for non-diesel) */
  arlaCostPerKm: number;
  /** Maintenance and tire wear cost per kilometer (BRL/km) */
  maintenanceCostPerKm: number;
  /** Total undiscounted operational cost per kilometer (BRL/km) */
  operationalCostPerKm: number;
  /** Annual operational expenditure (BRL/year = operationalCostPerKm × D) */
  annualOperationalCost: number;
}

export interface CalculateCostParams {
  /** Energy price per unit of consumption (BRL/L, BRL/m³, or BRL/kWh) */
  energyPrice: number;
  /** Fuel economy or vehicle efficiency (km/L, km/m³, or km/kWh) */
  consumption: number;
  /** Maintenance and tire cost per kilometer (BRL/km) */
  maintenanceCostPerKm: number;
  /** Average annual driving distance (km/year) */
  annualDistanceKm: number;
  /** Battery charging efficiency factor (decimal fraction, electric only) */
  chargingEfficiency?: number;
  /** DEF/ARLA 32 price per liter (BRL/L, diesel only) */
  arlaPrice?: number;
  /** DEF/ARLA 32 consumption ratio per liter of diesel (L/L, diesel only) */
  arlaConsumptionRatio?: number;
  /** Powertrain identifier flag for diesel-specific calculation */
  isDiesel?: boolean;
}

/**
 * Calculates unitary and annual costs per kilometer according to methodology §4.2.
 */
export function calculateOperationalCost(params: CalculateCostParams): CostResult {
  const {
    energyPrice,
    consumption,
    maintenanceCostPerKm,
    annualDistanceKm,
    chargingEfficiency,
    arlaPrice,
    arlaConsumptionRatio,
    isDiesel = false,
  } = params;

  if (consumption <= 0) {
    throw new Error(`Consumption efficiency must be positive (received: ${consumption})`);
  }

  // Electric powertrain grid consumption adjustment: C_grid = C_battery × η
  let effectiveConsumption = consumption;
  if (chargingEfficiency !== undefined && chargingEfficiency !== null) {
    if (chargingEfficiency <= 0) {
      throw new Error(
        `Charging efficiency must be positive (received: ${chargingEfficiency})`
      );
    }
    effectiveConsumption = consumption * chargingEfficiency;
  }

  const energyCostPerKm = energyPrice / effectiveConsumption;

  // DEF/ARLA 32 cost: cost_arla/km = a × P_arla / C_diesel (diesel only)
  let arlaCostPerKm = 0;
  if (isDiesel && arlaPrice !== undefined && arlaConsumptionRatio !== undefined) {
    arlaCostPerKm = (arlaConsumptionRatio * arlaPrice) / consumption;
  }

  const operationalCostPerKm = energyCostPerKm + arlaCostPerKm + maintenanceCostPerKm;
  const annualOperationalCost = operationalCostPerKm * annualDistanceKm;

  return {
    effectiveConsumption,
    energyCostPerKm,
    arlaCostPerKm,
    maintenanceCostPerKm,
    operationalCostPerKm,
    annualOperationalCost,
  };
}
