import type { QualityBadge } from './parameters';

export interface SourceItem {
  id: string;
  name: string;
  publisher: string;
  description: string;
  url?: string | null;
  badge: QualityBadge;
  category: string;
  terms: string;
  attribution?: string | null;
  notes?: string;
  terms_url?: string;
}

export interface SourcesData {
  $schema?: string;
  schema_version: number;
  sources: SourceItem[];
}
