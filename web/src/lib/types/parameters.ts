export type QualityBadge = 'Primária' | 'Adaptada' | 'Ilustrativa';

export type AlternativeId = 'diesel' | 'gnv' | 'biometano' | 'eletrico';

export interface ParameterItem {
  value: number;
  unit: string;
  source_id: string;
  badge: QualityBadge;
  notes?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface GeneralParameters {
  annual_distance_km: ParameterItem;
  horizon_years: ParameterItem;
  discount_rate: ParameterItem;
  biodiesel_blend: ParameterItem;
  diesel_fossil_carbon_intensity: ParameterItem;
  biodiesel_carbon_intensity: ParameterItem;
  arla_price: ParameterItem;
}

export interface VehicleParameters {
  label: string;
  energy_price: ParameterItem;
  consumption: ParameterItem;
  energy_density: ParameterItem;
  carbon_intensity: ParameterItem;
  vehicle_purchase_price: ParameterItem;
  maintenance_cost_per_km: ParameterItem;
  residual_value_ratio: ParameterItem;
  charging_efficiency?: ParameterItem;
  arla_consumption_ratio?: ParameterItem;
}

export interface SimulationParameters {
  $schema?: string;
  schema_version: number;
  generated_at: string;
  general: GeneralParameters;
  vehicles: Record<AlternativeId, VehicleParameters>;
}
