import React from 'react';
import type { GeneralParameters } from '../../lib/types/parameters';
import { ParameterControl } from './ParameterControl';

interface GeneralParametersPanelProps {
  parameters: GeneralParameters;
  defaultParameters: GeneralParameters;
  onChange: <K extends keyof GeneralParameters>(key: K, value: number) => void;
  onReset: <K extends keyof GeneralParameters>(key: K) => void;
}

export const GeneralParametersPanel: React.FC<GeneralParametersPanelProps> = ({
  parameters,
  defaultParameters,
  onChange,
  onReset,
}) => {
  return (
    <div className="space-y-4">
      <div className="border-base-300/60 border-b pb-2">
        <h3 className="text-base-content text-sm font-bold">
          Premissas Globais e Operacionais
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <ParameterControl
          id="param-annual-distance"
          label="Distância anual percorrida"
          item={parameters.annual_distance_km}
          defaultItem={defaultParameters.annual_distance_km}
          onChange={(val) => onChange('annual_distance_km', val)}
          onReset={() => onReset('annual_distance_km')}
        />

        <ParameterControl
          id="param-horizon-years"
          label="Horizonte de análise econômica"
          item={parameters.horizon_years}
          defaultItem={defaultParameters.horizon_years}
          onChange={(val) => onChange('horizon_years', val)}
          onReset={() => onReset('horizon_years')}
        />

        <ParameterControl
          id="param-discount-rate"
          label="Taxa de desconto anual"
          item={parameters.discount_rate}
          defaultItem={defaultParameters.discount_rate}
          onChange={(val) => onChange('discount_rate', val)}
          onReset={() => onReset('discount_rate')}
        />

        <ParameterControl
          id="param-biodiesel-blend"
          label="Mandato de mistura de biodiesel"
          item={parameters.biodiesel_blend}
          defaultItem={defaultParameters.biodiesel_blend}
          onChange={(val) => onChange('biodiesel_blend', val)}
          onReset={() => onReset('biodiesel_blend')}
        />

        <ParameterControl
          id="param-diesel-fossil-ci"
          label="Intensidade de carbono: diesel fóssil"
          item={parameters.diesel_fossil_carbon_intensity}
          defaultItem={defaultParameters.diesel_fossil_carbon_intensity}
          onChange={(val) => onChange('diesel_fossil_carbon_intensity', val)}
          onReset={() => onReset('diesel_fossil_carbon_intensity')}
        />

        <ParameterControl
          id="param-biodiesel-ci"
          label="Intensidade de carbono: biodiesel"
          item={parameters.biodiesel_carbon_intensity}
          defaultItem={defaultParameters.biodiesel_carbon_intensity}
          onChange={(val) => onChange('biodiesel_carbon_intensity', val)}
          onReset={() => onReset('biodiesel_carbon_intensity')}
        />

        <ParameterControl
          id="param-arla-price"
          label="Preço do agente redutor (ARLA 32)"
          item={parameters.arla_price}
          defaultItem={defaultParameters.arla_price}
          onChange={(val) => onChange('arla_price', val)}
          onReset={() => onReset('arla_price')}
        />

        {parameters.cbio_price && defaultParameters.cbio_price && (
          <ParameterControl
            id="param-cbio-price"
            label="Cotação do CBIO (RenovaBio)"
            item={parameters.cbio_price}
            defaultItem={defaultParameters.cbio_price}
            onChange={(val) => onChange('cbio_price', val)}
            onReset={() => onReset('cbio_price')}
          />
        )}
      </div>
    </div>
  );
};
