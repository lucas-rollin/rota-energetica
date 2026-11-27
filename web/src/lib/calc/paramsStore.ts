import { useSyncExternalStore } from 'react';
import type { SimulationParameters } from '../types/parameters';

const PARAMS_CHANGE_EVENT = 'rota:params-change';

let currentSharedParams: SimulationParameters | null = null;

/**
 * Publishes updated simulation parameters across Astro islands on the main scroll page.
 */
export function setSharedSimulationParams(params: SimulationParameters): void {
  currentSharedParams = params;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PARAMS_CHANGE_EVENT));
  }
}

function subscribeParams(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PARAMS_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener(PARAMS_CHANGE_EVENT, callback);
  };
}

/**
 * Subscribes to live parameter edits made in the main Simulator island,
 * falling back to build-time `defaults` during SSR or standalone route visits.
 */
export function useSharedSimulationParams(
  defaults: SimulationParameters
): SimulationParameters {
  return useSyncExternalStore(
    subscribeParams,
    () => currentSharedParams ?? defaults,
    () => defaults
  );
}
