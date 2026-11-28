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
  residualBand?: Record<AlternativeId, { lowTco: number; highTco: number }>;
}

const ALTERNATIVES_ORDER: AlternativeId[] = ['diesel', 'biometano', 'eletrico', 'gnv'];

interface DeltaBadgeProps {
  delta?: MetricComparison;
  lowerIsBetter?: boolean;
}

const DeltaBadge: React.FC<DeltaBadgeProps> = ({ delta, lowerIsBetter = true }) => {
  if (!delta || Math.abs(delta.diff) < 1e-6) {
    return (
      <span className="text-base-content/70 bg-base-200 rounded px-1.5 py-0.5 text-[11px] font-medium">
        Ref.
      </span>
    );
  }

  const isGood = lowerIsBetter ? delta.diff < 0 : delta.diff > 0;
  const colorClass = isGood
    ? 'text-success bg-success/10 border border-success/25'
    : 'text-error bg-error/10 border border-error/25';

  return (
    <span
      className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${colorClass}`}
      title={`Diferença absoluta: ${delta.diff > 0 ? '+' : ''}${formatNumber(delta.diff, 2)}`}
    >
      {formatPercent(delta.pct, 1)}
    </span>
  );
};

const POWERTRAIN_ICONS: Record<AlternativeId, React.ReactNode> = {
  diesel: (
    <Fuel className={`h-4 w-4 ${FUEL_THEME.diesel.iconClass}`} aria-hidden="true" />
  ),
  biometano: (
    <Leaf className={`h-4 w-4 ${FUEL_THEME.biometano.iconClass}`} aria-hidden="true" />
  ),
  eletrico: (
    <Zap className={`h-4 w-4 ${FUEL_THEME.eletrico.iconClass}`} aria-hidden="true" />
  ),
  gnv: <Flame className={`h-4 w-4 ${FUEL_THEME.gnv.iconClass}`} aria-hidden="true" />,
};

export const ResultCards: React.FC<ResultCardsProps> = ({
  results,
  dieselPurchasePrice,
  vehiclePurchasePrices,
  energyPrices,
  residualBand,
}) => {
  const minTco = Math.min(
    ...ALTERNATIVES_ORDER.map((id) => results[id]?.tco ?? Number.POSITIVE_INFINITY)
  );
  const minEmissions = Math.min(
    ...ALTERNATIVES_ORDER.map(
      (id) => results[id]?.annualEmissionsTon ?? Number.POSITIVE_INFINITY
    )
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ALTERNATIVES_ORDER.map((alt) => {
        const res = results[alt];
        if (!res) return null;

        const isDiesel = alt === 'diesel';
        const purchasePrice = vehiclePurchasePrices[alt] ?? 0;
        const sobreprecoDiff = purchasePrice - dieselPurchasePrice;
        const fuelTheme = FUEL_THEME[alt];
        const energyPrice = energyPrices?.[alt];
        const isLowestTco = Math.abs(res.tco - minTco) < 1e-2;
        const isLowestEmissions = Math.abs(res.annualEmissionsTon - minEmissions) < 1e-4;
        const winnerBadge = isLowestTco
          ? 'Menor TCO'
          : isLowestEmissions
            ? 'Menor Emissão WtW'
            : null;

        return (
          <div
            key={alt}
            className={`card bg-base-100 border-base-300/70 rounded-xl border transition-colors ${fuelTheme.borderAccent}`}
          >
            <div className="card-body flex flex-col justify-between gap-2.5 p-3.5">
              <div>
                {/* Header: Icon + Label + Energy Price */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {POWERTRAIN_ICONS[alt]}
                    <h3 className="text-base-content truncate text-sm font-bold">
                      {res.label}
                    </h3>
                  </div>
                  {energyPrice && (
                    <span className="text-base-content/65 shrink-0 font-mono text-[11px]">
                      R$ {formatNumber(energyPrice.value, 2)}
                      {energyPrice.unit.replace('R$', '')}
                    </span>
                  )}
                </div>

                {/* Primary Metric: Operational Cost / km */}
                <div className="bg-base-200/55 mb-2.5 flex items-baseline justify-between rounded-lg px-2.5 py-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-base-content font-mono text-xl font-black">
                      {formatCurrency(res.operationalCostPerKm, 2)}
                    </span>
                    <span className="text-base-content/65 text-[11px]">/km</span>
                  </div>
                  <DeltaBadge delta={res.deltas?.operationalCostPerKm} />
                </div>

                {/* Secondary Metrics */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70 text-[11px]">TCO Total</span>
                    <span className="text-base-content font-mono font-bold">
                      {formatCurrency(res.tco, 0)}
                    </span>
                  </div>

                  {residualBand?.[alt] && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-base-content/65">Faixa residual</span>
                      <span className="text-base-content/75 font-mono">
                        {formatCurrency(residualBand[alt].highTco, 0)} –{' '}
                        {formatCurrency(residualBand[alt].lowTco, 0)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-base-content/70">Emissões WtW</span>
                    <span className="text-base-content/85 font-mono">
                      {formatNumber(res.annualEmissionsTon, 0)} tCO₂e/ano
                    </span>
                  </div>

                  {!isDiesel && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-base-content/70">Sobrepreço</span>
                      <span
                        className={`font-mono font-medium ${
                          sobreprecoDiff > 0 ? 'text-warning' : 'text-success'
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
                        <span className="text-base-content/70">CBIO/ano</span>
                        <span className="text-success font-mono font-semibold">
                          +{formatCurrency(res.annualCbioRevenue, 0)}
                        </span>
                      </div>
                    )}

                  {res.payloadPenaltyKg !== undefined && res.payloadPenaltyKg !== 0 && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-base-content/70">Carga útil</span>
                      <span
                        className={`font-mono font-medium ${
                          res.payloadPenaltyKg < 0
                            ? 'text-warning'
                            : 'text-base-content/85'
                        }`}
                      >
                        {res.payloadPenaltyKg > 0 ? '+' : ''}
                        {formatNumber(res.payloadPenaltyKg, 0)} kg
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Winner Highlight Pill (only when winning) */}
              {winnerBadge && (
                <div
                  className={`rounded-md px-2 py-1 text-center text-[11px] ${fuelTheme.pillClass}`}
                >
                  {winnerBadge}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
