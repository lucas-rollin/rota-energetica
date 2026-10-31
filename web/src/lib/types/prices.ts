export interface PricePoint {
  /** ISO year and week string (e.g. '2026-W24') */
  week: string;
  /** Reference calendar date (AAAA-MM-DD) */
  date: string;
  /** Nominal price in original unit (e.g. R$/L, R$/m³, US$/bbl) */
  price_nominal: number;
  /** Converted energy price in R$/MJ using LHV, if applicable */
  price_mj?: number | null;
  /** True if state coverage was insufficient and national fallback was used */
  is_fallback: boolean;
  /** Number of sampled locations or observations in the week */
  sample_size?: number | null;
}

export interface FuelSeries {
  /** Source ID registered in sources.json (e.g. P01, P02) */
  source_id: string;
  /** Original nominal measurement unit (e.g. 'R$/L', 'R$/m³', 'US$/bbl') */
  unit_nominal: string;
  /** Energy price unit, typically 'R$/MJ' */
  unit_energy?: string | null;
  /** Chronological series of weekly aggregated price points */
  series: PricePoint[];
}

export interface PricesHistory {
  $schema?: string;
  schema_version: number;
  generated_at: string;
  reference_uf: string;
  fuels: Record<string, FuelSeries>;
}
