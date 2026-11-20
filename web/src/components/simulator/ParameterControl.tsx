import React, { useId } from 'react';
import type { ParameterItem } from '../../lib/types/parameters';

interface ParameterControlProps {
  id?: string;
  label: string;
  item: ParameterItem;
  defaultItem: ParameterItem;
  onChange: (value: number) => void;
  onReset?: () => void;
  onOpenSource: (sourceId: string, paramLabel: string) => void;
}

export const ParameterControl: React.FC<ParameterControlProps> = ({
  id,
  label,
  item,
  defaultItem,
  onChange,
  onReset,
  onOpenSource,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const sliderId = `${inputId}-slider`;
  const numberId = `${inputId}-number`;

  const min = item.min ?? 0;
  const max = item.max ?? 100;
  const step = item.step ?? 1;

  const isModified = Math.abs(item.value - defaultItem.value) > 1e-6;
  const isOutOfBounds =
    item.min !== undefined && item.value < item.min
      ? 'below'
      : item.max !== undefined && item.value > item.max
        ? 'above'
        : null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      onChange(val);
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      onChange(val);
    }
  };

  const badgeColorClass =
    item.badge === 'Primária'
      ? 'badge-success text-white'
      : item.badge === 'Adaptada'
        ? 'badge-info text-white'
        : 'badge-ghost border-base-300 text-base-content/70';

  return (
    <div
      className={`rounded-xl border p-3.5 transition-all ${
        isModified
          ? 'bg-primary/5 border-primary/30 shadow-xs'
          : 'bg-base-100 border-base-200 hover:border-base-300'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={numberId}
          className="text-base-content flex cursor-pointer items-center gap-1.5 text-sm font-semibold"
        >
          <span>{label}</span>
          <span className="text-base-content/60 text-xs font-normal">({item.unit})</span>
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          {isModified && (
            <div className="flex items-center gap-1">
              <span className="badge badge-primary badge-xs px-2 py-1.5 font-medium tracking-tight">
                alterado
              </span>
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  title="Restaurar valor padrão"
                  aria-label={`Restaurar ${label} para padrão`}
                  className="btn btn-ghost btn-xs text-base-content/60 hover:text-primary px-1"
                >
                  ↺
                </button>
              )}
            </div>
          )}

          <span
            className={`badge badge-xs px-2 py-1.5 font-medium ${badgeColorClass}`}
            title={`Qualidade do dado: ${item.badge}`}
          >
            {item.badge}
          </span>

          <button
            type="button"
            onClick={() => onOpenSource(item.source_id, label)}
            title={`Ver fonte ${item.source_id}`}
            aria-label={`Ver informações da fonte ${item.source_id} para ${label}`}
            className="btn btn-xs btn-outline btn-neutral hover:btn-primary h-5 min-h-0 rounded px-1.5 font-mono text-[10px]"
          >
            {item.source_id}
          </button>
        </div>
      </div>

      {item.notes && (
        <p className="text-base-content/60 mb-2 text-xs leading-relaxed">{item.notes}</p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <input
            id={sliderId}
            type="range"
            min={min}
            max={max}
            step={step}
            value={item.value}
            onChange={handleSliderChange}
            aria-label={`Controle deslizante de ${label}`}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={item.value}
            className="range range-primary range-sm focus:outline-primary w-full cursor-pointer"
          />
          <div className="text-base-content/50 mt-0.5 flex justify-between px-0.5 font-mono text-[11px]">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>

        <div className="w-24 shrink-0 sm:w-28">
          <input
            id={numberId}
            type="number"
            min={min}
            max={max}
            step={step}
            value={item.value}
            onChange={handleNumberChange}
            aria-label={`Valor numérico de ${label}`}
            className={`input input-bordered input-sm focus:input-primary w-full text-right font-mono text-xs ${
              isOutOfBounds ? 'input-error text-error font-bold' : ''
            }`}
          />
        </div>
      </div>

      {isOutOfBounds && (
        <p className="text-error mt-1 text-xs font-medium" role="alert">
          Valor fora dos limites permitidos ({min} a {max}).
        </p>
      )}
    </div>
  );
};
