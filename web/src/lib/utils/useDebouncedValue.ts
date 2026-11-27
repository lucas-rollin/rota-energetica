import { useEffect, useState } from 'react';

/**
 * Delays propagating rapid value changes (such as range slider drags) so
 * polite `aria-live` regions announce settled values instead of every tick.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 600): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
