import { useSyncExternalStore } from 'react';

export const CORRIDOR_SELECT_EVENT = 'rota:corridor-select';

export interface CorridorSelectDetail {
  corridorId: string;
}

declare global {
  interface Window {
    __rotaSelectedCorridorId?: string;
  }
}

/**
 * Broadcasts corridor selection across decoupled Astro islands on `/corridors`.
 */
export function publishCorridorSelection(corridorId: string): void {
  if (typeof window === 'undefined') return;
  window.__rotaSelectedCorridorId = corridorId;
  window.dispatchEvent(
    new CustomEvent<CorridorSelectDetail>(CORRIDOR_SELECT_EVENT, {
      detail: { corridorId },
    })
  );
}

/**
 * Returns the latest corridor ID selected before a lazy island hydrated.
 */
export function getInitialCorridorSelection(fallbackId: string): string {
  if (typeof window === 'undefined') return fallbackId;
  return window.__rotaSelectedCorridorId ?? fallbackId;
}

function subscribeCorridorSelection(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CORRIDOR_SELECT_EVENT, callback);
  return () => {
    window.removeEventListener(CORRIDOR_SELECT_EVENT, callback);
  };
}

/**
 * Subscribes to the shared corridor ID across decoupled Astro islands without
 * hydration mismatches or synchronous `setState` inside `useEffect`.
 */
export function useSharedCorridorSelection(
  fallbackId: string
): [string, (corridorId: string) => void] {
  const selectedId = useSyncExternalStore(
    subscribeCorridorSelection,
    () => getInitialCorridorSelection(fallbackId),
    () => fallbackId
  );
  return [selectedId, publishCorridorSelection];
}
