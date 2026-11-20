import { describe, expect, it } from 'vitest';
import type { FreightCorridor, FuelStation } from '../types/catalogs';
import {
  buildCorridorCoverageSegments,
  computeCorridorCoverageStats,
  createGeodesicCircleCoords,
  getCorridorViewport,
  getEffectiveRadiusKm,
  haversineDistanceKm,
  projectWebMercator,
  unprojectWebMercator,
} from './geo';

const MOCK_CORRIDOR: FreightCorridor = {
  id: 'sp-rio',
  name: 'Via Dutra',
  origin: 'São Paulo (SP)',
  destination: 'Rio de Janeiro (RJ)',
  distance_km: 435,
  cargo_profile: 'Geral',
  typical_pbtc: '45t',
  route_waypoints: [
    [-46.633, -23.55],
    [-43.173, -22.907],
  ],
  refueling_points: {
    diesel: '60+',
    biomethane_cng: '10+',
    electric_hpc: '5+',
  },
  powertrain_evaluations: {},
  source_ids: ['I12'],
};

const MOCK_STATION_SP: FuelStation = {
  id: 'st-sp',
  name: 'Hub SP',
  technology: 'biomethane_cng',
  corridor_ids: ['sp-rio'],
  highway: 'BR-116',
  city: 'São Paulo',
  state: 'SP',
  latitude: -23.55,
  longitude: -46.633,
  capacity_spec: 'GNC Alta Vazão',
  high_flow_truck_ready: true,
  status: 'Operacional',
  badge: 'Adaptada',
  source_id: 'I07',
};

describe('geo utilities', () => {
  it('computes realistic Haversine distance between São Paulo and Rio de Janeiro', () => {
    const dist = haversineDistanceKm(-23.55, -46.633, -22.907, -43.173);
    expect(dist).toBeGreaterThan(350);
    expect(dist).toBeLessThan(370);
  });

  it('computes effective radius for full vs half mode', () => {
    expect(getEffectiveRadiusKm(900, 'full')).toBe(900);
    expect(getEffectiveRadiusKm(900, 'half')).toBe(450);
  });

  it('builds a closed geodesic ring matching the requested radius', () => {
    const ring = createGeodesicCircleCoords(-46.633, -23.55, 250, 24);
    expect(ring).toHaveLength(25);
    expect(ring[0][0]).toBeCloseTo(ring[ring.length - 1][0], 5);
    expect(ring[0][1]).toBeCloseTo(ring[ring.length - 1][1], 5);

    const northDist = haversineDistanceKm(-23.55, -46.633, ring[0][1], ring[0][0]);
    expect(northDist).toBeCloseTo(250, 0);
  });

  it('detects operational desert when station coverage does not reach end of corridor', () => {
    const lowRadiusStats = computeCorridorCoverageStats(
      MOCK_CORRIDOR,
      [MOCK_STATION_SP],
      120
    );
    expect(lowRadiusStats.hasOperationalDesert).toBe(true);
    expect(lowRadiusStats.coveredPercent).toBeLessThan(50);
    expect(lowRadiusStats.maxUncoveredSpanKm).toBeGreaterThan(200);

    const highRadiusStats = computeCorridorCoverageStats(
      MOCK_CORRIDOR,
      [MOCK_STATION_SP],
      400
    );
    expect(highRadiusStats.hasOperationalDesert).toBe(false);
    expect(highRadiusStats.coveredPercent).toBeCloseTo(100, 1);
  });

  it('returns zoomed viewport for corridor and Brazil default for null', () => {
    const br = getCorridorViewport(null);
    expect(br.zoom).toBeLessThan(1.5);

    const dutra = getCorridorViewport(MOCK_CORRIDOR);
    expect(dutra.zoom).toBeGreaterThan(3);
    expect(dutra.center[0]).toBeCloseTo(-44.903, 2);
  });

  it('segments corridor polyline into covered and uncovered stretches', () => {
    const segs = buildCorridorCoverageSegments(MOCK_CORRIDOR, [MOCK_STATION_SP], 150);
    expect(segs.length).toBeGreaterThanOrEqual(2);
    expect(segs[0].covered).toBe(true);
    expect(segs[segs.length - 1].covered).toBe(false);
  });

  it('projects Web Mercator roundtrip and preserves 1:1 circular aspect ratio', () => {
    const [x, y] = projectWebMercator([-46.633, -23.55]);
    const [lonBack, latBack] = unprojectWebMercator([x, y]);
    expect(lonBack).toBeCloseTo(-46.633, 5);
    expect(latBack).toBeCloseTo(-23.55, 5);

    // Geodesic circle in São Paulo (-23.55°) should have equal width and height in Mercator space
    const ring = createGeodesicCircleCoords(-46.633, -23.55, 250, 32);
    const projected = ring.map(projectWebMercator);
    const xs = projected.map((p) => p[0]);
    const ys = projected.map((p) => p[1]);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    expect(width / height).toBeCloseTo(1.0, 2);
  });
});
