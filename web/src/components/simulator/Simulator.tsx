import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import {
  applyResidualScenario,
  getParameterWarnings,
  simulate,
  simulateResidualSensitivity,
  type ResidualScenarioId,
} from '../../lib/calc';
import { setSharedSimulationParams } from '../../lib/calc/paramsStore';
import type {
  AlternativeId,
  GeneralParameters,
  SimulationParameters,
  VehicleParameters,
} from '../../lib/types/parameters';
import type { PricesHistory } from '../../lib/types/prices';
import { FUEL_THEME } from '../../lib/theme/fuels';
import { useDebouncedValue } from '../../lib/utils/useDebouncedValue';
import { TransparencyDisclaimer } from '../common/TransparencyDisclaimer';
import { FleetImpactBanner } from './FleetImpactBanner';
import { FleetTunerSidebar } from './FleetTunerSidebar';
import { GeneralParametersPanel } from './GeneralParametersPanel';
import { ResultCards } from './ResultCards';
import { ScenarioPresets } from './ScenarioPresets';
import { VehicleParametersPanel } from './VehicleParametersPanel';
import { PaybackTimelineChart } from './charts/PaybackTimelineChart';
import { PriceHistoryChart } from './charts/PriceHistoryChart';
import { TcoComparisonChart } from './charts/TcoComparisonChart';

interface SimulatorProps {
  defaults: SimulationParameters;
  pricesHistory?: PricesHistory;
  showDisclaimer?: boolean;
}

type AdvancedTabId = 'general' | AlternativeId;

export const Simulator: React.FC<SimulatorProps> = ({
  defaults,
  pricesHistory,
  showDisclaimer = true,
}) => {
  // Deep clone defaults to avoid in-place mutations
  const [params, setParams] = useState<SimulationParameters>(() =>
    JSON.parse(JSON.stringify(defaults))
  );

  useEffect(() => {
    setSharedSimulationParams(params);
  }, [params]);

  const [activePresetId, setActivePresetId] = useState<string>('default');
  const [fleetSize, setFleetSize] = useState<number>(1);
  const [includeCbio, setIncludeCbio] = useState<boolean>(false);
  const [residualScenario, setResidualScenario] = useState<ResidualScenarioId>('base');
  const [advancedTab, setAdvancedTab] = useState<AdvancedTabId>('general');

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

  const effectiveParams = useMemo(
    () => applyResidualScenario(params, residualScenario),
    [params, residualScenario]
  );

  // Derived simulation results & Methodology §4.4 residual sensitivity band
  const { results, residualBand, simulationWarnings, simulationError } = useMemo(() => {
    try {
      const warnings = getParameterWarnings(effectiveParams);
      const res = simulate(effectiveParams, { includeCbio });
      const sensitivity = simulateResidualSensitivity(params, { includeCbio });
      const band = {
        diesel: {
          lowTco: sensitivity.low.diesel.tco,
          highTco: sensitivity.high.diesel.tco,
        },
        gnv: {
          lowTco: sensitivity.low.gnv.tco,
          highTco: sensitivity.high.gnv.tco,
        },
        biometano: {
          lowTco: sensitivity.low.biometano.tco,
          highTco: sensitivity.high.biometano.tco,
        },
        eletrico: {
          lowTco: sensitivity.low.eletrico.tco,
          highTco: sensitivity.high.eletrico.tco,
        },
      };
      return {
        results: res,
        residualBand: band,
        simulationWarnings: warnings,
        simulationError: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro no cálculo da simulação';
      return {
        results: null,
        residualBand: undefined,
        simulationWarnings: [],
        simulationError: message,
      };
    }
  }, [params, effectiveParams, includeCbio]);

  const debouncedWarnings = useDebouncedValue(simulationWarnings, 600);
  const liveWarningsText =
    debouncedWarnings.length > 0
      ? `Cenário de sensibilidade: ${debouncedWarnings.join('; ')}`
      : '';

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

  const handleGeneralReset = <K extends keyof GeneralParameters>(key: K) => {
    const defaultItem = defaults.general[key];
    if (!defaultItem) return;
    handleGeneralChange(key, defaultItem.value);
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

  const handleVehicleReset = <K extends keyof VehicleParameters>(
    alt: AlternativeId,
    key: K
  ) => {
    const defaultField = defaults.vehicles[alt]?.[key];
    if (defaultField && typeof defaultField === 'object' && 'value' in defaultField) {
      handleVehicleChange(alt, key, defaultField.value);
    }
  };

  // Global Reset handler
  const handleResetAll = () => {
    setParams(JSON.parse(JSON.stringify(defaults)));
    setActivePresetId('default');
    setFleetSize(1);
    setIncludeCbio(false);
    setResidualScenario('base');
  };

  // Vehicle acquisition prices for card deltas
  const vehiclePurchasePrices: Record<AlternativeId, number> = {
    diesel: effectiveParams.vehicles.diesel.vehicle_purchase_price.value,
    gnv: effectiveParams.vehicles.gnv.vehicle_purchase_price.value,
    biometano: effectiveParams.vehicles.biometano.vehicle_purchase_price.value,
    eletrico: effectiveParams.vehicles.eletrico.vehicle_purchase_price.value,
  };
  const dieselPurchasePrice = vehiclePurchasePrices.diesel;

  // Energy prices for cards
  const energyPrices: Record<AlternativeId, { value: number; unit: string }> = {
    diesel: {
      value: effectiveParams.vehicles.diesel.energy_price.value,
      unit: effectiveParams.vehicles.diesel.energy_price.unit,
    },
    biometano: {
      value: effectiveParams.vehicles.biometano.energy_price.value,
      unit: effectiveParams.vehicles.biometano.energy_price.unit,
    },
    eletrico: {
      value: effectiveParams.vehicles.eletrico.energy_price.value,
      unit: effectiveParams.vehicles.eletrico.energy_price.unit,
    },
    gnv: {
      value: effectiveParams.vehicles.gnv.energy_price.value,
      unit: effectiveParams.vehicles.gnv.energy_price.unit,
    },
  };

  return (
    <div className="mt-4 space-y-5">
      {/* 1. Quick 1-Click Operational Presets */}
      <section aria-label="Cenários Rápidos de Operação">
        <ScenarioPresets
          defaults={defaults}
          onApplyPreset={handleApplyPreset}
          activePresetId={activePresetId}
        />
      </section>

      {/* Screen-reader debounced warnings announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        {liveWarningsText}
      </div>

      {/* Mild Warning for Out-of-Bound Sensitivity Scenarios */}
      {simulationWarnings && simulationWarnings.length > 0 && (
        <div className="border-warning/40 bg-warning/10 flex items-start gap-2.5 rounded-xl border p-3 text-xs">
          <TriangleAlert
            className="text-warning mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <div className="space-y-0.5">
            <span className="text-base-content block font-semibold">
              Parâmetro fora da faixa de referência
            </span>
            <ul className="text-base-content/80 list-inside list-disc space-y-0.5 text-[11px]">
              {simulationWarnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Fatal Calculation Error Alert if any */}
      {simulationError && (
        <div role="alert" className="alert alert-error rounded-xl text-xs">
          <span className="font-bold">Erro no cálculo:</span>
          <span>{simulationError}</span>
        </div>
      )}

      {/* 2. TOP KPI CARDS */}
      {results && (
        <section aria-label="Métricas Comparativas por Trem de Força">
          <ResultCards
            results={results}
            dieselPurchasePrice={dieselPurchasePrice}
            vehiclePurchasePrices={vehiclePurchasePrices}
            energyPrices={energyPrices}
            residualBand={residualBand}
          />
        </section>
      )}

      {/* 3. Main Workspace: Tuner Sidebar (Left 4 cols) + Analytics & Charts (Right 8 cols) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12 xl:items-start">
        {/* LEFT COLUMN: Fleet Parameters Tuner */}
        <div className="xl:sticky xl:top-18 xl:col-span-4">
          <FleetTunerSidebar
            params={params}
            fleetSize={fleetSize}
            onFleetSizeChange={setFleetSize}
            onGeneralChange={handleGeneralChange}
            onVehicleChange={handleVehicleChange}
            residualScenario={residualScenario}
            onResidualScenarioChange={setResidualScenario}
            includeCbio={includeCbio}
            onIncludeCbioChange={setIncludeCbio}
            onResetAll={handleResetAll}
            alteredCount={alteredCount}
          />
        </div>

        {/* RIGHT COLUMN: Fleet Impact Banner + Interactive Charts */}
        <div className="space-y-5 xl:col-span-8">
          {results && (
            <>
              <FleetImpactBanner
                results={results}
                params={effectiveParams}
                fleetSize={fleetSize}
              />

              <div className="space-y-5">
                <TcoComparisonChart
                  results={results}
                  horizonYears={Math.round(effectiveParams.general.horizon_years.value)}
                  fleetSize={fleetSize}
                />

                <PaybackTimelineChart
                  results={results}
                  params={effectiveParams}
                  fleetSize={fleetSize}
                />

                {pricesHistory && <PriceHistoryChart pricesHistory={pricesHistory} />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Full Editable Parameter Panels with Badges & Sources */}
      <section aria-label="Editor Avançado de Premissas e Proveniência">
        <details className="card bg-base-100 border-base-300/70 group overflow-hidden rounded-xl border">
          <summary className="hover:bg-base-200/40 flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors select-none">
            <div className="flex items-center gap-2.5">
              <span className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <h2 className="text-base-content text-sm font-bold">
                Parâmetros Completos, Selos de Qualidade e Fontes
              </h2>
            </div>
            <ChevronDown
              className="text-base-content/70 h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>

          <div className="border-base-300/60 space-y-4 border-t p-4">
            <div
              className="flex flex-wrap gap-1.5"
              role="tablist"
              aria-label="Categorias de parâmetros do simulador"
            >
              {(
                [
                  { id: 'general', label: 'Globais & Operação' },
                  { id: 'diesel', label: 'Diesel B15' },
                  { id: 'biometano', label: 'Biometano' },
                  { id: 'eletrico', label: 'Elétrico (BEV)' },
                  { id: 'gnv', label: 'GNV' },
                ] as const
              ).map((tab) => {
                const isActive = advancedTab === tab.id;
                const fuelTheme = tab.id !== 'general' ? FUEL_THEME[tab.id] : null;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setAdvancedTab(tab.id)}
                    className={`btn btn-xs gap-1.5 ${
                      isActive
                        ? fuelTheme
                          ? fuelTheme.activeButtonClass
                          : 'btn-primary'
                        : 'btn-outline border-base-300'
                    }`}
                  >
                    {fuelTheme && (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isActive ? 'bg-white' : fuelTheme.dotClass
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {advancedTab === 'general' ? (
              <GeneralParametersPanel
                parameters={params.general}
                defaultParameters={defaults.general}
                onChange={handleGeneralChange}
                onReset={handleGeneralReset}
              />
            ) : (
              <VehicleParametersPanel
                alternativeId={advancedTab}
                parameters={params.vehicles[advancedTab]}
                defaultParameters={defaults.vehicles[advancedTab]}
                dieselPurchasePrice={params.vehicles.diesel.vehicle_purchase_price.value}
                onChange={(key, val) => handleVehicleChange(advancedTab, key, val)}
                onReset={(key) => handleVehicleReset(advancedTab, key)}
              />
            )}
          </div>
        </details>
      </section>

      {/* 5. Methodology §10 Transparency Disclaimers near results */}
      {showDisclaimer && (
        <section aria-label="Transparência e Limitações Metodológicas">
          <TransparencyDisclaimer />
        </section>
      )}
    </div>
  );
};

export default Simulator;
