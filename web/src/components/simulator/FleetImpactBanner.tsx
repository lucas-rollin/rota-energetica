import React, { useMemo } from 'react';
import { Truck } from 'lucide-react';
import { FUEL_THEME } from '../../lib/theme/fuels';
import type { AlternativeId, SimulationParameters } from '../../lib/types/parameters';
import type { SimulationResults } from '../../lib/types/scenario';
import { formatCurrency, formatNumber } from '../../lib/utils/format';

interface FleetImpactBannerProps {
  results: SimulationResults;
  params: SimulationParameters;
  fleetSize: number;
}

export const FleetImpactBanner: React.FC<FleetImpactBannerProps> = ({
  results,
  params,
  fleetSize,
}) => {
  const horizonYears = Math.round(params.general.horizon_years.value);
  const dieselRes = results.diesel;

  // Find the alternative with maximum cumulative TCO savings vs Diesel
  const { bestAlt, maxSavings, co2AbatedTon, annualOpexSavings } = useMemo(() => {
    if (!dieselRes) {
      return {
        bestAlt: null,
        maxSavings: 0,
        co2AbatedTon: 0,
        annualOpexSavings: 0,
      };
    }

    const alts: AlternativeId[] = ['biometano', 'eletrico', 'gnv'];
    let best: { id: AlternativeId; name: string } | null = null;
    let maxDiff = 0;
    let co2Abated = 0;
    let opexSavings = 0;

    for (const alt of alts) {
      const res = results[alt];
      if (!res) continue;

      const tcoDiff = (dieselRes.tco - res.tco) * fleetSize;
      if (tcoDiff > maxDiff) {
        maxDiff = tcoDiff;
        best = { id: alt, name: res.label };
        co2Abated =
          (dieselRes.annualEmissionsTon - res.annualEmissionsTon) *
          horizonYears *
          fleetSize;
        opexSavings =
          (dieselRes.annualOperationalCost - res.annualOperationalCost) * fleetSize;
      }
    }

    return {
      bestAlt: best,
      maxSavings: maxDiff,
      co2AbatedTon: co2Abated,
      annualOpexSavings: opexSavings,
    };
  }, [results, dieselRes, fleetSize, horizonYears]);

  if (!bestAlt || maxSavings <= 0) {
    return (
      <div className="bg-base-100 border-base-300/70 flex items-center gap-3 rounded-xl border px-4 py-3.5">
        <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Truck className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base-content text-sm font-bold">
            Frota: {fleetSize} {fleetSize === 1 ? 'caminhão' : 'caminhões'} ·{' '}
            {horizonYears} anos
          </h3>
          <p className="text-base-content/70 text-xs">
            Diesel B15 mantém o menor TCO neste cenário.
          </p>
        </div>
      </div>
    );
  }

  const fuelTheme = FUEL_THEME[bestAlt.id];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 transition-colors ${fuelTheme.bannerClass}`}
    >
      <div className="flex flex-col justify-between gap-3.5 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase ${fuelTheme.badgeClass}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${fuelTheme.dotClass}`}
                aria-hidden="true"
              />
              <span>Menor TCO · {bestAlt.name}</span>
            </span>
            <span className="text-base-content/70 text-xs">
              {fleetSize} {fleetSize === 1 ? 'caminhão' : 'caminhões'} · {horizonYears}{' '}
              anos
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
            <span
              className={`font-mono text-2xl font-black tracking-tight sm:text-3xl ${fuelTheme.textClass}`}
            >
              {formatCurrency(maxSavings, 0)}
            </span>
            <span className="text-base-content/80 text-xs font-medium sm:text-sm">
              de economia acumulada vs. Diesel B15
            </span>
          </div>

          <p className="text-base-content/65 mt-1 text-[11px]">
            Valor presente líquido · exclui infraestrutura de garagem e financiamento.
          </p>
        </div>

        {/* Compact Aggregate KPI Chips */}
        <div className="flex shrink-0 flex-wrap gap-2">
          <div className="bg-base-100/85 border-base-300/70 rounded-lg border px-3 py-2 text-center">
            <span className="text-base-content/65 block text-[10px] font-semibold tracking-wider uppercase">
              CO₂ evitado (WtW)
            </span>
            <span className="text-base-content font-mono text-sm font-bold sm:text-base">
              {formatNumber(co2AbatedTon, 0)} t
            </span>
          </div>

          <div className="bg-base-100/85 border-base-300/70 rounded-lg border px-3 py-2 text-center">
            <span className="text-base-content/65 block text-[10px] font-semibold tracking-wider uppercase">
              Economia OPEX/ano
            </span>
            <span className="text-base-content font-mono text-sm font-bold sm:text-base">
              {formatCurrency(annualOpexSavings, 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
