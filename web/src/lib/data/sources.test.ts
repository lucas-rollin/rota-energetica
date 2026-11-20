import { describe, expect, it } from 'vitest';
import parametersJson from '../../../../data/parameters.json';
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
});
