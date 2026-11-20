import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import type {
  CorridorFuelStationsCatalog,
  CorridorsCatalog,
} from '../../lib/types/catalogs';
import { formatNumber } from '../../lib/utils/format';
import { CorridorInfrastructureMap } from './CorridorInfrastructureMap';

interface CorridorsDashboardProps {
  corridorsData: CorridorsCatalog;
  stationsData: CorridorFuelStationsCatalog;
  brazilGeoJson: unknown;
}

export const CorridorsDashboard: React.FC<CorridorsDashboardProps> = ({
  corridorsData,
  stationsData,
  brazilGeoJson,
}) => {
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(
    corridorsData.corridors[0]?.id ?? 'rondonopolis-santos'
  );
  const [selectedPowertrain, setSelectedPowertrain] = useState<
    'biometano' | 'diesel' | 'eletrico'
  >('biometano');
  const [viewportScope, setViewportScope] = useState<'corridor' | 'brazil'>(
    'corridor'
  );
  const [viewportTick, setViewportTick] = useState<number>(0);

  const handleCorridorChange = (corridorId: string) => {
    setSelectedCorridorId(corridorId);
    setViewportScope('corridor');
    setViewportTick((t) => t + 1);
  };

  const selectedCorridor = useMemo(() => {
    return (
      corridorsData.corridors.find((c) => c.id === selectedCorridorId) ??
      corridorsData.corridors[0]
    );
  }, [corridorsData, selectedCorridorId]);

  const evalData = selectedCorridor.powertrain_evaluations[selectedPowertrain];

  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 85)
      return 'text-emerald-600 dark:text-emerald-400 border-emerald-500 bg-emerald-500/10';
    if (score >= 60) return 'text-secondary border-secondary bg-secondary/10';
    return 'text-rose-600 dark:text-rose-400 border-rose-500 bg-rose-500/10';
  };

  return (
    <div className="space-y-8">
      {/* Route Feasibility Simulator Header Card */}
      <div className="bg-base-100 rounded-xl border border-base-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-base-200 pb-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-base-content tracking-tight">
              Simulador de Viabilidade Operacional por Corredor
            </h2>
            <p className="text-xs text-base-content/70 mt-0.5">
              Avalie restrições físicas, tempos de reabastecimento/recarga e impacto da Lei da Balança nos principais eixos de frete rodoviário.
            </p>
          </div>

          {/* Corridor Selector Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <label
              htmlFor="corridor-select"
              className="text-xs font-semibold text-base-content/70 whitespace-nowrap"
            >
              Selecione o Eixo:
            </label>
            <select
              id="corridor-select"
              value={selectedCorridorId}
              onChange={(e) => handleCorridorChange(e.target.value)}
              className="select select-sm select-bordered font-medium text-xs w-full sm:w-auto max-w-sm"
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:inline-flex lg:join w-full lg:w-auto gap-1.5 lg:gap-0">
            <button
              type="button"
              onClick={() => setSelectedPowertrain('biometano')}
              className={`btn btn-sm h-auto min-h-8 py-1.5 px-3 text-xs leading-snug lg:join-item ${
                selectedPowertrain === 'biometano'
                  ? 'btn-primary shadow-xs'
                  : 'btn-outline'
              }`}
            >
              <span>
                Biometano{' '}
                <span className="text-[10px] opacity-80 font-normal block sm:inline">
                  (Bio-GNC / GNL)
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPowertrain('eletrico')}
              className={`btn btn-sm h-auto min-h-8 py-1.5 px-3 text-xs leading-snug lg:join-item ${
                selectedPowertrain === 'eletrico'
                  ? 'btn-primary shadow-xs'
                  : 'btn-outline'
              }`}
            >
              <span>
                Elétrico Pesado{' '}
                <span className="text-[10px] opacity-80 font-normal block sm:inline">
                  (BEV)
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPowertrain('diesel')}
              className={`btn btn-sm h-auto min-h-8 py-1.5 px-3 text-xs leading-snug lg:join-item ${
                selectedPowertrain === 'diesel'
                  ? 'btn-primary shadow-xs'
                  : 'btn-outline'
              }`}
            >
              <span>
                Diesel S10 B15{' '}
                <span className="text-[10px] opacity-80 font-normal block sm:inline">
                  (Baseline)
                </span>
              </span>
            </button>
          </div>

          <div className="text-xs text-base-content/70 shrink-0 self-start lg:self-auto bg-base-200/50 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg">
            PBTC típico da rota:{' '}
            <span className="font-bold text-base-content">
              {selectedCorridor.typical_pbtc}
            </span>
          </div>
        </div>

        {/* Selected Route Evaluation Result */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Corridor Physical Profile */}
          <div className="bg-base-200/50 rounded-lg p-4 border border-base-300 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral text-neutral-content text-[11px] font-medium leading-tight max-w-full mb-1">
                  <span>{selectedCorridor.origin}</span>
                  <span className="text-neutral-content/60 font-mono">➔</span>
                  <span>{selectedCorridor.destination}</span>
                </span>
                <h3 className="text-sm font-bold text-base-content">
                  {selectedCorridor.name}
                </h3>
              </div>
              <span className="font-mono text-sm font-black text-primary shrink-0">
                {formatNumber(selectedCorridor.distance_km, 0)} km
              </span>
            </div>

            <p className="text-xs text-base-content/75 leading-relaxed">
              <strong>Perfil de Carga:</strong> {selectedCorridor.cargo_profile}.
            </p>

            <div className="pt-2 border-t border-base-300 space-y-2 text-xs">
              <div className="font-bold text-[11px] uppercase tracking-wider text-base-content/60">
                Rede de Suprimento Identificada
              </div>
              <div>
                <span className="text-base-content/60 text-[11px] block">
                  Postos Diesel Rodoviários:
                </span>
                <span className="font-medium text-base-content">
                  {selectedCorridor.refueling_points.diesel}
                </span>
              </div>
              <div>
                <span className="text-base-content/60 text-[11px] block">
                  Rede Gás / Biometano:
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {selectedCorridor.refueling_points.biomethane_cng}
                </span>
              </div>
              <div>
                <span className="text-base-content/60 text-[11px] block">
                  Eletropostos Rápidos (&gt;150kW):
                </span>
                <span className="font-medium text-cyan-600 dark:text-cyan-400">
                  {selectedCorridor.refueling_points.electric_hpc}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Feasibility & Logistics KPIs */}
          <div className="space-y-4">
            <div
              className={`p-4 rounded-lg border flex items-center justify-between ${getScoreColor(evalData.feasibility_score)}`}
            >
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider">
                  Índice de Viabilidade da Rota
                </div>
                <div className="text-xl font-black mt-0.5">
                  {evalData.feasibility_score}% — {evalData.feasibility_label}
                </div>
              </div>
              <div
                className="radial-progress text-current font-bold font-mono text-xs"
                style={
                  {
                    '--value': evalData.feasibility_score,
                    '--size': '3.2rem',
                  } as React.CSSProperties
                }
              >
                {evalData.feasibility_score}%
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-base-200/40 p-3 rounded-lg border border-base-200">
                <span className="text-base-content/60 text-[11px] block">
                  Tempo de Reabastecimento:
                </span>
                <span className="font-mono font-bold text-base-content">
                  ~{evalData.refuel_time_minutes} min
                </span>
                <span className="text-[10px] text-base-content/50 block mt-0.5">
                  {evalData.stops_description}
                </span>
              </div>

              <div className="bg-base-200/40 p-3 rounded-lg border border-base-200">
                <span className="text-base-content/60 text-[11px] block">
                  Impacto na Carga Útil:
                </span>
                <span
                  className={`font-mono font-bold ${evalData.payload_penalty_kg < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-base-content'}`}
                >
                  {evalData.payload_penalty_kg > 0 ? '+' : ''}
                  {formatNumber(evalData.payload_penalty_kg, 0)} kg
                </span>
                <span className="text-[10px] text-base-content/50 block mt-0.5">
                  Lei da Balança (PBTC)
                </span>
              </div>
            </div>

            <div className="bg-base-200/40 p-3 rounded-lg border border-base-200 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="text-base-content/70">
                  Abatimento de Emissões vs Diesel:
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  -{formatNumber(evalData.emission_reduction_percent, 1)}%
                </span>
              </div>
              <div className="w-full bg-base-300 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${evalData.emission_reduction_percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Column 3: Operational Recommendation */}
          <div className="bg-base-200/50 rounded-lg p-4 border border-base-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-base-content/70 mb-2">
                <Info className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                Diagnóstico &amp; Recomendação Técnica
              </div>
              <p className="text-xs text-base-content/85 leading-relaxed">
                {evalData.recommendation}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-base-300 text-[11px] text-base-content/60">
              Fontes: EPE Plano Nacional de Logística (I12), CONTRAN Res. 882/2021 (V10) e ANTT (V01).
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Highway Infrastructure & Autonomy Coverage Map */}
      <CorridorInfrastructureMap
        corridors={corridorsData.corridors}
        selectedCorridor={selectedCorridor}
        onSelectCorridor={handleCorridorChange}
        stations={stationsData.stations}
        brazilGeoJson={brazilGeoJson}
        viewportScope={viewportScope}
        onViewportScopeChange={setViewportScope}
        viewportTick={viewportTick}
        onFocusCorridor={() => {
          setViewportScope('corridor');
          setViewportTick((t) => t + 1);
        }}
      />
    </div>
  );
};
