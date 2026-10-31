import type { AlternativeId } from './parameters';

export interface TcoBreakdown {
  /** Initial acquisition cost of the truck tractor (V₀, BRL) */
  vehiclePurchasePrice: number;
  /** Present Value of all operational costs (energy + DEF/ARLA + maintenance) */
  pvOperational: number;
  /** Present Value of fuel or electricity expenditures */
  pvEnergy: number;
  /** Present Value of DEF/ARLA 32 expenditures */
  pvArla: number;
  /** Present Value of maintenance and tire costs */
  pvMaintenance: number;
  /** Present Value of the residual vehicle value at horizon year h */
  pvResidual: number;
  /** Discounted net investment cost (V₀ - PV residual) */
  netInvestment: number;
}

export interface MetricComparison {
  /** Absolute difference relative to Diesel B baseline (value - base) */
  diff: number;
  /** Percentage difference relative to Diesel B baseline ((value - base) / base * 100) */
  pct: number;
}

export interface ScenarioResult {
  alternativeId: AlternativeId;
  label: string;

  /** Energy/fuel cost per kilometer (BRL/km) */
  energyCostPerKm: number;
  /** DEF/ARLA 32 cost per kilometer (BRL/km, zero for non-diesel alternatives) */
  arlaCostPerKm: number;
  /** Maintenance and tire cost per kilometer (BRL/km) */
  maintenanceCostPerKm: number;
  /** Total undiscounted operational cost per kilometer (BRL/km) */
  operationalCostPerKm: number;
  /** Annual operational expenditure (BRL/year = operationalCostPerKm × D) */
  annualOperationalCost: number;

  /** Detailed breakdown of TCO components in Present Value */
  tcoBreakdown: TcoBreakdown;
  /** Discounted Total Cost of Ownership (TCO = V₀ + PV operational - PV residual) */
  tco: number;

  /** Discounted levelized kilometers over the financial horizon */
  levelizedKm: number;
  /** Levelized cost per kilometer (BRL/km = TCO / levelizedKm) */
  levelizedCostPerKm: number;

  /** Energy consumption per kilometer (MJ/km) */
  energyMjPerKm: number;
  /** Well-to-wheel greenhouse gas emissions per kilometer (gCO₂eq/km) */
  emissionsGPerKm: number;
  /** Total annual emissions (tCO₂eq/year = D × emissionsGPerKm / 1,000,000) */
  annualEmissionsTon: number;

  /** Estimated operational driving range (km, or null when not modeled) */
  estimatedRangeKm: number | null;

  /** Metric comparisons (absolute and percentage) against Diesel B baseline */
  deltas?: {
    operationalCostPerKm: MetricComparison;
    tco: MetricComparison;
    annualEmissionsTon: MetricComparison;
  };
}

export type SimulationResults = Record<AlternativeId, ScenarioResult>;
