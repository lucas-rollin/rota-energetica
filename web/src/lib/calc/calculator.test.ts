import { describe, it, expect } from 'vitest';
import defaultParametersJson from '../../../../data/parameters.json';
import type { SimulationParameters } from '../types/parameters';
import {
  calculateAnnuityDiscountFactor,
  calculateDieselBBlendIntensity,
  calculateOperationalCost,
  calculateTco,
  simulate,
} from './index';

const defaultParams = defaultParametersJson as unknown as SimulationParameters;

describe('Calculator Engine Unit Tests', () => {
  describe('cost.ts', () => {
    it('calculates operational cost for diesel including ARLA 32 / DEF', () => {
      const res = calculateOperationalCost({
        energyPrice: 6.11,
        consumption: 2.5,
        maintenanceCostPerKm: 0.85,
        annualDistanceKm: 120000,
        arlaPrice: 3.5,
        arlaConsumptionRatio: 0.05,
        isDiesel: true,
      });

      // C_energy = 6.11 / 2.5 = 2.444
      expect(res.energyCostPerKm).toBeCloseTo(2.444, 4);
      // C_arla = (0.05 * 3.5) / 2.5 = 0.175 / 2.5 = 0.070
      expect(res.arlaCostPerKm).toBeCloseTo(0.07, 4);
      expect(res.maintenanceCostPerKm).toBe(0.85);
      // C_operational = 2.444 + 0.07 + 0.85 = 3.364
      expect(res.operationalCostPerKm).toBeCloseTo(3.364, 4);
      // Annual cost = 3.364 * 120000 = 403680
      expect(res.annualOperationalCost).toBeCloseTo(403680, 1);
    });

    it('calculates operational cost for electric applying charging efficiency', () => {
      const res = calculateOperationalCost({
        energyPrice: 0.82,
        consumption: 0.8,
        maintenanceCostPerKm: 0.5,
        annualDistanceKm: 120000,
        chargingEfficiency: 0.9,
      });

      // C_grid = 0.8 * 0.9 = 0.72 km/kWh
      expect(res.effectiveConsumption).toBeCloseTo(0.72, 4);
      // C_energy = 0.82 / 0.72 = 1.138888...
      expect(res.energyCostPerKm).toBeCloseTo(1.1389, 4);
      expect(res.arlaCostPerKm).toBe(0);
      expect(res.operationalCostPerKm).toBeCloseTo(1.138888 + 0.5, 4);
    });

    it('throws on non-positive consumption or efficiency', () => {
      expect(() =>
        calculateOperationalCost({
          energyPrice: 5,
          consumption: 0,
          maintenanceCostPerKm: 0.5,
          annualDistanceKm: 100000,
        })
      ).toThrow(/Consumption efficiency must be positive/);

      expect(() =>
        calculateOperationalCost({
          energyPrice: 5,
          consumption: 2,
          maintenanceCostPerKm: 0.5,
          annualDistanceKm: 100000,
          chargingEfficiency: -0.1,
        })
      ).toThrow(/Charging efficiency must be positive/);
    });
  });

  describe('tco.ts', () => {
    it('computes annuity discount factor with r > 0 and handles r = 0 cleanly', () => {
      // r = 0.1, h = 5 => (1 - 1.1^-5) / 0.1 = 3.7907867...
      const pvifa = calculateAnnuityDiscountFactor(0.1, 5);
      expect(pvifa).toBeCloseTo(3.79079, 4);

      // Edge case: r = 0 => pvifa = h
      const pvifaZero = calculateAnnuityDiscountFactor(0, 5);
      expect(pvifaZero).toBe(5);
    });

    it('satisfies TCO decomposition invariant and levelized km identity', () => {
      const res = calculateTco({
        vehiclePurchasePrice: 850000,
        residualValueRatio: 0.5,
        annualDistanceKm: 120000,
        horizonYears: 5,
        discountRate: 0.1,
        energyCostPerKm: 2.444,
        arlaCostPerKm: 0.07,
        maintenanceCostPerKm: 0.85,
      });

      const b = res.tcoBreakdown;
      // Invariant 1: netInvestment = V0 - pvResidual
      expect(b.netInvestment).toBeCloseTo(b.vehiclePurchasePrice - b.pvResidual, 6);
      // Invariant 2: pvOperational = pvEnergy + pvArla + pvMaintenance
      expect(b.pvOperational).toBeCloseTo(b.pvEnergy + b.pvArla + b.pvMaintenance, 6);
      // Invariant 3: TCO = netInvestment + pvOperational = V0 + pvOperational - pvResidual
      expect(res.tco).toBeCloseTo(b.netInvestment + b.pvOperational, 6);
      expect(res.tco).toBeCloseTo(
        b.vehiclePurchasePrice + b.pvOperational - b.pvResidual,
        6
      );
      // Invariant 4: levelizedCostPerKm = TCO / levelizedKm
      expect(res.levelizedCostPerKm).toBeCloseTo(res.tco / res.levelizedKm, 6);
    });
  });

  describe('emissions.ts', () => {
    it('calculates weighted diesel blend intensity for B15', () => {
      // (1 - 0.15) * 84 + 0.15 * 27 = 71.4 + 4.05 = 75.45
      const blend = calculateDieselBBlendIntensity(0.15, 84, 27);
      expect(blend).toBeCloseTo(75.45, 4);
    });
  });

  describe('simulator.ts - full simulation with defaults & edge cases', () => {
    it('runs simulation with real parameters.json defaults cleanly', () => {
      const results = simulate(defaultParams);

      expect(Object.keys(results)).toEqual(['diesel', 'gnv', 'biometano', 'eletrico']);

      const diesel = results.diesel;
      const gnv = results.gnv;
      const biometano = results.biometano;
      const eletrico = results.eletrico;

      // Base deltas for diesel must be 0
      expect(diesel.deltas?.operationalCostPerKm.diff).toBe(0);
      expect(diesel.deltas?.operationalCostPerKm.pct).toBe(0);
      expect(diesel.deltas?.tco.diff).toBe(0);

      // Operational cost ordering in baseline: Eletrico < GNV < Biometano < Diesel
      expect(eletrico.operationalCostPerKm).toBeLessThan(diesel.operationalCostPerKm);
      expect(gnv.operationalCostPerKm).toBeLessThan(diesel.operationalCostPerKm);

      // Emissions ordering: Biometano & Eletrico significantly lower than Diesel B
      expect(biometano.emissionsGPerKm).toBeLessThan(diesel.emissionsGPerKm);
      expect(eletrico.emissionsGPerKm).toBeLessThan(diesel.emissionsGPerKm);
    });

    it('invariants: higher energy price strictly increases TCO', () => {
      const baseResults = simulate(defaultParams);

      const modifiedParams: SimulationParameters = JSON.parse(
        JSON.stringify(defaultParams)
      );
      modifiedParams.vehicles.diesel.energy_price.value += 0.5;

      const modifiedResults = simulate(modifiedParams);
      expect(modifiedResults.diesel.tco).toBeGreaterThan(baseResults.diesel.tco);
      expect(modifiedResults.diesel.operationalCostPerKm).toBeGreaterThan(
        baseResults.diesel.operationalCostPerKm
      );
    });

    it('invariants: TCO with r = 0 equals simple sum of cashflows', () => {
      // Custom check with calculateTco directly for r=0
      const resZero = calculateTco({
        vehiclePurchasePrice: 850000,
        residualValueRatio: 0.5,
        annualDistanceKm: 120000,
        horizonYears: 5,
        discountRate: 0,
        energyCostPerKm: 2.444,
        arlaCostPerKm: 0.07,
        maintenanceCostPerKm: 0.85,
      });

      const simpleSum = 850000 + 5 * (120000 * (2.444 + 0.07 + 0.85)) - 0.5 * 850000;
      expect(resZero.tco).toBeCloseTo(simpleSum, 4);
      expect(resZero.levelizedKm).toBe(5 * 120000);
    });

    it('rejects parameters outside min/max bounds', () => {
      const invalidParams: SimulationParameters = JSON.parse(
        JSON.stringify(defaultParams)
      );
      invalidParams.general.discount_rate.value = 0.99; // max is 0.20

      expect(() => simulate(invalidParams)).toThrow(/is above maximum allowed bound/);
    });
  });
});
