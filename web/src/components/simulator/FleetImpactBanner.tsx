import React, { useMemo } from 'react';
import { Truck } from 'lucide-react';
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
      <div className="card bg-base-100 border-base-200 rounded-2xl border p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base-content text-sm font-bold sm:text-base">
              Configuração de Frota: {fleetSize}{' '}
              {fleetSize === 1 ? 'caminhão' : 'caminhões'} em {horizonYears} anos
            </h3>
            <p className="text-base-content/70 text-xs">
              Ajuste as premissas no painel ao lado para simular o ponto de virada
              econômica das tecnologias alternativas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="via-base-100 to-base-100 relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-linear-to-br from-emerald-400/20 dark:from-emerald-950/40 p-4 shadow-sm sm:p-6">
      <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge badge-sm badge-success font-mono text-[11px] font-bold tracking-wider uppercase">
              Economia Consolidada da Frota
            </span>
            <span className="text-base-content/75 text-xs">
              {fleetSize} {fleetSize === 1 ? 'caminhão' : 'caminhões'} · {horizonYears}{' '}
              anos
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-2xl font-black tracking-tight text-emerald-700 sm:text-3xl dark:text-emerald-400">
              {formatCurrency(maxSavings, 0)}
            </span>
            <span className="text-base-content/85 text-xs font-semibold sm:text-sm">
              de economia estimada com{' '}
              <strong className="text-base-content">{bestAlt.name}</strong>
            </span>
          </div>

          <p className="text-base-content/75 mt-1 max-w-2xl text-xs">
            Frente à linha de base do Diesel B15, considerando a redução acumulada de
            despesas com combustível e manutenção trazidas a valor presente.
          </p>
          <p className="text-base-content/75 mt-1 text-[11px] font-medium">
            Nota: exclui CapEx de infraestrutura de recarga/abastecimento em garagem,
            reforços de rede elétrica e custos de financiamento.
          </p>
        </div>

        {/* Aggregate KPI Badges */}
        <div className="flex shrink-0 flex-wrap gap-2.5 sm:gap-3">
          <div className="bg-base-200/70 border-base-300/80 rounded-xl border px-3 py-2 text-center">
            <span className="text-base-content/75 block text-[11px] font-semibold tracking-wider uppercase">
              Abatimento CO₂
            </span>
            <span className="font-mono text-sm font-bold text-emerald-700 sm:text-base dark:text-emerald-400">
              {formatNumber(co2AbatedTon, 0)} t
            </span>
            <span className="text-base-content/75 block text-[11px]">
              Poço à Roda (WtW)
            </span>
          </div>

          <div className="bg-base-200/70 border-base-300/80 rounded-xl border px-3 py-2 text-center">
            <span className="text-base-content/75 block text-[11px] font-semibold tracking-wider uppercase">
              Economia OPEX
            </span>
            <span className="text-base-content font-mono text-sm font-bold sm:text-base">
              {formatCurrency(annualOpexSavings, 0)}
            </span>
            <span className="text-base-content/75 block text-[11px]">
              por ano de operação
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
