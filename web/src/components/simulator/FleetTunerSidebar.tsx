import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { ResidualScenarioId } from '../../lib/calc/simulator';
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
  residualScenario: ResidualScenarioId;
  onResidualScenarioChange: (scenario: ResidualScenarioId) => void;
  includeCbio: boolean;
  onIncludeCbioChange: (enabled: boolean) => void;
  onResetAll: () => void;
  alteredCount: number;
}

export const FleetTunerSidebar: React.FC<FleetTunerSidebarProps> = ({
  params,
  fleetSize,
  onFleetSizeChange,
  onGeneralChange,
  onVehicleChange,
  residualScenario,
  onResidualScenarioChange,
  includeCbio,
  onIncludeCbioChange,
  onResetAll,
  alteredCount,
}) => {
  const [showVehicleDetails, setShowVehicleDetails] = useState(false);
  const [selectedAltTab, setSelectedAltTab] = useState<AlternativeId>('eletrico');

  const horizonYears = Math.round(params.general.horizon_years.value);
  const annualDistance = params.general.annual_distance_km.value;
  const discountRate = params.general.discount_rate.value;
  const biodieselBlend = params.general.biodiesel_blend.value;
  const arlaPrice = params.general.arla_price.value;
  const cbioPrice = params.general.cbio_price?.value ?? 102;

  const selectedVehicle = params.vehicles[selectedAltTab];

  const fuels: {
    alt: AlternativeId;
    label: string;
    unit: string;
    dotColor: string;
    step: number;
  }[] = [
    {
      alt: 'diesel',
      label: 'Diesel B15',
      unit: 'R$/L',
      dotColor: FUEL_THEME.diesel.dotClass,
      step: 0.05,
    },
    {
      alt: 'biometano',
      label: 'Biometano',
      unit: 'R$/m³',
      dotColor: FUEL_THEME.biometano.dotClass,
      step: 0.05,
    },
    {
      alt: 'eletrico',
      label: 'Energia Elétrica',
      unit: 'R$/kWh',
      dotColor: FUEL_THEME.eletrico.dotClass,
      step: 0.02,
    },
    {
      alt: 'gnv',
      label: 'GNV',
      unit: 'R$/m³',
      dotColor: FUEL_THEME.gnv.dotClass,
      step: 0.05,
    },
  ];

  return (
    <aside
      aria-label="Painel de controle e ajuste de parâmetros da frota"
      className="card bg-base-100 border-base-300/70 overflow-hidden rounded-xl border"
    >
      {/* Sidebar Header */}
      <div className="border-base-300/60 bg-base-200/35 flex items-center justify-between border-b px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="text-primary h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <h2 className="text-base-content text-sm font-bold">Parâmetros da Frota</h2>
        </div>

        <button
          type="button"
          onClick={onResetAll}
          disabled={
            alteredCount === 0 &&
            fleetSize === 1 &&
            residualScenario === 'base' &&
            !includeCbio
          }
          aria-label="Restaurar parâmetros para os padrões originais"
          className="btn btn-ghost btn-xs text-base-content/70 hover:text-base-content text-[11px]"
        >
          ↺ Padrão
        </button>
      </div>

      <div className="space-y-3 p-3.5 text-xs">
        {/* 1. Fleet Size Controller */}
        <div className="bg-base-200/45 border-base-300/60 rounded-lg border p-2.5">
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
              <span className="text-base-content/65 text-[11px]">un</span>
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
        </div>

        {/* 2. Annual Distance Controller */}
        <div className="bg-base-200/45 border-base-300/60 rounded-lg border p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="tuner-mileage"
                className="text-base-content text-xs font-semibold"
              >
                Distância Anual
              </label>
              <SourceRef
                id={params.general.annual_distance_km.source_id}
                context="Distância Anual"
              />
            </div>
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
              <span className="text-base-content/65 text-[11px]">km</span>
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
        </div>

        {/* 3. Economic Horizon & Discount Rate */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-base-200/45 border-base-300/60 rounded-lg border p-2.5">
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <span className="text-base-content/75 text-[11px] font-semibold">
                Horizonte
              </span>
              <SourceRef
                id={params.general.horizon_years.source_id}
                context="Horizonte Econômico"
              />
            </div>
            <div className="flex gap-1">
              {[5, 7, 10].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onGeneralChange('horizon_years', h)}
                  className={`flex-1 cursor-pointer rounded py-1 font-mono text-[11px] font-bold transition-colors ${
                    horizonYears === h
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-100 text-base-content/75 hover:bg-base-200'
                  }`}
                >
                  {h}a
                </button>
              ))}
            </div>
          </div>

          <div className="bg-base-200/45 border-base-300/60 flex flex-col justify-between rounded-lg border p-2.5">
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="text-base-content/75 text-[11px] font-semibold">
                Desconto
              </span>
              <SourceRef
                id={params.general.discount_rate.source_id}
                context="Taxa de Desconto"
              />
            </div>
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
              <span className="text-base-content/65 shrink-0 text-[11px]">% a.a.</span>
            </div>
          </div>
        </div>

        {/* 3b. Residual Value Scenario */}
        <div className="bg-base-200/45 border-base-300/60 rounded-lg border p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <span className="text-base-content/80 text-[11px] font-semibold">
              Cenário Residual
            </span>
            <SourceRef
              id={params.vehicles.diesel.residual_value_ratio.source_id}
              context="Cenário de Valor Residual"
            />
          </div>
          <div
            className="grid grid-cols-3 gap-1"
            role="group"
            aria-label="Cenário de valor residual"
          >
            {(
              [
                { id: 'low', label: 'Baixo (-15pp)' },
                { id: 'base', label: 'Base' },
                { id: 'high', label: 'Alto (+15pp)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onResidualScenarioChange(opt.id)}
                aria-pressed={residualScenario === opt.id}
                className={`cursor-pointer rounded py-1 text-[11px] font-bold transition-colors ${
                  residualScenario === opt.id
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-100 text-base-content/75 hover:bg-base-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Fuel & Energy Prices */}
        <div className="border-base-300/60 space-y-1.5 border-t pt-2.5">
          <span className="text-base-content/65 block text-[11px] font-bold tracking-wider uppercase">
            Preços de Energia
          </span>

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
                  className={`flex flex-col gap-1 rounded-lg border px-2.5 py-1.5 transition-colors ${
                    isOutOfRange
                      ? 'border-warning/50 bg-warning/10'
                      : 'border-base-300/60 bg-base-200/40 hover:bg-base-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${fuel.dotColor}`}
                      />
                      <span className="text-base-content truncate text-xs font-medium">
                        {fuel.label}
                      </span>
                      <SourceRef id={priceObj.source_id} context={fuel.label} />
                    </div>

                    <div className="bg-base-100 border-base-300 flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5">
                      <span className="text-base-content/65 font-mono text-[11px]">
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
                      <span className="text-base-content/65 font-mono text-[11px]">
                        {fuel.unit.replace('R$', '')}
                      </span>
                    </div>
                  </div>

                  {isOutOfRange && (
                    <div className="border-warning/30 text-warning flex items-center justify-between border-t pt-0.5 font-mono text-[11px]">
                      <span>Fora da ref. ANP/ANEEL</span>
                      <span>
                        [{minVal} – {maxVal}]
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Collapsible Truck Technical Details & Regulatory Inputs */}
        <div className="border-base-300/60 border-t pt-2">
          <button
            type="button"
            onClick={() => setShowVehicleDetails(!showVehicleDetails)}
            className="text-base-content/80 hover:text-primary flex w-full cursor-pointer items-center justify-between py-1 text-xs font-semibold transition-colors"
            aria-expanded={showVehicleDetails}
          >
            <span>CAPEX, Consumo &amp; Insumos</span>
            <span className="font-mono text-[11px]">
              {showVehicleDetails ? '▲ Fechar' : '▼ Ajustar'}
            </span>
          </button>

          {showVehicleDetails && (
            <div className="bg-base-200/35 border-base-300/60 mt-2 space-y-2 rounded-lg border p-2.5">
              {/* Powertrain mini tabs */}
              <div className="grid grid-cols-4 gap-1">
                {(['diesel', 'biometano', 'eletrico', 'gnv'] as AlternativeId[]).map(
                  (alt) => (
                    <button
                      key={alt}
                      type="button"
                      onClick={() => setSelectedAltTab(alt)}
                      className={`inline-flex cursor-pointer items-center justify-center gap-1 rounded py-1 text-[11px] font-bold uppercase transition-colors ${
                        selectedAltTab === alt
                          ? FUEL_THEME[alt].activeButtonClass
                          : 'bg-base-100 text-base-content/75 hover:bg-base-200'
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
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-base-content/75 text-[11px]">Aquisição (R$)</span>
                  <SourceRef
                    id={selectedVehicle.vehicle_purchase_price.source_id}
                    context={`Aquisição (${selectedVehicle.label})`}
                  />
                </div>
                <input
                  type="number"
                  step="20000"
                  value={selectedVehicle.vehicle_purchase_price.value}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val))
                      onVehicleChange(selectedAltTab, 'vehicle_purchase_price', val);
                  }}
                  className="bg-base-100 text-base-content border-base-300 w-24 shrink-0 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Consumption */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-base-content/75 text-[11px]">
                    Consumo ({selectedVehicle.consumption.unit})
                  </span>
                  <SourceRef
                    id={selectedVehicle.consumption.source_id}
                    context={`Consumo (${selectedVehicle.label})`}
                  />
                </div>
                <DecimalInput
                  step={0.1}
                  decimals={1}
                  min={0.1}
                  value={selectedVehicle.consumption.value}
                  onChange={(val) => {
                    if (val > 0) onVehicleChange(selectedAltTab, 'consumption', val);
                  }}
                  className="bg-base-100 text-base-content border-base-300 w-20 shrink-0 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Maintenance */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-base-content/75 text-[11px]">Manut. (R$/km)</span>
                  <SourceRef
                    id={selectedVehicle.maintenance_cost_per_km.source_id}
                    context={`Manutenção (${selectedVehicle.label})`}
                  />
                </div>
                <DecimalInput
                  step={0.05}
                  decimals={2}
                  min={0}
                  value={selectedVehicle.maintenance_cost_per_km.value}
                  onChange={(val) =>
                    onVehicleChange(selectedAltTab, 'maintenance_cost_per_km', val)
                  }
                  className="bg-base-100 text-base-content border-base-300 w-20 shrink-0 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Residual value */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-base-content/75 text-[11px]">
                    Residual (% V₀)
                  </span>
                  <SourceRef
                    id={selectedVehicle.residual_value_ratio.source_id}
                    context={`Valor Residual (${selectedVehicle.label})`}
                  />
                </div>
                <DecimalInput
                  step={5}
                  decimals={0}
                  min={(selectedVehicle.residual_value_ratio.min ?? 0) * 100}
                  max={(selectedVehicle.residual_value_ratio.max ?? 0.9) * 100}
                  value={selectedVehicle.residual_value_ratio.value * 100}
                  onChange={(pct) =>
                    onVehicleChange(selectedAltTab, 'residual_value_ratio', pct / 100)
                  }
                  className="bg-base-100 text-base-content border-base-300 w-20 shrink-0 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                />
              </div>

              {/* Charging efficiency (BEV only) */}
              {selectedVehicle.charging_efficiency && (
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-base-content/75 text-[11px]">
                      Efic. recarga (%)
                    </span>
                    <SourceRef
                      id={selectedVehicle.charging_efficiency.source_id}
                      context="Eficiência de Recarga"
                    />
                  </div>
                  <DecimalInput
                    step={1}
                    decimals={0}
                    min={(selectedVehicle.charging_efficiency.min ?? 0.5) * 100}
                    max={(selectedVehicle.charging_efficiency.max ?? 1) * 100}
                    value={selectedVehicle.charging_efficiency.value * 100}
                    onChange={(pct) =>
                      onVehicleChange(selectedAltTab, 'charging_efficiency', pct / 100)
                    }
                    className="bg-base-100 text-base-content border-base-300 w-20 shrink-0 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                  />
                </div>
              )}

              {/* ARLA & Biodiesel & CBIO globals */}
              <div className="border-base-300/60 space-y-2 border-t pt-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-base-content/75 text-[11px]">
                      ARLA 32 (R$/L)
                    </span>
                    <SourceRef
                      id={params.general.arla_price.source_id}
                      context="Preço ARLA 32"
                    />
                  </div>
                  <DecimalInput
                    step={0.1}
                    decimals={2}
                    min={params.general.arla_price.min ?? 1}
                    max={params.general.arla_price.max ?? 10}
                    value={arlaPrice}
                    onChange={(val) => onGeneralChange('arla_price', val)}
                    className="bg-base-100 text-base-content border-base-300 w-20 shrink-0 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-base-content/75 text-[11px]">
                      Biodiesel (% v/v)
                    </span>
                    <SourceRef
                      id={params.general.biodiesel_blend.source_id}
                      context="Teor de Biodiesel"
                    />
                  </div>
                  <DecimalInput
                    step={1}
                    decimals={0}
                    min={(params.general.biodiesel_blend.min ?? 0) * 100}
                    max={(params.general.biodiesel_blend.max ?? 0.4) * 100}
                    value={biodieselBlend * 100}
                    onChange={(pct) => onGeneralChange('biodiesel_blend', pct / 100)}
                    className="bg-base-100 text-base-content border-base-300 w-20 shrink-0 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="text-base-content/75 text-[11px] font-medium">
                      Sensibilidade CBIO (produtor)
                    </span>
                    <input
                      type="checkbox"
                      className="toggle toggle-xs toggle-primary"
                      checked={includeCbio}
                      onChange={(e) => onIncludeCbioChange(e.target.checked)}
                    />
                  </label>
                  {includeCbio && params.general.cbio_price && (
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-base-content/75 text-[11px]">
                          CBIO (R$/un)
                        </span>
                        <SourceRef
                          id={params.general.cbio_price.source_id}
                          context="Preço CBIO"
                        />
                      </div>
                      <DecimalInput
                        step={1}
                        decimals={0}
                        min={params.general.cbio_price.min ?? 20}
                        max={params.general.cbio_price.max ?? 300}
                        value={cbioPrice}
                        onChange={(val) => onGeneralChange('cbio_price', val)}
                        className="bg-base-100 text-base-content border-base-300 w-20 shrink-0 rounded border px-2 py-0.5 text-right font-mono text-xs font-bold focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
