import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { FUEL_THEME } from '../../lib/theme/fuels';
import type {
  AlternativeId,
  GeneralParameters,
  SimulationParameters,
  VehicleParameters,
} from '../../lib/types/parameters';
import { DecimalInput } from '../common/DecimalInput';
import { SourceRef } from '../common/SourceRef';

interface FleetTunerSidebarProps {
  params: SimulationParameters;
  fleetSize: number;
  onFleetSizeChange: (size: number) => void;
  onGeneralChange: <K extends keyof GeneralParameters>(key: K, value: number) => void;
  onVehicleChange: <K extends keyof VehicleParameters>(
    alt: AlternativeId,
    key: K,
    value: number
  ) => void;
  onResetAll: () => void;
  alteredCount: number;
}

export const FleetTunerSidebar: React.FC<FleetTunerSidebarProps> = ({
  params,
  fleetSize,
  onFleetSizeChange,
  onGeneralChange,
  onVehicleChange,
  onResetAll,
  alteredCount,
}) => {
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [selectedAltTab, setSelectedAltTab] = useState<AlternativeId>('eletrico');

  const horizonYears = Math.round(params.general.horizon_years.value);
  const annualDistance = params.general.annual_distance_km.value;
  const discountRate = params.general.discount_rate.value;

  const fuels: {
    alt: AlternativeId;
    label: string;
    unit: string;
    dotColor: string;
    sourceId: string;
    step: number;
  }[] = [
    {
      alt: 'diesel',
      label: 'Diesel B15',
      unit: 'R$/L',
      dotColor: FUEL_THEME.diesel.dotClass,
      sourceId: params.vehicles.diesel.energy_price.source_id,
      step: 0.05,
    },
    {
      alt: 'biometano',
      label: 'Biometano',
      unit: 'R$/m³',
      dotColor: FUEL_THEME.biometano.dotClass,
      sourceId: params.vehicles.biometano.energy_price.source_id,
      step: 0.05,
    },
    {
      alt: 'eletrico',
      label: 'Energia Elétrica',
      unit: 'R$/kWh',
      dotColor: FUEL_THEME.eletrico.dotClass,
      sourceId: params.vehicles.eletrico.energy_price.source_id,
      step: 0.02,
    },
    {
      alt: 'gnv',
      label: 'GNV',
      unit: 'R$/m³',
      dotColor: FUEL_THEME.gnv.dotClass,
      sourceId: params.vehicles.gnv.energy_price.source_id,
      step: 0.05,
    },
  ];

  return (
    <aside
      aria-label="Painel de controle e ajuste de parâmetros da frota"
      className="card bg-base-100 border-base-200 overflow-hidden rounded-2xl border shadow-sm"
    >
      {/* Sidebar Header */}
      <div className="border-base-200 bg-base-200/30 flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="text-primary h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <h2 className="text-base-content text-sm font-bold sm:text-base">
            Parâmetros da Frota
          </h2>
        </div>

        <button
          type="button"
          onClick={onResetAll}
          disabled={alteredCount === 0 && fleetSize === 1}
          aria-label="Restaurar parâmetros para os padrões originais"
          className="btn btn-ghost btn-xs text-base-content/70 hover:text-base-content text-[11px]"
        >
          ↺ Padrão
        </button>
      </div>

      <div className="space-y-4 p-4 text-xs">
        {/* 1. Fleet Size Controller */}
        <div className="bg-base-200/40 border-base-200 rounded-xl border p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="tuner-fleet-size"
              className="text-base-content text-xs font-semibold"
            >
              Tamanho da Frota
            </label>
            <div className="bg-base-100 border-base-300 flex items-center gap-1 rounded border px-2 py-0.5">
              <input
                id="tuner-fleet-size"
                type="number"
                min="1"
                max="300"
                value={fleetSize}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onFleetSizeChange(isNaN(val) || val < 1 ? 1 : val);
                }}
                className="text-base-content w-10 bg-transparent text-right font-mono font-bold focus:outline-none"
              />
              <span className="text-base-content/60 text-[10px]">un</span>
            </div>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={fleetSize}
            onChange={(e) => onFleetSizeChange(parseInt(e.target.value, 10))}
            className="range range-primary range-xs w-full"
            aria-label="Tamanho da frota em número de cavalos mecânicos"
          />
          <div className="text-base-content/50 mt-0.5 flex justify-between text-[10px]">
            <span>1 un</span>
            <span>Frota Dedicada</span>
            <span>100+ un</span>
          </div>
        </div>

        {/* 2. Annual Distance Controller */}
        <div className="bg-base-200/40 border-base-200 rounded-xl border p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <label
              htmlFor="tuner-mileage"
              className="text-base-content text-xs font-semibold"
            >
              Distância Anual
            </label>
            <div className="bg-base-100 border-base-300 flex items-center gap-1 rounded border px-2 py-0.5">
              <input
                id="tuner-mileage"
                type="number"
                min="20000"
                max="220000"
                step="5000"
                value={annualDistance}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) onGeneralChange('annual_distance_km', val);
                }}
                className="text-base-content w-16 bg-transparent text-right font-mono font-bold focus:outline-none"
              />
              <span className="text-base-content/60 text-[10px]">km</span>
            </div>
          </div>
          <input
            type="range"
            min="30000"
            max="180000"
            step="5000"
            value={annualDistance}
            onChange={(e) =>
              onGeneralChange('annual_distance_km', parseFloat(e.target.value))
            }
            className="range range-primary range-xs w-full"
            aria-label="Quilometragem média anual por caminhão"
          />
          <div className="text-base-content/50 mt-0.5 flex justify-between text-[10px]">
            <span>Regional (40k)</span>
            <span>Padrão (120k)</span>
            <span>Longo Curso (180k)</span>
          </div>
        </div>

        {/* 3. Economic Horizon & Discount Rate */}
        <div className="grid grid-cols-2 gap-2">
          {/* Horizon Pills */}
          <div className="bg-base-200/40 border-base-200 rounded-xl border p-2.5">
            <span className="text-base-content/70 mb-1.5 block text-[10px] font-semibold">
              Horizonte
            </span>
            <div className="flex gap-1">
              {[5, 7, 10].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onGeneralChange('horizon_years', h)}
                  className={`flex-1 rounded py-1 font-mono text-[11px] font-bold transition-colors ${
                    horizonYears === h
                      ? 'bg-primary text-primary-content shadow-xs'
                      : 'bg-base-100 text-base-content/70 hover:bg-base-200'
                  }`}
                >
                  {h}a
                </button>
              ))}
            </div>
          </div>

          {/* Discount Rate */}
          <div className="bg-base-200/40 border-base-200 flex flex-col justify-between rounded-xl border p-2.5">
            <span className="text-base-content/70 mb-1 block text-[10px] font-semibold">
              Taxa Desconto
            </span>
            <div className="bg-base-100 border-base-300 flex items-center justify-end gap-1 rounded border px-2 py-1">
              <DecimalInput
                step={0.5}
                decimals={1}
                min={(params.general.discount_rate.min ?? 0) * 100}
                max={(params.general.discount_rate.max ?? 0.3) * 100}
                value={discountRate * 100}
                onChange={(pct) => {
                  const minFrac = params.general.discount_rate.min ?? 0;
                  const maxFrac = params.general.discount_rate.max ?? 0.3;
                  const clamped = Math.min(maxFrac, Math.max(minFrac, pct / 100));
                  onGeneralChange('discount_rate', clamped);
                }}
                className="text-base-content min-w-0 flex-1 bg-transparent text-right font-mono font-bold focus:outline-none"
                aria-label="Taxa de desconto anual real (% a.a.)"
              />
              <span className="text-base-content/60 shrink-0 text-[10px]">% a.a.</span>
            </div>
          </div>
        </div>

        {/* 4. Fuel & Energy Prices (Dense List) */}
        <div className="border-base-200 space-y-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base-content/60 text-[10px] font-bold tracking-wider uppercase">
              Preços de Mercado (Bomba / Insumos)
            </span>
          </div>

          <div className="space-y-1.5">
            {fuels.map((fuel) => {
              const priceObj = params.vehicles[fuel.alt].energy_price;
              const currentVal = priceObj.value;
              const minVal = priceObj.min;
              const maxVal = priceObj.max;
              const isOutOfRange =
                (minVal !== undefined && currentVal < minVal) ||
                (maxVal !== undefined && currentVal > maxVal);

              return (
                <div
                  key={fuel.alt}
                  className={`border-base-200 flex flex-col gap-1 rounded-lg border p-2 transition-colors ${
                    isOutOfRange
                      ? 'border-amber-400/60 bg-amber-500/10'
                      : 'bg-base-200/40 hover:bg-base-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${fuel.dotColor}`}></span>
                      <span className="text-base-content text-xs font-medium">
                        {fuel.label}
                      </span>
                      <SourceRef id={fuel.sourceId} context={fuel.label} />
                    </div>

                    <div className="bg-base-100 border-base-300 flex items-center gap-1 rounded border px-1.5 py-0.5">
                      <span className="text-base-content/50 font-mono text-[10px]">
                        R$
                      </span>
                      <DecimalInput
                        step={fuel.step}
                        decimals={2}
                        min={0.01}
                        value={currentVal}
                        onChange={(val) => {
                          if (val > 0) {
                            onVehicleChange(fuel.alt, 'energy_price', val);
                          }
                        }}
                        className="text-base-content w-12 bg-transparent text-right font-mono text-xs font-bold focus:outline-none"
                        aria-label={`Preço do ${fuel.label}`}
                      />
                      <span className="text-base-content/60 font-mono text-[10px]">
                        {fuel.unit.replace('R$', '')}
                      </span>
                    </div>
                  </div>

                  {isOutOfRange && (
                    <div className="flex items-center justify-between border-t border-amber-300/30 pt-0.5 font-mono text-[10px] text-amber-700 dark:text-amber-300">
                      <span>Aviso: fora da ref. ANP/ANEEL</span>
                      <span>
                        [{minVal} - {maxVal}]
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Collapsible Truck Technical Details (CAPEX & Consumo) */}
        <div className="border-base-200 border-t pt-2.5">
          <button
            type="button"
            onClick={() => setShowVehicleDetails(!showVehicleDetails)}
            className="text-base-content/70 hover:text-primary flex w-full items-center justify-between py-1 text-xs font-semibold transition-colors"
            aria-expanded={showVehicleDetails}
          >
            <span>Preço do Caminhão (CAPEX) & Consumo</span>
            <span className="font-mono text-[10px]">
              {showVehicleDetails ? '▲ Fechar' : '▼ Ajustar'}
            </span>
          </button>

          {showVehicleDetails && (
            <div className="bg-base-200/30 border-base-200 mt-2.5 space-y-2.5 rounded-xl border p-2.5">
              {/* Powertrain mini tabs */}
              <div className="grid grid-cols-4 gap-1">
                {(['diesel', 'biometano', 'eletrico', 'gnv'] as AlternativeId[]).map(
                  (alt) => (
                    <button
                      key={alt}
                      type="button"
                      onClick={() => setSelectedAltTab(alt)}
                      className={`inline-flex items-center justify-center gap-1 rounded py-1 text-[10px] font-bold uppercase transition-colors ${
                        selectedAltTab === alt
                          ? FUEL_THEME[alt].activeButtonClass
                          : 'bg-base-100 text-base-content/70 hover:bg-base-200'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          selectedAltTab === alt ? 'bg-white' : FUEL_THEME[alt].dotClass
                        }`}
                        aria-hidden="true"
                      />
                      <span>
                        {alt === 'eletrico'
                          ? 'Elétr.'
                          : alt === 'biometano'
                            ? 'Bio'
                            : alt}
                      </span>
                    </button>
                  )
                )}
              </div>

              {/* Purchase price */}
              <div className="flex items-center justify-between">
                <span className="text-base-content/70 text-[11px]">Aquisição (R$):</span>
                <input
                  type="number"
                  step="20000"
                  value={params.vehicles[selectedAltTab].vehicle_purchase_price.value}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val))
                      onVehicleChange(selectedAltTab, 'vehicle_purchase_price', val);
                  }}
                  className="bg-base-100 text-base-content border-base-300 w-24 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Consumption */}
              <div className="flex items-center justify-between">
                <span className="text-base-content/70 text-[11px]">
                  Consumo ({params.vehicles[selectedAltTab].consumption.unit}):
                </span>
                <DecimalInput
                  step={0.1}
                  decimals={1}
                  min={0.1}
                  value={params.vehicles[selectedAltTab].consumption.value}
                  onChange={(val) => {
                    if (val > 0) onVehicleChange(selectedAltTab, 'consumption', val);
                  }}
                  className="bg-base-100 text-base-content border-base-300 w-20 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Maintenance */}
              <div className="flex items-center justify-between">
                <span className="text-base-content/70 text-[11px]">Manut. (R$/km):</span>
                <DecimalInput
                  step={0.05}
                  decimals={2}
                  min={0}
                  value={params.vehicles[selectedAltTab].maintenance_cost_per_km.value}
                  onChange={(val) =>
                    onVehicleChange(selectedAltTab, 'maintenance_cost_per_km', val)
                  }
                  className="bg-base-100 text-base-content border-base-300 w-20 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
