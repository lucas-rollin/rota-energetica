import sourcesJson from '../../../../data/sources.json';
import type { SourceItem, SourcesData } from '../types/sources';

const data = sourcesJson as unknown as SourcesData;

export const sourcesList: SourceItem[] = data.sources;

export const sourcesMap: Map<string, SourceItem> = new Map(
  sourcesList.map((s) => [s.id, s])
);

export function getSource(id: string): SourceItem | undefined {
  return sourcesMap.get(id);
}
