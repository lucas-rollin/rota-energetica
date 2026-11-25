import type { QualityBadge } from './parameters';

export interface RefuelingPoints {
  diesel: string;
  biomethane_cng: string;
  electric_hpc: string;
}

export interface PowertrainEvaluation {
  feasibility_label: string;
  stops_description: string;
  refuel_time_minutes: number;
  payload_penalty_kg: number;
  emission_reduction_percent: number;
  recommendation: string;
}

export interface FreightCorridor {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distance_km: number;
  cargo_profile: string;
  typical_pbtc: string;
  highways?: string[];
  route_waypoints?: [number, number][];
  refueling_points: RefuelingPoints;
  powertrain_evaluations: Record<string, PowertrainEvaluation>;
  source_ids: string[];
}

export interface CorridorsCatalog {
  $schema?: string;
  schema_version: number;
  generated_at: string;
  corridors: FreightCorridor[];
}

export type StationTechnology = 'biomethane_cng' | 'electric_hpc';
export type StationStatus = 'Operacional' | 'Em Expansão' | 'Planejado';

export interface FuelStation {
  id: string;
  name: string;
  technology: StationTechnology;
  corridor_ids: string[];
  highway: string;
  km_marker?: number | null;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity_spec: string;
  power_kw?: number | null;
  high_flow_truck_ready: boolean;
  operator_network?: string | null;
  status: StationStatus;
  badge: QualityBadge;
  source_id: string;
}

export interface CorridorFuelStationsCatalog {
  $schema?: string;
  schema_version: number;
  generated_at: string;
  stations: FuelStation[];
}

export interface LegalLimitsWhtc {
  nox_g_kwh: number;
  pm_g_kwh: number;
  co_g_kwh: number;
  ch4_slip_g_kwh: number;
}

export interface PowertrainPollutants {
  label: string;
  fossil_co2_g_km: number;
  methane_ch4_g_km: number;
  nox_g_kwh: number;
  nox_g_km: number;
  pm25_g_kwh: number;
  pm25_g_km: number;
  noise_db: number;
  urban_impact: string;
  nox_reduction_percent: number;
  pm_reduction_percent: number;
}

export interface LocalPollutantsCatalog {
  $schema?: string;
  schema_version: number;
  generated_at: string;
  reference_standard: string;
  source_id: string;
  legal_limits_whtc: LegalLimitsWhtc;
  powertrains: Record<string, PowertrainPollutants>;
}

export interface WtwEmissionsBenchmark {
  diesel_baseline: number;
  biomethane_vinasse: number;
  bev_grid: number;
}

export interface EnergyCostBenchmark {
  biomethane: number;
  offpeak_electricity: number;
  diesel_s10: number;
  hpc_electricity?: number | null;
  commercial_electricity?: number | null;
}

export interface RegionBenchmark {
  name: string;
  code: string;
  currency: string;
  flag: string;
  renewable_grid_share_percent: number;
  grid_carbon_intensity_g_kwh: number;
  diesel_price_usd_per_liter: number;
  electricity_price_usd_per_kwh: number;
  capex_subsidy_max_usd: number;
  battery_weight_allowance_kg: number;
  dominant_pathway: string;
  wtw_emissions_g_co2eq_tkm: WtwEmissionsBenchmark;
  energy_cost_levelized_mwh_eq: EnergyCostBenchmark;
  regulatory_mechanism: string;
  capex_subsidy_status: string;
  battery_weight_regulation: string;
}

export interface GlobalBenchmarksCatalog {
  $schema?: string;
  schema_version: number;
  generated_at: string;
  source_ids: string[];
  regions: Record<string, RegionBenchmark>;
}
