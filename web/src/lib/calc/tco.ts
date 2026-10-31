import type { TcoBreakdown } from '../types/scenario';

export interface CalculateTcoParams {
  /** Initial acquisition cost of the truck tractor (V₀, BRL) */
  vehiclePurchasePrice: number;
  /** Residual value ratio at horizon end (decimal fraction of V₀) */
  residualValueRatio: number;
  /** Average annual driving distance (D, km/year) */
  annualDistanceKm: number;
  /** Financial analysis horizon in years (h) */
  horizonYears: number;
  /** Annual real discount rate (r, decimal fraction) */
  discountRate: number;
  /** Energy cost per kilometer (BRL/km) */
  energyCostPerKm: number;
  /** DEF/ARLA 32 cost per kilometer (BRL/km) */
  arlaCostPerKm: number;
  /** Maintenance cost per kilometer (BRL/km) */
  maintenanceCostPerKm: number;
}

export interface TcoResult {
  tcoBreakdown: TcoBreakdown;
  tco: number;
  levelizedKm: number;
  levelizedCostPerKm: number;
}

/**
 * Calculates the Present Value Interest Factor of an Annuity (PVIFA)
 * for ordinary end-of-year discounted cash flows (t = 1..h):
 * Σ(t=1..h) 1 / (1+r)^t
 */
export function calculateAnnuityDiscountFactor(rate: number, years: number): number {
  if (years <= 0) {
    throw new Error(`Time horizon must be positive (received: ${years})`);
  }
  if (Math.abs(rate) < 1e-12) {
    return years;
  }
  // Closed-form sum of finite geometric series: (1 - (1+r)^(-h)) / r
  return (1 - Math.pow(1 + rate, -years)) / rate;
}

/**
 * Calculates Total Cost of Ownership (TCO), levelized kilometers, and PV breakdown
 * according to methodology §4.3.
 */
export function calculateTco(params: CalculateTcoParams): TcoResult {
  const {
    vehiclePurchasePrice,
    residualValueRatio,
    annualDistanceKm,
    horizonYears,
    discountRate,
    energyCostPerKm,
    arlaCostPerKm,
    maintenanceCostPerKm,
  } = params;

  if (horizonYears <= 0) {
    throw new Error(`Time horizon must be positive (received: ${horizonYears})`);
  }
  if (annualDistanceKm <= 0) {
    throw new Error(`Annual distance must be positive (received: ${annualDistanceKm})`);
  }

  const pvifa = calculateAnnuityDiscountFactor(discountRate, horizonYears);

  // Annual expenditures by category
  const annualEnergyCost = energyCostPerKm * annualDistanceKm;
  const annualArlaCost = arlaCostPerKm * annualDistanceKm;
  const annualMaintenanceCost = maintenanceCostPerKm * annualDistanceKm;
  const annualOperationalCost = annualEnergyCost + annualArlaCost + annualMaintenanceCost;

  // Present Value of operational expenditures
  const pvEnergy = annualEnergyCost * pvifa;
  const pvArla = annualArlaCost * pvifa;
  const pvMaintenance = annualMaintenanceCost * pvifa;
  const pvOperational = annualOperationalCost * pvifa;

  // Present Value of terminal residual value (t = h)
  const residualDiscountFactor =
    Math.abs(discountRate) < 1e-12 ? 1 : Math.pow(1 + discountRate, -horizonYears);
  const pvResidual = residualValueRatio * vehiclePurchasePrice * residualDiscountFactor;

  // Discounted net capital expenditure: V₀ - PV residual
  const netInvestment = vehiclePurchasePrice - pvResidual;

  // Total Cost of Ownership: V₀ + PV operational - PV residual = netInvestment + pvOperational
  const tco = vehiclePurchasePrice + pvOperational - pvResidual;

  // Discounted levelized kilometers: Σ(t=1..h) D / (1+r)^t = D × pvifa
  const levelizedKm = annualDistanceKm * pvifa;
  const levelizedCostPerKm = tco / levelizedKm;

  const tcoBreakdown: TcoBreakdown = {
    vehiclePurchasePrice,
    pvOperational,
    pvEnergy,
    pvArla,
    pvMaintenance,
    pvResidual,
    netInvestment,
  };

  return {
    tcoBreakdown,
    tco,
    levelizedKm,
    levelizedCostPerKm,
  };
}
