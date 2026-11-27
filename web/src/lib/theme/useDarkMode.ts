import { useSyncExternalStore } from 'react';

function subscribeDarkMode(callback: () => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const observer = new MutationObserver(() => callback());
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);

  const handleControllerChange = (e: Event) => {
    const target = e.target;
    if (
      target instanceof HTMLInputElement &&
      target.classList.contains('theme-controller')
    ) {
      callback();
    }
  };
  document.addEventListener('change', handleControllerChange);

  return () => {
    observer.disconnect();
    mq.removeEventListener('change', callback);
    document.removeEventListener('change', handleControllerChange);
  };
}

function getDarkModeClient(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getDarkModeServer(): boolean {
  return false;
}

/**
 * Subscribes to the active light/dark theme (`data-theme` attribute, DaisyUI
 * `.theme-controller`, or OS `prefers-color-scheme` fallback).
 */
export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribeDarkMode, getDarkModeClient, getDarkModeServer);
}
