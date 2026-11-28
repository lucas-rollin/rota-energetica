import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { SimulationParameters } from '../../lib/types/parameters';

export interface ScenarioPreset {
  id: string;
  label: string;
  badge: string;
  description: string;
  apply: (defaults: SimulationParameters) => SimulationParameters;
}

interface ScenarioPresetsProps {
  defaults: SimulationParameters;
  onApplyPreset: (newParams: SimulationParameters, presetId: string) => void;
  activePresetId: string | null;
}

export const PRESETS: ScenarioPreset[] = [
  {
    id: 'default',
    label: 'Padrão SC',
    badge: '120k km/ano',
    description:
      'Operação média rodoviária em Santa Catarina com preços e parâmetros originais.',
    apply: (def) => JSON.parse(JSON.stringify(def)),
  },
  {
    id: 'long-haul',
    label: 'Longa Distância',
    badge: '140k km/ano',
    description:
      'Rotas rodoviárias intensivas (BR-101 / Grãos) onde a economia por km é maximizada.',
    apply: (def) => {
      const p = JSON.parse(JSON.stringify(def)) as SimulationParameters;
      p.general.annual_distance_km.value = 140000;
      return p;
    },
  },
  {
    id: 'regional',
    label: 'Regional',
    badge: '50k km/ano',
    description:
      'Operação de tiro curto com retorno diário à base e menor rodagem anual.',
    apply: (def) => {
      const p = JSON.parse(JSON.stringify(def)) as SimulationParameters;
      p.general.annual_distance_km.value = 50000;
      return p;
    },
  },
  {
    id: 'biomethane-agro',
    label: 'Agro / Usina',
    badge: 'Bio R$ 3,20/m³',
    description:
      'Operação sucroalcooleira ou de suinocultura com biometano próprio a preço de custo.',
    apply: (def) => {
      const p = JSON.parse(JSON.stringify(def)) as SimulationParameters;
      p.general.annual_distance_km.value = 110000;
      p.vehicles.biometano.energy_price.value = 3.2;
      return p;
    },
  },
];

export const ScenarioPresets: React.FC<ScenarioPresetsProps> = ({
  defaults,
  onApplyPreset,
  activePresetId,
}) => {
  return (
    <div className="bg-base-100 border-base-300/70 flex flex-col gap-2.5 rounded-xl border px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base-content/65 text-[11px] font-bold tracking-wider uppercase">
          Cenário
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.description}
                onClick={() => onApplyPreset(preset.apply(defaults), preset.id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-primary bg-primary text-primary-content'
                    : 'border-base-300/80 bg-base-100 text-base-content/85 hover:bg-base-200/70'
                }`}
                aria-pressed={isActive}
              >
                <span>{preset.label}</span>
                <span
                  className={`font-mono text-[11px] ${
                    isActive ? 'text-primary-content/85' : 'text-base-content/60'
                  }`}
                >
                  {preset.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activePresetId === 'custom' && (
        <span className="badge badge-outline badge-warning badge-sm gap-1 self-start text-[11px] font-medium sm:self-auto">
          <SlidersHorizontal className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Personalizado</span>
        </span>
      )}
    </div>
  );
};
