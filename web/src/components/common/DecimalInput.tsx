import React, { useState } from 'react';

interface DecimalInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  decimals?: number;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  'aria-label'?: string;
}

/**
 * Native `<input type="number">` that formats to fixed `decimals` on blur and
 * native spinner steps so values like `10.0` do not shift position when stepped.
 */
export const DecimalInput: React.FC<DecimalInputProps> = ({
  id,
  value,
  onChange,
  decimals = 2,
  step = 1,
  min,
  max,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const clamp = (n: number): number => {
    let result = n;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  };

  const formattedValue = Number.isFinite(value) ? value.toFixed(decimals) : '';

  const handleFocus = () => {
    setDraft(formattedValue);
    setIsFocused(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const inputType = (e.nativeEvent as InputEvent | undefined)?.inputType;
    const parsed = parseFloat(raw.replace(',', '.'));

    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      const clamped = clamp(parsed);
      // Native spinner clicks do not carry an InputEvent.inputType; keep fixed decimals
      setDraft(inputType ? raw : clamped.toFixed(decimals));
      if ((min === undefined || parsed >= min) && (max === undefined || parsed <= max)) {
        onChange(Number(parsed.toFixed(Math.max(decimals, 4))));
      }
    } else {
      setDraft(raw);
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(draft.replace(',', '.'));
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      const clamped = clamp(parsed);
      onChange(Number(clamped.toFixed(Math.max(decimals, 4))));
    }
    setIsFocused(false);
  };

  return (
    <input
      id={id}
      type="number"
      step={step}
      min={min}
      max={max}
      value={isFocused ? draft : formattedValue}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      aria-label={ariaLabel}
    />
  );
};
