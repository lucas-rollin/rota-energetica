import React, { useMemo } from 'react';
import { Info } from 'lucide-react';
import { FUEL_THEME } from '../../lib/theme/fuels';
import type { CorridorsCatalog } from '../../lib/types/catalogs';
import { formatNumber } from '../../lib/utils/format';
import { SourceRef } from '../common/SourceRef';
import { useSharedCorridorSelection } from './corridorSelection';

interface CorridorsDashboardProps {
  corridorsData: CorridorsCatalog;
}

const POWERTRAIN_ROWS = [
  { id: 'biometano', label: 'Biometano' },
  { id: 'eletrico', label: 'Elétrico (BEV)' },
  { id: 'diesel', label: 'Diesel B15' },
] as const;

const REFERENCE_METRICS_NOTE =
  'Classificação baseada nos parâmetros padrão de referência (Bio-GNC 650 km · BEV 350 km), podendo divergir da cobertura personalizada exibida no mapa.';

export const CorridorsDashboard: React.FC<CorridorsDashboardProps> = ({
  corridorsData,
}) => {
  const defaultCorridorId = corridorsData.corridors[0]?.id ?? 'rondonopolis-santos';
  const [selectedCorridorId] = useSharedCorridorSelection(defaultCorridorId);

  const selectedCorridor = useMemo(() => {
    return (
      corridorsData.corridors.find((c) => c.id === selectedCorridorId) ??
      corridorsData.corridors[0]
    );
  }, [corridorsData, selectedCorridorId]);

  return (
    <div className="bg-base-100 border-base-300/70 space-y-3 rounded-xl border p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Column 1: Corridor Physical Profile */}
        <div className="bg-base-200/45 border-base-300/70 space-y-2.5 rounded-lg border p-3.5 lg:col-span-5">
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
            <div className="text-right">
              <span className="text-primary block font-mono text-sm font-black">
                {formatNumber(selectedCorridor.distance_km, 0)} km
              </span>
              <span className="text-base-content/65 block text-[11px]">
                {selectedCorridor.typical_pbtc}
              </span>
            </div>
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

        {/* Column 2: Reference Operational Comparison by Powertrain */}
        <div className="border-base-300/70 overflow-hidden rounded-lg border lg:col-span-7">
          <div className="overflow-x-auto">
            <table className="table-xs sm:table-sm table w-full">
              <thead>
                <tr className="bg-base-200/50 border-base-300/70 text-base-content/70 border-b text-[11px] font-semibold uppercase">
                  <th>Tecnologia</th>
                  <th>
                    <span className="inline-flex items-center gap-1">
                      <span>Viabilidade (Ref.)</span>
                      <span
                        tabIndex={0}
                        role="note"
                        title={REFERENCE_METRICS_NOTE}
                        aria-label={REFERENCE_METRICS_NOTE}
                        className="text-base-content/60 hover:text-primary focus-visible:text-primary inline-flex cursor-help items-center focus:outline-none"
                      >
                        <Info className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </span>
                  </th>
                  <th>Abastecimento</th>
                  <th className="text-right">Carga Útil</th>
                  <th className="text-right">CO₂ vs. Diesel</th>
                </tr>
              </thead>
              <tbody className="divide-base-300/50 divide-y text-xs">
                {POWERTRAIN_ROWS.map((row) => {
                  const evalData = selectedCorridor.powertrain_evaluations[row.id];
                  if (!evalData) return null;
                  const theme = FUEL_THEME[row.id];

                  return (
                    <tr key={row.id} className="hover:bg-base-200/35">
                      <td className="font-semibold whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${theme.dotClass}`}
                            aria-hidden="true"
                          />
                          <span className="text-base-content">{row.label}</span>
                        </span>
                      </td>
                      <td className="text-base-content/85 font-medium">
                        {evalData.feasibility_label}
                      </td>
                      <td>
                        <span className="text-base-content font-mono font-semibold">
                          ~{evalData.refuel_time_minutes} min
                        </span>
                        <span className="text-base-content/65 block text-[11px]">
                          {evalData.stops_description}
                        </span>
                      </td>
                      <td className="text-right font-mono whitespace-nowrap">
                        <span
                          className={
                            evalData.payload_penalty_kg < 0
                              ? 'text-warning font-semibold'
                              : 'text-base-content/80'
                          }
                        >
                          {evalData.payload_penalty_kg > 0 ? '+' : ''}
                          {formatNumber(evalData.payload_penalty_kg, 0)} kg
                        </span>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span className={`font-mono font-bold ${theme.textClass}`}>
                            {evalData.emission_reduction_percent > 0
                              ? `-${formatNumber(evalData.emission_reduction_percent, 1)}%`
                              : '0%'}
                          </span>
                          <div className="bg-base-300/80 h-1.5 w-16 overflow-hidden rounded-full">
                            <div
                              className={`h-full ${theme.barClass}`}
                              style={{
                                width: `${Math.max(0, Math.min(100, evalData.emission_reduction_percent))}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Compact Attribution Footer */}
      <div className="border-base-300/60 text-base-content/65 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5 text-[11px]">
        <span>
          Fontes: EPE <SourceRef id="I12" context="Corredores Logísticos (PNL 2035)" /> ·
          CONTRAN <SourceRef id="V10" context="Lei da Balança / Tolerância PBTC" /> · ANTT{' '}
          <SourceRef id="V01" context="Piso Mínimo de Frete Rodoviário" />
        </span>
        <span>
          Classificação de viabilidade baseada nas autonomias padrão (Bio-GNC 650 km · BEV
          350 km).
        </span>
      </div>
    </div>
  );
};
