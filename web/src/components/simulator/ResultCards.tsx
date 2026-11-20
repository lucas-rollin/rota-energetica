import React from 'react';
import { Fuel, Leaf, Zap, Flame } from 'lucide-react';
import type { AlternativeId } from '../../lib/types/parameters';
import type { MetricComparison, SimulationResults } from '../../lib/types/scenario';
import { FUEL_THEME } from '../../lib/theme/fuels';
import { formatCurrency, formatNumber, formatPercent } from '../../lib/utils/format';

interface ResultCardsProps {
  results: SimulationResults;
  dieselPurchasePrice: number;
  vehiclePurchasePrices: Record<AlternativeId, number>;
  energyPrices?: Record<AlternativeId, { value: number; unit: string }>;
}

const ALTERNATIVES_ORDER: AlternativeId[] = ['diesel', 'biometano', 'eletrico', 'gnv'];

interface DeltaBadgeProps {
  delta?: MetricComparison;
  lowerIsBetter?: boolean;
}

const DeltaBadge: React.FC<DeltaBadgeProps> = ({ delta, lowerIsBetter = true }) => {
  if (!delta || Math.abs(delta.diff) < 1e-6) {
    return (
      <span className="text-base-content/50 bg-base-200/80 rounded px-1.5 py-0.5 text-[10px] font-medium">
        Ref.
      </span>
    );
  }

  const isGood = lowerIsBetter ? delta.diff < 0 : delta.diff > 0;
  const colorClass = isGood
    ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/50'
    : 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/60 border border-rose-200/50 dark:border-rose-800/50';

  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${colorClass}`}
      title={`Diferença absoluta: ${delta.diff > 0 ? '+' : ''}${formatNumber(delta.diff, 2)}`}
    >
      {formatPercent(delta.pct, 1)}
    </span>
  );
};

const POWERTRAIN_CONFIG: Record<
  AlternativeId,
  {
    icon: React.ReactNode;
    tag: string;
    borderAccent: string;
    highlightText: string;
    highlightClass: string;
  }
> = {
  diesel: {
    icon: <Fuel className="h-4 w-4 text-slate-500" aria-hidden="true" />,
    tag: 'Linha de Base',
    borderAccent: FUEL_THEME.diesel.borderAccent,
    highlightText: 'Referência de Mercado',
    highlightClass: FUEL_THEME.diesel.pillClass,
  },
  biometano: {
    icon: <Leaf className="h-4 w-4 text-emerald-500" aria-hidden="true" />,
    tag: 'Bioenergia Agro',
    borderAccent: FUEL_THEME.biometano.borderAccent,
    highlightText: 'Menor TCO Acumulado',
    highlightClass: FUEL_THEME.biometano.pillClass,
  },
  eletrico: {
    icon: <Zap className="h-4 w-4 text-cyan-500" aria-hidden="true" />,
    tag: 'Tração Elétrica',
    borderAccent: FUEL_THEME.eletrico.borderAccent,
    highlightText: 'Zero Emissão Local (Escopo 1)',
    highlightClass: FUEL_THEME.eletrico.pillClass,
  },
  gnv: {
    icon: <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />,
    tag: 'Gás de Transição',
    borderAccent: FUEL_THEME.gnv.borderAccent,
    highlightText: 'Redução Imediata de Particulados',
    highlightClass: FUEL_THEME.gnv.pillClass,
  },
};

export const ResultCards: React.FC<ResultCardsProps> = ({
  results,
  dieselPurchasePrice,
  vehiclePurchasePrices,
  energyPrices,
}) => {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {ALTERNATIVES_ORDER.map((alt) => {
        const res = results[alt];
        if (!res) return null;

        const isDiesel = alt === 'diesel';
        const purchasePrice = vehiclePurchasePrices[alt] ?? 0;
        const sobreprecoDiff = purchasePrice - dieselPurchasePrice;
        const config = POWERTRAIN_CONFIG[alt];
        const energyPrice = energyPrices?.[alt];

        return (
          <div
            key={alt}
            className={`card bg-base-100 border-base-200 rounded-xl border shadow-xs transition-all hover:shadow-md ${config.borderAccent}`}
          >
            <div className="card-body flex flex-col justify-between p-3.5 sm:p-4">
              <div>
                {/* Header: Tag + Icon */}
                <div className="mb-1.5 flex items-center justify-between gap-1">
                  <span className="text-base-content/60 text-[10px] font-bold tracking-wider uppercase">
                    {config.tag}
                  </span>
                  <span className="text-base" aria-hidden="true">
                    {config.icon}
                  </span>
                </div>

                {/* Powertrain Label + Energy Price */}
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-base-content text-sm leading-tight font-bold sm:text-base">
                    {res.label}
                  </h3>
                  {energyPrice && (
                    <span className="text-base-content/60 font-mono text-[11px] font-medium">
                      R$ {formatNumber(energyPrice.value, 2)}
                      {energyPrice.unit.replace('R$', '')}
                    </span>
                  )}
                </div>

                {/* Primary Metric: Custo Operacional / km */}
                <div className="bg-base-200/40 mb-2.5 rounded-lg p-2">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base-content font-mono text-xl font-black sm:text-2xl">
                        {formatCurrency(res.operationalCostPerKm, 2)}
                      </span>
                      <span className="text-base-content/60 text-[11px] font-medium">
                        / km
                      </span>
                    </div>
                    <DeltaBadge delta={res.deltas?.operationalCostPerKm} />
                  </div>
                </div>

                {/* Secondary Metrics: TCO and Emissions */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70 text-[11px]">TCO Total:</span>
                    <span className="text-base-content font-mono font-bold">
                      {formatCurrency(res.tco, 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70 text-[11px]">
                      Emissões anuais:
                    </span>
                    <span className="text-base-content/80 font-mono text-[11px]">
                      {formatNumber(res.annualEmissionsTon, 0)} tCO₂e/ano
                    </span>
                  </div>

                  {!isDiesel && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-base-content/70">Sobrepreço caminhão:</span>
                      <span
                        className={`font-mono font-medium ${
                          sobreprecoDiff > 0
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {sobreprecoDiff > 0 ? '+' : ''}
                        {formatCurrency(sobreprecoDiff, 0)}
                      </span>
                    </div>
                  )}

                  {!isDiesel &&
                    res.annualCbioRevenue !== undefined &&
                    res.annualCbioRevenue > 0 && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-base-content/70">Receita CBIO/ano:</span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(res.annualCbioRevenue, 0)}
                        </span>
                      </div>
                    )}

                  {res.payloadPenaltyKg !== undefined && res.payloadPenaltyKg !== 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-base-content/70">Lei da Balança:</span>
                      <span
                        className={`font-mono font-medium ${
                          res.payloadPenaltyKg < 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-base-content/80'
                        }`}
                      >
                        {res.payloadPenaltyKg > 0 ? '+' : ''}
                        {formatNumber(res.payloadPenaltyKg, 0)} kg carga útil
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Highlight Pill */}
              <div
                className={`mt-2.5 rounded px-2 py-1 text-center text-[10px] font-medium ${config.highlightClass}`}
              >
                {config.highlightText}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
