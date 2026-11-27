import React from 'react';
import type { AlternativeId, VehicleParameters } from '../../lib/types/parameters';
import { formatCurrency, formatPercent } from '../../lib/utils/format';
import { ParameterControl } from './ParameterControl';

interface VehicleParametersPanelProps {
  alternativeId: AlternativeId;
  parameters: VehicleParameters;
  defaultParameters: VehicleParameters;
  dieselPurchasePrice: number;
  onChange: <K extends keyof VehicleParameters>(key: K, value: number) => void;
  onReset: <K extends keyof VehicleParameters>(key: K) => void;
}

export const VehicleParametersPanel: React.FC<VehicleParametersPanelProps> = ({
  alternativeId,
  parameters,
  defaultParameters,
  dieselPurchasePrice,
  onChange,
  onReset,
}) => {
  const currentPurchasePrice = parameters.vehicle_purchase_price.value;
  const isDiesel = alternativeId === 'diesel';
  const sobreprecoDiff = currentPurchasePrice - dieselPurchasePrice;
  const sobreprecoPct =
    dieselPurchasePrice > 0 ? (sobreprecoDiff / dieselPurchasePrice) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header and Sobrepreço derived display */}
      <div className="border-base-200 flex flex-col justify-between gap-3 border-b pb-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base-content text-base font-bold">{parameters.label}</h3>
          <p className="text-base-content/70 text-xs">
            Parâmetros técnicos, energéticos e de capital do cavalo mecânico.
          </p>
        </div>

        {/* Derived Sobrepreço Box */}
        <div className="bg-base-200/60 border-base-300/80 flex items-center gap-3 rounded-xl border p-2.5 sm:px-4">
          <div className="text-xs">
            <span className="text-base-content/60 block text-[10px] font-semibold tracking-wider uppercase">
              Sobrepreço vs. Diesel B (derivado)
            </span>
            <div className="text-base-content font-mono text-sm font-bold">
              {isDiesel ? (
                <span className="text-base-content/70">Referência (R$ 0)</span>
              ) : (
                <>
                  <span
                    className={
                      sobreprecoDiff > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-success'
                    }
                  >
                    {sobreprecoDiff > 0 ? '+' : ''}
                    {formatCurrency(sobreprecoDiff, 0)}
                  </span>
                  <span className="text-base-content/70 ml-1.5 text-xs font-normal">
                    ({formatPercent(sobreprecoPct, 1)})
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <ParameterControl
          id={`${alternativeId}-purchase-price`}
          label="Preço de aquisição do cavalo mecânico"
          item={parameters.vehicle_purchase_price}
          defaultItem={defaultParameters.vehicle_purchase_price}
          onChange={(val) => onChange('vehicle_purchase_price', val)}
          onReset={() => onReset('vehicle_purchase_price')}
        />

        <ParameterControl
          id={`${alternativeId}-energy-price`}
          label="Preço da energia / combustível"
          item={parameters.energy_price}
          defaultItem={defaultParameters.energy_price}
          onChange={(val) => onChange('energy_price', val)}
          onReset={() => onReset('energy_price')}
        />

        <ParameterControl
          id={`${alternativeId}-consumption`}
          label="Consumo operacional específico"
          item={parameters.consumption}
          defaultItem={defaultParameters.consumption}
          onChange={(val) => onChange('consumption', val)}
          onReset={() => onReset('consumption')}
        />

        <ParameterControl
          id={`${alternativeId}-energy-density`}
          label="Densidade energética (Poder Calorífico Inferior)"
          item={parameters.energy_density}
          defaultItem={defaultParameters.energy_density}
          onChange={(val) => onChange('energy_density', val)}
          onReset={() => onReset('energy_density')}
        />

        <ParameterControl
          id={`${alternativeId}-carbon-intensity`}
          label="Intensidade de carbono (Well-to-Wheel)"
          item={parameters.carbon_intensity}
          defaultItem={defaultParameters.carbon_intensity}
          onChange={(val) => onChange('carbon_intensity', val)}
          onReset={() => onReset('carbon_intensity')}
        />

        <ParameterControl
          id={`${alternativeId}-maintenance-cost`}
          label="Custo de manutenção e pneus"
          item={parameters.maintenance_cost_per_km}
          defaultItem={defaultParameters.maintenance_cost_per_km}
          onChange={(val) => onChange('maintenance_cost_per_km', val)}
          onReset={() => onReset('maintenance_cost_per_km')}
        />

        <ParameterControl
          id={`${alternativeId}-residual-value`}
          label="Fração de valor residual após o horizonte"
          item={parameters.residual_value_ratio}
          defaultItem={defaultParameters.residual_value_ratio}
          onChange={(val) => onChange('residual_value_ratio', val)}
          onReset={() => onReset('residual_value_ratio')}
        />

        {parameters.charging_efficiency && defaultParameters.charging_efficiency && (
          <ParameterControl
            id={`${alternativeId}-charging-efficiency`}
            label="Eficiência de recarga (rede AC para bateria)"
            item={parameters.charging_efficiency}
            defaultItem={defaultParameters.charging_efficiency}
            onChange={(val) => onChange('charging_efficiency', val)}
            onReset={() => onReset('charging_efficiency')}
          />
        )}

        {parameters.arla_consumption_ratio &&
          defaultParameters.arla_consumption_ratio && (
            <ParameterControl
              id={`${alternativeId}-arla-consumption`}
              label="Consumo de ARLA 32 em relação ao diesel"
              item={parameters.arla_consumption_ratio}
              defaultItem={defaultParameters.arla_consumption_ratio}
              onChange={(val) => onChange('arla_consumption_ratio', val)}
              onReset={() => onReset('arla_consumption_ratio')}
            />
          )}

        {parameters.payload_penalty_kg && defaultParameters.payload_penalty_kg && (
          <ParameterControl
            id={`${alternativeId}-payload-penalty`}
            label="Impacto na carga útil (Lei da Balança)"
            item={parameters.payload_penalty_kg}
            defaultItem={defaultParameters.payload_penalty_kg}
            onChange={(val) => onChange('payload_penalty_kg', val)}
            onReset={() => onReset('payload_penalty_kg')}
          />
        )}
      </div>
    </div>
  );
};
