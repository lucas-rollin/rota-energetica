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
    label: 'Padrão SC (Referência)',
    badge: '100.000 km/ano',
    description:
      'Operação média rodoviária em Santa Catarina com preços e parâmetros originais.',
    apply: (def) => JSON.parse(JSON.stringify(def)),
  },
  {
    id: 'long-haul',
    label: 'Longa Distância / Corredor',
    badge: '140.000 km/ano',
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
    label: 'Distribuição Regional',
    badge: '50.000 km/ano',
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
    label: 'Agro / Usina de Biometano',
    badge: 'Biometano R$ 3,20/m³',
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
    <div className="card bg-base-100 border-base-200 overflow-hidden rounded-2xl border p-4 shadow-xs sm:p-5">
      <div className="flex flex-col justify-between gap-1 pb-3 sm:flex-row sm:items-center">
        <div>
          <span className="text-base-content/50 block text-[10px] font-bold tracking-wider uppercase">
            Cenários Rápidos em 1 Clique
          </span>
          <h2 className="text-base-content text-sm font-bold sm:text-base">
            Selecione um perfil de operação ou personalize os parâmetros abaixo
          </h2>
        </div>
        {activePresetId === 'custom' && (
          <span className="badge badge-outline badge-warning gap-1 self-start text-xs font-medium sm:self-auto">
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Cenário Personalizado</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset.apply(defaults), preset.id)}
              className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                isActive
                  ? 'border-primary bg-primary/5 ring-primary/30 ring-2'
                  : 'border-base-200 bg-base-100 hover:border-base-300 hover:bg-base-200/40'
              }`}
              aria-pressed={isActive}
            >
              <div>
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span className="text-base-content text-xs font-bold sm:text-sm">
                    {preset.label}
                  </span>
                  <span
                    className={`badge badge-xs font-mono text-[10px] ${
                      isActive ? 'badge-primary' : 'badge-ghost text-base-content/70'
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>
                <p className="text-base-content/70 line-clamp-2 text-[11px] leading-snug">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
