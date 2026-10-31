import { describe, it, expect } from 'vitest';
import type { ScenarioResult } from './index';

describe('Type contracts', () => {
  it('validates scenario result contract structure', () => {
    const mockResult: ScenarioResult = {
      alternativeId: 'diesel',
      label: 'Diesel B',
      energyCostPerKm: 2.444,
      arlaCostPerKm: 0.07,
      maintenanceCostPerKm: 0.85,
      operationalCostPerKm: 3.364,
      annualOperationalCost: 403680,
      tcoBreakdown: {
        vehiclePurchasePrice: 850000,
        pvOperational: 1530268.42,
        pvEnergy: 1111623.75,
        pvArla: 31835.84,
        pvMaintenance: 386808.83,
        pvResidual: 263889.37,
        netInvestment: 586110.63,
      },
      tco: 2116379.05,
      levelizedKm: 454894.4,
      levelizedCostPerKm: 4.652,
      energyMjPerKm: 14.32,
      emissionsGPerKm: 1080.44,
      annualEmissionsTon: 129.65,
      estimatedRangeKm: null,
    };

    expect(mockResult.tcoBreakdown.vehiclePurchasePrice).toBe(850000);
    expect(mockResult.operationalCostPerKm).toBeCloseTo(
      mockResult.energyCostPerKm +
        mockResult.arlaCostPerKm +
        mockResult.maintenanceCostPerKm,
      3
    );
  });
});
