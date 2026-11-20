import React from 'react';
import type { AlternativeId } from '../../lib/types/parameters';
import type { MetricComparison, SimulationResults } from '../../lib/types/scenario';
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
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 text-slate-500"
        aria-hidden="true"
      >
        <path d="M3 4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-4.586l1.293 1.293a1 1 0 0 0 1.414-1.414l-3-3a1 1 0 0 0-1.414 0l-3 3a1 1 0 1 0 1.414 1.414L10 11.414V16H3V6h7v2a1 1 0 1 0 2 0V6a2 2 0 0 0-2-2H3Z" />
        <path d="M15 4a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v7.5a1.5 1.5 0 0 1-3 0V9a1 1 0 0 0-1-1h-.5a.5.5 0 0 1-.5-.5V4Z" />
      </svg>
    ),
    tag: 'Linha de Base',
    borderAccent: 'border-l-4 border-l-slate-400 dark:border-l-slate-600',
    highlightText: 'Referência de Mercado',
    highlightClass: 'bg-base-200/60 text-base-content/70',
  },
  biometano: {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 text-emerald-500"
        aria-hidden="true"
      >
        <path d="M10 2a8 8 0 0 0-8 8c0 4.418 3.582 8 8 8 3.5 0 6.467-2.247 7.534-5.4A8.004 8.004 0 0 0 10 2Zm3.707 6.707a1 1 0 0 0-1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414 0l4-4Z" />
      </svg>
    ),
    tag: 'Bioenergia Agro',
    borderAccent: 'border-l-4 border-l-emerald-500',
    highlightText: 'Menor TCO Acumulado',
    highlightClass:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold',
  },
  eletrico: {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 text-purple-500"
        aria-hidden="true"
      >
        <path d="M11.983 1.59a.75.75 0 0 0-1.292-.614l-5.5 6.5A.75.75 0 0 0 5.77 8.75h4.072l-1.825 9.66a.75.75 0 0 0 1.292.614l5.5-6.5A.75.75 0 0 0 14.23 11.25H10.16l1.824-9.66Z" />
      </svg>
    ),
    tag: 'Tração Elétrica',
    borderAccent: 'border-l-4 border-l-purple-500',
    highlightText: 'Zero Emissão Local (Escopo 1)',
    highlightClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 font-semibold',
  },
  gnv: {
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4 text-amber-500"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 2a1 1 0 0 1 1 1v1.055a7.002 7.002 0 0 1 5.945 5.945H18a1 1 0 1 1 0 2h-1.055a7.002 7.002 0 0 1-5.945 5.945V18a1 1 0 1 1-2 0v-1.055A7.002 7.002 0 0 1 3.055 11H2a1 1 0 1 1 0-2h1.055A7.002 7.002 0 0 1 9 3.055V2a1 1 0 0 1 1-1Zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"
          clipRule="evenodd"
        />
      </svg>
    ),
    tag: 'Gás de Transição',
    borderAccent: 'border-l-4 border-l-amber-500',
    highlightText: 'Redução Imediata de CO₂',
    highlightClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold',
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
