import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import type {
  CorridorFuelStationsCatalog,
  CorridorsCatalog,
} from '../../lib/types/catalogs';
import { FUEL_THEME } from '../../lib/theme/fuels';
import { formatNumber } from '../../lib/utils/format';
import {
  computeCorridorCoverageStats,
  DEFAULT_CORRIDOR_DETOUR_KM,
} from '../../lib/utils/geo';
import { SourceRef } from '../common/SourceRef';
import { useSharedCorridorSelection } from './corridorSelection';

interface CorridorsDashboardProps {
  corridorsData: CorridorsCatalog;
  stationsData: CorridorFuelStationsCatalog;
}

export const CorridorsDashboard: React.FC<CorridorsDashboardProps> = ({
  corridorsData,
  stationsData,
}) => {
  const defaultCorridorId = corridorsData.corridors[0]?.id ?? 'rondonopolis-santos';
  const [selectedCorridorId, setSelectedCorridorId] =
    useSharedCorridorSelection(defaultCorridorId);
  const [selectedPowertrain, setSelectedPowertrain] = useState<
    'biometano' | 'diesel' | 'eletrico'
  >('biometano');

  const handleCorridorChange = (corridorId: string) => {
    setSelectedCorridorId(corridorId);
  };

  const selectedCorridor = useMemo(() => {
    return (
      corridorsData.corridors.find((c) => c.id === selectedCorridorId) ??
      corridorsData.corridors[0]
    );
  }, [corridorsData, selectedCorridorId]);

  const evalData = selectedCorridor.powertrain_evaluations[selectedPowertrain];

  // Objective route-based coverage metrics derived from stations & reference autonomy
  const routeCoverage = useMemo(() => {
    if (selectedPowertrain === 'diesel') {
      return {
        coveredPercent: 100,
        maxUncoveredSpanKm: 0,
        onRouteStationsCount: null as number | null,
        referenceAutonomyKm: null as number | null,
      };
    }
    const refAutonomyKm = selectedPowertrain === 'biometano' ? 650 : 350;
    const tech = selectedPowertrain === 'biometano' ? 'biomethane_cng' : 'electric_hpc';
    const matchingStations = stationsData.stations.filter((s) => s.technology === tech);
    const stats = computeCorridorCoverageStats(
      selectedCorridor,
      matchingStations,
      refAutonomyKm / 2,
      DEFAULT_CORRIDOR_DETOUR_KM
    );
    return {
      coveredPercent: stats.coveredPercent,
      maxUncoveredSpanKm: stats.maxUncoveredSpanKm,
      onRouteStationsCount: stats.onRouteStationsCount,
      referenceAutonomyKm: refAutonomyKm,
    };
  }, [selectedCorridor, selectedPowertrain, stationsData.stations]);

  // Objective coverage color helper
  const getCoverageColor = (coveredPct: number) => {
    if (coveredPct >= 85)
      return 'text-emerald-700 dark:text-emerald-400 border-emerald-500 bg-emerald-500/10';
    if (coveredPct >= 50)
      return 'text-amber-700 dark:text-amber-400 border-amber-500 bg-amber-500/10';
    return 'text-rose-700 dark:text-rose-400 border-rose-500 bg-rose-500/10';
  };

  return (
    <div className="space-y-8">
      {/* Route Feasibility Simulator Header Card */}
      <div className="bg-base-100 border-base-200 rounded-xl border p-5 shadow-xs">
        <div className="border-base-200 mb-5 flex flex-col items-start justify-between gap-4 border-b pb-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-base-content text-lg font-bold tracking-tight">
              Simulador de Viabilidade Operacional por Corredor
            </h2>
            <p className="text-base-content/70 mt-0.5 text-xs">
              Avalie restrições físicas, tempos de reabastecimento/recarga e impacto da
              Lei da Balança nos principais eixos de frete rodoviário.
            </p>
          </div>

          {/* Corridor Selector Dropdown */}
          <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center md:w-auto">
            <label
              htmlFor="corridor-select"
              className="text-base-content/70 text-xs font-semibold whitespace-nowrap"
            >
              Selecione o Eixo:
            </label>
            <select
              id="corridor-select"
              value={selectedCorridorId}
              onChange={(e) => handleCorridorChange(e.target.value)}
              className="select select-sm select-bordered w-full max-w-sm text-xs font-medium sm:w-auto"
            >
              {corridorsData.corridors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({formatNumber(c.distance_km, 0)} km)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Powertrain Selection Tabs (local to Simulator KPIs) */}
        <div className="mb-6 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="lg:join grid w-full grid-cols-1 gap-1.5 sm:grid-cols-3 lg:inline-flex lg:w-auto lg:gap-0">
            <button
              type="button"
              onClick={() => setSelectedPowertrain('biometano')}
              className={`btn btn-sm lg:join-item h-auto min-h-8 gap-1.5 px-3 py-1.5 text-xs leading-snug ${
                selectedPowertrain === 'biometano'
                  ? FUEL_THEME.biometano.activeButtonClass
                  : 'btn-outline border-base-300'
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  selectedPowertrain === 'biometano'
                    ? 'bg-white'
                    : FUEL_THEME.biometano.dotClass
                }`}
                aria-hidden="true"
              />
              <span>
                Biometano{' '}
                <span className="block text-[11px] font-normal opacity-90 sm:inline">
                  (Bio-GNC / GNL)
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPowertrain('eletrico')}
              className={`btn btn-sm lg:join-item h-auto min-h-8 gap-1.5 px-3 py-1.5 text-xs leading-snug ${
                selectedPowertrain === 'eletrico'
                  ? FUEL_THEME.eletrico.activeButtonClass
                  : 'btn-outline border-base-300'
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  selectedPowertrain === 'eletrico'
                    ? 'bg-white'
                    : FUEL_THEME.eletrico.dotClass
                }`}
                aria-hidden="true"
              />
              <span>
                Elétrico Pesado{' '}
                <span className="block text-[11px] font-normal opacity-90 sm:inline">
                  (BEV)
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPowertrain('diesel')}
              className={`btn btn-sm lg:join-item h-auto min-h-8 gap-1.5 px-3 py-1.5 text-xs leading-snug ${
                selectedPowertrain === 'diesel'
                  ? FUEL_THEME.diesel.activeButtonClass
                  : 'btn-outline border-base-300'
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  selectedPowertrain === 'diesel'
                    ? 'bg-white'
                    : FUEL_THEME.diesel.dotClass
                }`}
                aria-hidden="true"
              />
              <span>
                Diesel S10 B15{' '}
                <span className="block text-[11px] font-normal opacity-90 sm:inline">
                  (Baseline)
                </span>
              </span>
            </button>
          </div>

          <div className="text-base-content/70 bg-base-200/50 shrink-0 self-start rounded-lg px-2.5 py-1 text-xs sm:bg-transparent sm:p-0 lg:self-auto">
            PBTC típico da rota:{' '}
            <span className="text-base-content font-bold">
              {selectedCorridor.typical_pbtc}
            </span>
          </div>
        </div>

        {/* Selected Route Evaluation Result */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Column 1: Corridor Physical Profile */}
          <div className="bg-base-200/50 border-base-300 space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="bg-neutral text-neutral-content mb-1 inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-[11px] leading-tight font-medium">
                  <span>{selectedCorridor.origin}</span>
                  <span className="text-neutral-content/85 font-mono">➔</span>
                  <span>{selectedCorridor.destination}</span>
                </span>
                <h3 className="text-base-content text-sm font-bold">
                  {selectedCorridor.name}
                </h3>
              </div>
              <span className="text-primary shrink-0 font-mono text-sm font-black">
                {formatNumber(selectedCorridor.distance_km, 0)} km
              </span>
            </div>

            <p className="text-base-content/75 text-xs leading-relaxed">
              <strong>Perfil de Carga:</strong> {selectedCorridor.cargo_profile}.
            </p>

            <div className="border-base-300 space-y-2 border-t pt-2 text-xs">
              <div className="text-base-content/75 text-[11px] font-bold tracking-wider uppercase">
                Rede de Suprimento Identificada
              </div>
              <div>
                <span className="text-base-content/75 block text-[11px]">
                  Postos Diesel Rodoviários:
                </span>
                <span className="text-base-content font-medium">
                  {selectedCorridor.refueling_points.diesel}
                </span>
              </div>
              <div>
                <span className="text-base-content/75 block text-[11px]">
                  Rede Gás / Biometano:
                </span>
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {selectedCorridor.refueling_points.biomethane_cng}
                </span>
              </div>
              <div>
                <span className="text-base-content/75 block text-[11px]">
                  Eletropostos Rápidos (&gt;150kW):
                </span>
                <span className="font-medium text-cyan-700 dark:text-cyan-400">
                  {selectedCorridor.refueling_points.electric_hpc}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Objective Route Coverage & Logistics KPIs */}
          <div className="space-y-4">
            <div
              className={`flex items-center justify-between gap-3 rounded-lg border p-4 ${getCoverageColor(routeCoverage.coveredPercent)}`}
            >
              <div>
                <div className="text-[11px] font-bold tracking-wider uppercase">
                  Cobertura Objetiva na Rota
                </div>
                <div className="mt-0.5 text-lg font-black">
                  {formatNumber(routeCoverage.coveredPercent, 0)}% —{' '}
                  {evalData.feasibility_label}
                </div>
                <div className="mt-0.5 text-[11px] opacity-90">
                  {selectedPowertrain === 'diesel'
                    ? 'Rede comercial consolidada ao longo da malha federal'
                    : `Autonomia ref. ${routeCoverage.referenceAutonomyKm} km (raio ${routeCoverage.referenceAutonomyKm! / 2} km, ≤${DEFAULT_CORRIDOR_DETOUR_KM} km do eixo · ${routeCoverage.onRouteStationsCount} hubs · vão máx. ${formatNumber(routeCoverage.maxUncoveredSpanKm, 0)} km)`}
                </div>
              </div>
              <div className="shrink-0 text-right font-mono text-xl font-black">
                {formatNumber(routeCoverage.coveredPercent, 0)}%
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-base-200/40 border-base-200 rounded-lg border p-3">
                <span className="text-base-content/75 block text-[11px]">
                  Tempo de Reabastecimento:
                </span>
                <span className="text-base-content font-mono font-bold">
                  ~{evalData.refuel_time_minutes} min
                </span>
                <span className="text-base-content/75 mt-0.5 block text-[11px]">
                  {evalData.stops_description}
                </span>
              </div>

              <div className="bg-base-200/40 border-base-200 rounded-lg border p-3">
                <span className="text-base-content/75 block text-[11px]">
                  Impacto na Carga Útil:
                </span>
                <span
                  className={`font-mono font-bold ${evalData.payload_penalty_kg < 0 ? 'text-amber-700 dark:text-amber-400' : 'text-base-content'}`}
                >
                  {evalData.payload_penalty_kg > 0 ? '+' : ''}
                  {formatNumber(evalData.payload_penalty_kg, 0)} kg
                </span>
                <span className="text-base-content/75 mt-0.5 block text-[11px]">
                  Lei da Balança (PBTC)
                </span>
              </div>
            </div>

            <div className="bg-base-200/40 border-base-200 rounded-lg border p-3 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-base-content/75">
                  Abatimento de Emissões vs Diesel:
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  -{formatNumber(evalData.emission_reduction_percent, 1)}%
                </span>
              </div>
              <div className="bg-base-300 h-2 w-full overflow-hidden rounded-full">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${evalData.emission_reduction_percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Column 3: Operational Recommendation */}
          <div className="bg-base-200/50 border-base-300 flex flex-col justify-between rounded-lg border p-4">
            <div>
              <div className="text-base-content/75 mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
                <Info className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
                Diagnóstico &amp; Recomendação Técnica
              </div>
              <p className="text-base-content/85 text-xs leading-relaxed">
                {evalData.recommendation}
              </p>
            </div>

            <div className="border-base-300 text-base-content/75 mt-4 border-t pt-3 text-[11px] leading-relaxed">
              Fontes: EPE Plano Nacional de Logística{' '}
              <SourceRef id="I12" context="Corredores Logísticos (PNL 2035)" />, CONTRAN
              Res. 882/2021{' '}
              <SourceRef id="V10" context="Lei da Balança / Tolerância PBTC" /> e ANTT{' '}
              <SourceRef id="V01" context="Piso Mínimo de Frete Rodoviário" />.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
