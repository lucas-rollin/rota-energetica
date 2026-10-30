import type { AlternativeId } from './parameters';

export interface TcoBreakdown {
  /** Preço inicial de aquisição do cavalo mecânico (V₀, R$) */
  vehiclePurchasePrice: number;
  /** Valor Presente de todos os custos operacionais (energia + ARLA + manutenção) */
  pvOperational: number;
  /** Valor Presente dos gastos com combustível ou energia */
  pvEnergy: number;
  /** Valor Presente dos gastos com ARLA 32 */
  pvArla: number;
  /** Valor Presente dos custos de manutenção e pneus */
  pvMaintenance: number;
  /** Valor Presente do valor residual descontado ao ano h (VP residual) */
  pvResidual: number;
  /** Investimento líquido descontado (V₀ - VP residual) */
  netInvestment: number;
}

export interface MetricComparison {
  /** Diferença absoluta em relação ao Diesel B (valor - base) */
  diff: number;
  /** Variação percentual relativa ao Diesel B ((valor - base) / base * 100) */
  pct: number;
}

export interface ScenarioResult {
  alternativeId: AlternativeId;
  label: string;

  /** Custo com energia/combustível por quilômetro (R$/km) */
  energyCostPerKm: number;
  /** Custo com ARLA 32 por quilômetro (R$/km, zero para alternativas não-diesel) */
  arlaCostPerKm: number;
  /** Custo com manutenção e pneus por quilômetro (R$/km) */
  maintenanceCostPerKm: number;
  /** Custo operacional total por quilômetro sem desconto (R$/km) */
  operationalCostPerKm: number;
  /** Custo operacional anual (R$/ano = operationalCostPerKm × D) */
  annualOperationalCost: number;

  /** Decomposição detalhada dos componentes de Valor Presente do TCO */
  tcoBreakdown: TcoBreakdown;
  /** Custo Total de Propriedade descontado (TCO = V₀ + VP operacional - VP residual) */
  tco: number;

  /** Quilômetros descontados ao longo do horizonte financeiro */
  levelizedKm: number;
  /** Custo nivelado por quilômetro (R$/km = TCO / levelizedKm) */
  levelizedCostPerKm: number;

  /** Conteúdo de energia consumido por quilômetro (MJ/km) */
  energyMjPerKm: number;
  /** Emissões poço à roda por quilômetro (gCO₂eq/km) */
  emissionsGPerKm: number;
  /** Emissões anuais totais (tCO₂eq/ano = D × emissionsGPerKm / 1.000.000) */
  annualEmissionsTon: number;

  /** Autonomia operacional estimada (km, ou null quando não aplicável) */
  estimatedRangeKm: number | null;

  /** Comparações percentuais e absolutas em relação à linha de base (Diesel B) */
  deltas?: {
    operationalCostPerKm: MetricComparison;
    tco: MetricComparison;
    annualEmissionsTon: MetricComparison;
  };
}

export type SimulationResults = Record<AlternativeId, ScenarioResult>;
