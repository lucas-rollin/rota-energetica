import { describe, expect, it } from 'vitest';
import parametersJson from '../../../../data/parameters.json';
import corridorFuelStationsJson from '../../../../data/processed/corridor_fuel_stations.json';
import corridorsJson from '../../../../data/processed/corridors.json';
import globalBenchmarksJson from '../../../../data/processed/global_benchmarks.json';
import localPollutantsJson from '../../../../data/processed/local_pollutants.json';
import type {
  AlternativeId,
  ParameterItem,
  SimulationParameters,
  VehicleParameters,
} from '../types/parameters';
import { getSource, sourcesList, sourcesMap } from './sources';

describe('sources integrity', () => {
  it('loads all sources from sources.json', () => {
    expect(sourcesList.length).toBeGreaterThan(0);
    expect(sourcesMap.size).toBe(sourcesList.length);
  });

  it('contains valid fields for all sources', () => {
    for (const s of sourcesList) {
      expect(s.id).toBeDefined();
      expect(s.name).toBeDefined();
      expect(s.publisher).toBeDefined();
      expect(s.description).toBeDefined();
      if (s.url) {
        expect(s.url).toMatch(/^https?:\/\//);
      }
      expect(['Primária', 'Adaptada', 'Ilustrativa']).toContain(s.badge);
      expect(s.category).toBeDefined();
      expect(s.terms).toBeDefined();
      if (s.attribution) {
        expect(s.attribution.length).toBeGreaterThan(0);
      }
    }
  });

  it('guarantees that every source_id referenced in parameters.json exists in sources.json', () => {
    const params = parametersJson as unknown as SimulationParameters;

    // Check general parameters
    for (const [key, item] of Object.entries(params.general)) {
      const sourceId = (item as ParameterItem).source_id;
      expect(sourceId).toBeDefined();
      const source = getSource(sourceId);
      expect(
        source,
        `Source '${sourceId}' referenced in general.${key} not found in sources.json`
      ).toBeDefined();
    }

    // Check vehicle parameters
    const altKeys = Object.keys(params.vehicles) as AlternativeId[];
    for (const vehId of altKeys) {
      const veh = params.vehicles[vehId];
      const fieldKeys = Object.keys(veh) as (keyof VehicleParameters)[];
      for (const field of fieldKeys) {
        if (field === 'label') continue;
        const item = veh[field];
        if (item && typeof item === 'object' && 'source_id' in item) {
          const sourceId = item.source_id;
          expect(sourceId).toBeDefined();
          const source = getSource(sourceId);
          expect(
            source,
            `Source '${sourceId}' referenced in vehicles.${vehId}.${field} not found in sources.json`
          ).toBeDefined();
        }
      }
    }
  });

  it('guarantees that all dashboard citation IDs and processed catalogs resolve in sources.json', () => {
    const dashboardCitedIds = [
      'P01',
      'P07',
      'P09',
      'E01',
      'E02',
      'E07',
      'V01',
      'V10',
      'I01',
      'I07',
      'I09',
      'I12',
      'I14',
    ];
    for (const id of dashboardCitedIds) {
      expect(getSource(id), `Dashboard source '${id}' not found`).toBeDefined();
    }

    expect(getSource(localPollutantsJson.source_id)).toBeDefined();
    for (const id of globalBenchmarksJson.source_ids) {
      expect(getSource(id), `Benchmark source '${id}' not found`).toBeDefined();
    }
    for (const corridor of corridorsJson.corridors) {
      for (const id of corridor.source_ids) {
        expect(
          getSource(id),
          `Corridor '${corridor.id}' source '${id}' not found`
        ).toBeDefined();
      }
    }
    for (const station of corridorFuelStationsJson.stations) {
      expect(
        getSource(station.source_id),
        `Station '${station.id}' source '${station.source_id}' not found`
      ).toBeDefined();
    }
  });
});
