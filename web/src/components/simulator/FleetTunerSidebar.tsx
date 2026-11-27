import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { ResidualScenarioId } from '../../lib/calc/simulator';
import { FUEL_THEME } from '../../lib/theme/fuels';
import type {
  AlternativeId,
  GeneralParameters,
  ParameterItem,
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

const ParamProvenance: React.FC<{ item: ParameterItem; label: string }> = ({
  item,
  label,
}) => {
  const badgeClass =
    item.badge === 'Primária'
      ? 'badge-success text-white'
      : item.badge === 'Adaptada'
        ? 'badge-info text-white'
        : 'badge-ghost border-base-300 text-base-content/75';

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`badge badge-xs px-1.5 text-[9px] font-medium ${badgeClass}`}
        title={`Selo metodológico: ${item.badge}`}
      >
        {item.badge}
      </span>
      <SourceRef id={item.source_id} context={label} />
    </span>
  );
};

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
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="tuner-mileage"
                className="text-base-content text-xs font-semibold"
              >
                Distância Anual
              </label>
              <ParamProvenance
                item={params.general.annual_distance_km}
                label="Distância Anual"
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
            <div className="mb-1.5 flex items-center justify-between gap-1">
              <span className="text-base-content/70 text-[10px] font-semibold">
                Horizonte
              </span>
              <ParamProvenance
                item={params.general.horizon_years}
                label="Horizonte Econômico"
              />
            </div>
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
            <div className="mb-1 flex items-center justify-between gap-1">
              <span className="text-base-content/70 text-[10px] font-semibold">
                Desconto
              </span>
              <ParamProvenance
                item={params.general.discount_rate}
                label="Taxa de Desconto"
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
              <span className="text-base-content/60 shrink-0 text-[10px]">% a.a.</span>
            </div>
          </div>
        </div>

        {/* 3b. Residual Value Scenario (§4.4) */}
        <div className="bg-base-200/40 border-base-200 rounded-xl border p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <span className="text-base-content/75 text-[10px] font-semibold">
              Cenário Residual (§4.4)
            </span>
            <ParamProvenance
              item={params.vehicles.diesel.residual_value_ratio}
              label="Cenário de Valor Residual"
            />
          </div>
          <div
            className="grid grid-cols-3 gap-1"
            role="group"
            aria-label="Cenário de valor residual"
          >
            {(
              [
                { id: 'low', label: 'Baixo (-15p.p.)' },
                { id: 'base', label: 'Base' },
                { id: 'high', label: 'Alto (+15p.p.)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onResidualScenarioChange(opt.id)}
                aria-pressed={residualScenario === opt.id}
                className={`rounded py-1 text-[10px] font-bold transition-colors ${
                  residualScenario === opt.id
                    ? 'bg-primary text-primary-content shadow-xs'
                    : 'bg-base-100 text-base-content/70 hover:bg-base-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
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
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${fuel.dotColor}`}></span>
                      <span className="text-base-content text-xs font-medium">
                        {fuel.label}
                      </span>
                      <ParamProvenance item={priceObj} label={fuel.label} />
                    </div>

                    <div className="bg-base-100 border-base-300 flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5">
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

        {/* 5. Collapsible Truck Technical Details & Regulatory Inputs */}
        <div className="border-base-200 border-t pt-2.5">
          <button
            type="button"
            onClick={() => setShowVehicleDetails(!showVehicleDetails)}
            className="text-base-content/70 hover:text-primary flex w-full items-center justify-between py-1 text-xs font-semibold transition-colors"
            aria-expanded={showVehicleDetails}
          >
            <span>CAPEX, Residual, Eficiência &amp; Insumos</span>
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
              <div className="flex items-center justify-between gap-1">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-base-content/70 text-[11px]">
                    Aquisição (R$):
                  </span>
                  <ParamProvenance
                    item={selectedVehicle.vehicle_purchase_price}
                    label={`Aquisição (${selectedVehicle.label})`}
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
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-base-content/70 text-[11px]">
                    Consumo ({selectedVehicle.consumption.unit}):
                  </span>
                  <ParamProvenance
                    item={selectedVehicle.consumption}
                    label={`Consumo (${selectedVehicle.label})`}
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
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-base-content/70 text-[11px]">
                    Manut. (R$/km):
                  </span>
                  <ParamProvenance
                    item={selectedVehicle.maintenance_cost_per_km}
                    label={`Manutenção (${selectedVehicle.label})`}
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
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-base-content/70 text-[11px]">
                    Residual (% V₀):
                  </span>
                  <ParamProvenance
                    item={selectedVehicle.residual_value_ratio}
                    label={`Valor Residual (${selectedVehicle.label})`}
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
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-base-content/70 text-[11px]">
                      Efic. recarga (%):
                    </span>
                    <ParamProvenance
                      item={selectedVehicle.charging_efficiency}
                      label="Eficiência de Recarga"
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
              <div className="border-base-200 space-y-2 border-t pt-2">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-base-content/70 text-[11px]">
                      ARLA 32 (R$/L):
                    </span>
                    <ParamProvenance
                      item={params.general.arla_price}
                      label="Preço ARLA 32"
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
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-base-content/70 text-[11px]">
                      Biodiesel (% v/v):
                    </span>
                    <ParamProvenance
                      item={params.general.biodiesel_blend}
                      label="Teor de Biodiesel"
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
                      className="toggle toggle-xs toggle-success"
                      checked={includeCbio}
                      onChange={(e) => onIncludeCbioChange(e.target.checked)}
                    />
                  </label>
                  {includeCbio && params.general.cbio_price && (
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-base-content/70 text-[11px]">
                          CBIO (R$/un):
                        </span>
                        <ParamProvenance
                          item={params.general.cbio_price}
                          label="Preço CBIO"
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
