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
  const activeFuelTheme = FUEL_THEME[selectedPowertrain];

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

  const getCoverageColor = (coveredPct: number) => {
    if (coveredPct >= 85) return 'text-success border-success/40 bg-success/10';
    if (coveredPct >= 50) return 'text-warning border-warning/40 bg-warning/10';
    return 'text-error border-error/40 bg-error/10';
  };

  return (
    <div className="bg-base-100 border-base-300/70 rounded-xl border p-4">
      {/* Compact Controls Toolbar */}
      <div className="border-base-300/60 mb-4 flex flex-col justify-between gap-3 border-b pb-3.5 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="corridor-select"
            className="text-base-content/70 text-xs font-semibold whitespace-nowrap"
          >
            Eixo
          </label>
          <select
            id="corridor-select"
            value={selectedCorridorId}
            onChange={(e) => handleCorridorChange(e.target.value)}
            className="select select-xs select-bordered w-full max-w-xs text-xs font-medium sm:w-auto"
          >
            {corridorsData.corridors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({formatNumber(c.distance_km, 0)} km)
              </option>
            ))}
          </select>

          <span className="text-base-content/65 text-xs">
            · PBTC:{' '}
            <strong className="text-base-content">{selectedCorridor.typical_pbtc}</strong>
          </span>
        </div>

        <div className="join">
          {(
            [
              { id: 'biometano', label: 'Biometano' },
              { id: 'eletrico', label: 'Elétrico (BEV)' },
              { id: 'diesel', label: 'Diesel B15' },
            ] as const
          ).map((opt) => {
            const isActive = selectedPowertrain === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedPowertrain(opt.id)}
                className={`join-item btn btn-xs gap-1.5 ${
                  isActive
                    ? FUEL_THEME[opt.id].activeButtonClass
                    : 'btn-outline border-base-300'
                }`}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    isActive ? 'bg-white' : FUEL_THEME[opt.id].dotClass
                  }`}
                  aria-hidden="true"
                />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Route Evaluation Result */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Column 1: Corridor Physical Profile */}
        <div className="bg-base-200/45 border-base-300/70 space-y-2.5 rounded-lg border p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="bg-base-300/70 text-base-content mb-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium">
                <span>{selectedCorridor.origin}</span>
                <span className="font-mono opacity-70">→</span>
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

          <p className="text-base-content/75 text-xs">
            <strong>Carga:</strong> {selectedCorridor.cargo_profile}
          </p>

          <div className="border-base-300/60 space-y-1.5 border-t pt-2 text-xs">
            <div className="text-base-content/65 text-[11px] font-bold tracking-wider uppercase">
              Rede na Rota
            </div>
            <div>
              <span className="text-base-content/65 text-[11px]">Diesel: </span>
              <span className="text-base-content font-medium">
                {selectedCorridor.refueling_points.diesel}
              </span>
            </div>
            <div>
              <span className="text-base-content/65 text-[11px]">Gás / Biometano: </span>
              <span className={`font-medium ${FUEL_THEME.biometano.textClass}`}>
                {selectedCorridor.refueling_points.biomethane_cng}
              </span>
            </div>
            <div>
              <span className="text-base-content/65 text-[11px]">HPC (&gt;150 kW): </span>
              <span className={`font-medium ${FUEL_THEME.eletrico.textClass}`}>
                {selectedCorridor.refueling_points.electric_hpc}
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Objective Route Coverage & Logistics KPIs */}
        <div className="space-y-3">
          <div
            className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 ${getCoverageColor(routeCoverage.coveredPercent)}`}
          >
            <div>
              <div className="text-[11px] font-bold tracking-wider uppercase">
                Cobertura na Rota
              </div>
              <div className="mt-0.5 text-base font-black">
                {formatNumber(routeCoverage.coveredPercent, 0)}% —{' '}
                {evalData.feasibility_label}
              </div>
              <div className="mt-0.5 text-[11px] opacity-85">
                {selectedPowertrain === 'diesel'
                  ? 'Malha comercial consolidada'
                  : `Autonomia ${routeCoverage.referenceAutonomyKm} km · ${routeCoverage.onRouteStationsCount} hubs · vão máx. ${formatNumber(routeCoverage.maxUncoveredSpanKm, 0)} km`}
              </div>
            </div>
            <div className="shrink-0 font-mono text-xl font-black">
              {formatNumber(routeCoverage.coveredPercent, 0)}%
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-base-200/45 border-base-300/60 rounded-lg border p-2.5">
              <span className="text-base-content/65 block text-[11px]">
                Abastecimento
              </span>
              <span className="text-base-content font-mono font-bold">
                ~{evalData.refuel_time_minutes} min
              </span>
              <span className="text-base-content/70 mt-0.5 block text-[11px]">
                {evalData.stops_description}
              </span>
            </div>

            <div className="bg-base-200/45 border-base-300/60 rounded-lg border p-2.5">
              <span className="text-base-content/65 block text-[11px]">Carga Útil</span>
              <span
                className={`font-mono font-bold ${
                  evalData.payload_penalty_kg < 0 ? 'text-warning' : 'text-base-content'
                }`}
              >
                {evalData.payload_penalty_kg > 0 ? '+' : ''}
                {formatNumber(evalData.payload_penalty_kg, 0)} kg
              </span>
              <span className="text-base-content/70 mt-0.5 block text-[11px]">
                Lei da Balança
              </span>
            </div>
          </div>

          <div className="bg-base-200/45 border-base-300/60 rounded-lg border p-2.5 text-xs">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-base-content/70">Abatimento CO₂ vs. Diesel</span>
              <span className={`font-mono font-bold ${activeFuelTheme.textClass}`}>
                -{formatNumber(evalData.emission_reduction_percent, 1)}%
              </span>
            </div>
            <div className="bg-base-300 h-2 w-full overflow-hidden rounded-full">
              <div
                className={`h-full ${activeFuelTheme.barClass}`}
                style={{ width: `${evalData.emission_reduction_percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Column 3: Operational Recommendation */}
        <div className="bg-base-200/45 border-base-300/70 flex flex-col justify-between rounded-lg border p-3.5">
          <div>
            <div className="text-base-content/70 mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
              <Info className="text-primary h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Diagnóstico Técnico</span>
            </div>
            <p className="text-base-content/85 text-xs leading-relaxed">
              {evalData.recommendation}
            </p>
          </div>

          <div className="border-base-300/60 text-base-content/65 mt-3 border-t pt-2.5 text-[11px] leading-relaxed">
            Fontes: EPE <SourceRef id="I12" context="Corredores Logísticos (PNL 2035)" />{' '}
            · CONTRAN <SourceRef id="V10" context="Lei da Balança / Tolerância PBTC" /> ·
            ANTT <SourceRef id="V01" context="Piso Mínimo de Frete Rodoviário" />
          </div>
        </div>
      </div>
    </div>
  );
};
