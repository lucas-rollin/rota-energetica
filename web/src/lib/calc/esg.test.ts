import { describe, expect, it } from 'vitest';
import rawParams from '../../../../data/parameters.json';
import type { SimulationParameters } from '../types/parameters';
import { calculateFleetEsg } from './esg';

const defaultParams = rawParams as unknown as SimulationParameters;

describe('calculateFleetEsg', () => {
  it('computes Scope 2 in tCO2e/year (not kg) for 45 electric trucks', () => {
    const res = calculateFleetEsg({
      parameters: defaultParams,
      targetFuel: 'eletrico',
      fleetSize: 45,
      monthlyMileage: 10000,
    });

    expect(res.scope1Ton).toBe(0);
    expect(res.scope3Ton).toBe(0);
    // ~289 tCO2e/year for 45 BEVs at 120,000 km/yr (was ~288,750 due to 1000x unit bug)
    expect(res.scope2Ton).toBeGreaterThan(200);
    expect(res.scope2Ton).toBeLessThan(400);
    expect(res.reductionScope1Percent).toBe(100);
  });

  it('attributes biomethane WtW footprint to Scope 3 and matches ~87% WtW reduction', () => {
    const res = calculateFleetEsg({
      parameters: defaultParams,
      targetFuel: 'biometano',
      fleetSize: 45,
      monthlyMileage: 10000,
    });

    expect(res.scope1Ton).toBe(0);
    expect(res.scope2Ton).toBe(0);
    expect(res.scope3Ton).toBeCloseTo(res.annualAltTon, 6);
    expect(res.reductionPercent).toBeGreaterThan(80);
    expect(res.reductionPercent).toBeLessThan(92);
  });

  it('reports negative reduction for GNV when WtW emissions exceed Diesel B', () => {
    const res = calculateFleetEsg({
      parameters: defaultParams,
      targetFuel: 'gnv',
      fleetSize: 45,
      monthlyMileage: 10000,
    });

    expect(res.reductionPercent).toBeLessThan(0);
    expect(res.reductionScope1Percent).toBeCloseTo(res.reductionPercent, 6);
    expect(res.tonsAvoided).toBe(0);
  });
});
