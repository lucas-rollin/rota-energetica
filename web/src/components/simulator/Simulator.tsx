import React, { useMemo, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { getSource } from '../../lib/data/sources';
import { getParameterWarnings, simulate } from '../../lib/calc';
import type {
  AlternativeId,
  GeneralParameters,
  SimulationParameters,
  VehicleParameters,
} from '../../lib/types/parameters';
import type { SourceItem } from '../../lib/types/sources';
import { FleetImpactBanner } from './FleetImpactBanner';
import { FleetTunerSidebar } from './FleetTunerSidebar';
import { ResultCards } from './ResultCards';
import { ScenarioPresets } from './ScenarioPresets';
import { SourceModal } from './SourceModal';
import { PaybackTimelineChart } from './charts/PaybackTimelineChart';
import { TcoComparisonChart } from './charts/TcoComparisonChart';

interface SimulatorProps {
  defaults: SimulationParameters;
}

export const Simulator: React.FC<SimulatorProps> = ({ defaults }) => {
  // Deep clone defaults to avoid in-place mutations
  const [params, setParams] = useState<SimulationParameters>(() =>
    JSON.parse(JSON.stringify(defaults))
  );

  const [activePresetId, setActivePresetId] = useState<string>('default');
  const [fleetSize, setFleetSize] = useState<number>(1);
  const [selectedSource, setSelectedSource] = useState<SourceItem | null>(null);
  const [selectedParamLabel, setSelectedParamLabel] = useState<string>('');

  // Count altered parameters
  const alteredCount = useMemo(() => {
    let count = 0;
    const gKeys = Object.keys(params.general) as (keyof GeneralParameters)[];
    for (const k of gKeys) {
      const currentVal = params.general[k]?.value;
      const defaultVal = defaults.general[k]?.value;
      if (
        currentVal !== undefined &&
        defaultVal !== undefined &&
        Math.abs(currentVal - defaultVal) > 1e-6
      ) {
        count++;
      }
    }
    const alts: AlternativeId[] = ['diesel', 'gnv', 'biometano', 'eletrico'];
    for (const alt of alts) {
      const v = params.vehicles[alt];
      const dv = defaults.vehicles[alt];
      if (!v || !dv) continue;
      const vKeys = Object.keys(v) as (keyof VehicleParameters)[];
      for (const vk of vKeys) {
        if (vk === 'label') continue;
        const currentItem = v[vk];
        const defaultItem = dv[vk];
        if (
          currentItem &&
          defaultItem &&
          typeof currentItem === 'object' &&
          'value' in currentItem &&
          'value' in defaultItem
        ) {
          if (Math.abs(currentItem.value - defaultItem.value) > 1e-6) {
            count++;
          }
        }
      }
    }
    return count;
  }, [params, defaults]);

  // Derived simulation results with useMemo and fallback safety
  const { results, simulationWarnings, simulationError } = useMemo(() => {
    try {
      const warnings = getParameterWarnings(params);
      const res = simulate(params);
      return { results: res, simulationWarnings: warnings, simulationError: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro no cálculo da simulação';
      return { results: null, simulationWarnings: [], simulationError: message };
    }
  }, [params]);

  // Handle Preset application
  const handleApplyPreset = (newParams: SimulationParameters, presetId: string) => {
    setParams(newParams);
    setActivePresetId(presetId);
  };

  // General parameters handler
  const handleGeneralChange = <K extends keyof GeneralParameters>(
    key: K,
    value: number
  ) => {
    setActivePresetId('custom');
    setParams((prev) => ({
      ...prev,
      general: {
        ...prev.general,
        [key]: {
          ...prev.general[key],
          value,
        },
      },
    }));
  };

  // Vehicle parameters handler
  const handleVehicleChange = <K extends keyof VehicleParameters>(
    alt: AlternativeId,
    key: K,
    value: number
  ) => {
    setActivePresetId('custom');
    setParams((prev) => {
      const currentVehicle = prev.vehicles[alt];
      const currentField = currentVehicle[key];
      if (typeof currentField !== 'object' || !('value' in currentField)) {
        return prev;
      }
      return {
        ...prev,
        vehicles: {
          ...prev.vehicles,
          [alt]: {
            ...currentVehicle,
            [key]: {
              ...currentField,
              value,
            },
          },
        },
      };
    });
  };

  // Global Reset handler
  const handleResetAll = () => {
    setParams(JSON.parse(JSON.stringify(defaults)));
    setActivePresetId('default');
    setFleetSize(1);
  };

  // Open source dialog
  const handleOpenSource = (sourceId: string, paramLabel: string) => {
    const src = getSource(sourceId);
    if (src) {
      setSelectedSource(src);
      setSelectedParamLabel(paramLabel);
    }
  };

  // Vehicle acquisition prices for card deltas
  const vehiclePurchasePrices: Record<AlternativeId, number> = {
    diesel: params.vehicles.diesel.vehicle_purchase_price.value,
    gnv: params.vehicles.gnv.vehicle_purchase_price.value,
    biometano: params.vehicles.biometano.vehicle_purchase_price.value,
    eletrico: params.vehicles.eletrico.vehicle_purchase_price.value,
  };
  const dieselPurchasePrice = vehiclePurchasePrices.diesel;

  // Energy prices for cards
  const energyPrices: Record<AlternativeId, { value: number; unit: string }> = {
    diesel: {
      value: params.vehicles.diesel.energy_price.value,
      unit: params.vehicles.diesel.energy_price.unit,
    },
    biometano: {
      value: params.vehicles.biometano.energy_price.value,
      unit: params.vehicles.biometano.energy_price.unit,
    },
    eletrico: {
      value: params.vehicles.eletrico.energy_price.value,
      unit: params.vehicles.eletrico.energy_price.unit,
    },
    gnv: {
      value: params.vehicles.gnv.energy_price.value,
      unit: params.vehicles.gnv.energy_price.unit,
    },
  };

  return (
    <div className="my-6 space-y-6">
      {/* 1. Quick 1-Click Operational Presets */}
      <section aria-label="Cenários Rápidos de Operação">
        <ScenarioPresets
          defaults={defaults}
          onApplyPreset={handleApplyPreset}
          activePresetId={activePresetId}
        />
      </section>

      {/* Mild Warning for Out-of-Bound Sensitivity Scenarios (Does not disrupt charts) */}
      {simulationWarnings && simulationWarnings.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 rounded-2xl p-3.5 shadow-xs flex items-start gap-3 text-xs"
        >
          <TriangleAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <span className="font-semibold block text-base-content">
              Cenário de Sensibilidade — Parâmetro fora da faixa de referência:
            </span>
            <ul className="list-disc list-inside text-base-content/80 text-[11px] space-y-0.5">
              {simulationWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
            <p className="text-[10px] text-base-content/60 pt-0.5">
              Os gráficos e métricas de TCO continuam sendo calculados e apresentados normalmente com base no valor personalizado.
            </p>
          </div>
        </div>
      )}

      {/* Fatal Calculation Error Alert if any */}
      {simulationError && (
        <div role="alert" className="alert alert-error rounded-2xl shadow-lg text-xs">
          <span className="font-bold">Erro no cálculo:</span>
          <span>{simulationError}</span>
        </div>
      )}

      {/* 2. TOP KPI CARDS (Full Width, Above Parameters like in Stitch) */}
      {results && (
        <section aria-label="Métricas Comparativas por Trem de Força">
          <ResultCards
            results={results}
            dieselPurchasePrice={dieselPurchasePrice}
            vehiclePurchasePrices={vehiclePurchasePrices}
            energyPrices={energyPrices}
          />
        </section>
      )}

      {/* 3. Main Workspace: Tuner Sidebar (Left 4 cols) + Analytics & Charts (Right 8 cols) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start">
        {/* LEFT COLUMN: Fleet Parameters Tuner */}
        <div className="xl:sticky xl:top-20 xl:col-span-4">
          <FleetTunerSidebar
            params={params}
            fleetSize={fleetSize}
            onFleetSizeChange={setFleetSize}
            onGeneralChange={handleGeneralChange}
            onVehicleChange={handleVehicleChange}
            onResetAll={handleResetAll}
            alteredCount={alteredCount}
            onOpenSource={handleOpenSource}
          />
        </div>

        {/* RIGHT COLUMN: Fleet Impact Banner + Interactive Charts + Global Context */}
        <div className="space-y-6 xl:col-span-8">
          {results && (
            <>
              {/* Fleet Impact Callout Banner */}
              <FleetImpactBanner
                results={results}
                params={params}
                fleetSize={fleetSize}
              />

              {/* Interactive Charts: TCO Stacked Breakdown & Payback Timeline */}
              <div className="space-y-6">
                <TcoComparisonChart
                  results={results}
                  horizonYears={Math.round(params.general.horizon_years.value)}
                  fleetSize={fleetSize}
                />

                <PaybackTimelineChart
                  results={results}
                  params={params}
                  fleetSize={fleetSize}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Native Source Details Modal Dialog */}
      <SourceModal
        source={selectedSource}
        paramLabel={selectedParamLabel}
        onClose={() => setSelectedSource(null)}
      />
    </div>
  );
};

export default Simulator;
