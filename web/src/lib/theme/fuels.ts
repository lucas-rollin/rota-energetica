import type { AlternativeId } from '../types/parameters';

export interface FuelThemeConfig {
  id: AlternativeId;
  label: string;
  hex: string;
  fillRgba: string;
  strokeRgba: string;
  dotClass: string;
  iconClass: string;
  textClass: string;
  borderAccent: string;
  pillClass: string;
  barClass: string;
  barSecondaryClass: string;
  barTextClass: string;
  activeButtonClass: string;
  bannerClass: string;
  badgeClass: string;
  chipClass: string;
  surfaceCardClass: string;
}

/**
 * Single source of truth for the 4 fuel/powertrain colors across the entire site:
 * - diesel: Warm Graphite (#57534e)
 * - biometano: Forest Green (#15803d)
 * - eletrico: Sky Blue (#0284c7)
 * - gnv: Deep Indigo (#4f46e5) — gas-flame tone, freeing amber strictly for warnings
 */
export const FUEL_THEME: Record<AlternativeId, FuelThemeConfig> = {
  diesel: {
    id: 'diesel',
    label: 'Diesel B15',
    hex: '#57534e',
    fillRgba: 'rgba(87, 83, 78, 0.14)',
    strokeRgba: 'rgba(87, 83, 78, 0.52)',
    dotClass: 'bg-stone-600 dark:bg-stone-400',
    iconClass: 'text-stone-600 dark:text-stone-400',
    textClass: 'text-stone-700 dark:text-stone-300',
    borderAccent: 'border-l-4 border-l-stone-500 dark:border-l-stone-400',
    pillClass:
      'bg-stone-600/10 text-stone-700 dark:bg-stone-400/15 dark:text-stone-300 font-semibold',
    barClass: 'bg-stone-600 dark:bg-stone-500',
    barSecondaryClass: 'bg-stone-700',
    barTextClass: 'text-white',
    activeButtonClass:
      'bg-stone-700 text-white border-stone-700 hover:bg-stone-800 dark:bg-stone-600 dark:border-stone-600 dark:hover:bg-stone-500',
    bannerClass:
      'border-stone-500/30 bg-stone-500/8 dark:border-stone-400/30 dark:bg-stone-400/10',
    badgeClass:
      'border border-stone-500/25 bg-stone-500/12 text-stone-700 dark:text-stone-300',
    chipClass: 'border-stone-500/30 bg-stone-500/10 text-stone-700 dark:text-stone-300',
    surfaceCardClass:
      'border-stone-500/25 bg-stone-500/6 dark:border-stone-400/25 dark:bg-stone-400/8',
  },
  biometano: {
    id: 'biometano',
    label: 'Biometano',
    hex: '#15803d',
    fillRgba: 'rgba(21, 128, 61, 0.14)',
    strokeRgba: 'rgba(21, 128, 61, 0.52)',
    dotClass: 'bg-green-700 dark:bg-green-500',
    iconClass: 'text-green-700 dark:text-green-400',
    textClass: 'text-green-700 dark:text-green-400',
    borderAccent: 'border-l-4 border-l-green-700 dark:border-l-green-500',
    pillClass:
      'bg-green-700/10 text-green-800 dark:bg-green-400/15 dark:text-green-300 font-semibold',
    barClass: 'bg-green-700 dark:bg-green-600',
    barSecondaryClass: 'bg-green-800',
    barTextClass: 'text-white',
    activeButtonClass:
      'bg-green-700 text-white border-green-700 hover:bg-green-800 dark:bg-green-600 dark:border-green-600 dark:hover:bg-green-500',
    bannerClass:
      'border-green-700/30 bg-green-700/8 dark:border-green-500/30 dark:bg-green-500/10',
    badgeClass:
      'border border-green-700/25 bg-green-700/12 text-green-800 dark:text-green-300',
    chipClass: 'border-green-700/30 bg-green-700/10 text-green-800 dark:text-green-300',
    surfaceCardClass:
      'border-green-700/25 bg-green-700/6 dark:border-green-500/25 dark:bg-green-500/8',
  },
  eletrico: {
    id: 'eletrico',
    label: 'Elétrico (BEV)',
    hex: '#0284c7',
    fillRgba: 'rgba(2, 132, 199, 0.15)',
    strokeRgba: 'rgba(2, 132, 199, 0.54)',
    dotClass: 'bg-sky-600 dark:bg-sky-400',
    iconClass: 'text-sky-600 dark:text-sky-400',
    textClass: 'text-sky-700 dark:text-sky-400',
    borderAccent: 'border-l-4 border-l-sky-600 dark:border-l-sky-400',
    pillClass:
      'bg-sky-600/10 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300 font-semibold',
    barClass: 'bg-sky-700 dark:bg-sky-600',
    barSecondaryClass: 'bg-sky-800',
    barTextClass: 'text-white',
    activeButtonClass:
      'bg-sky-700 text-white border-sky-700 hover:bg-sky-800 dark:bg-sky-600 dark:border-sky-600 dark:hover:bg-sky-500',
    bannerClass:
      'border-sky-600/30 bg-sky-600/8 dark:border-sky-400/30 dark:bg-sky-400/10',
    badgeClass: 'border border-sky-600/25 bg-sky-600/12 text-sky-800 dark:text-sky-300',
    chipClass: 'border-sky-600/30 bg-sky-600/10 text-sky-800 dark:text-sky-300',
    surfaceCardClass:
      'border-sky-600/25 bg-sky-600/6 dark:border-sky-400/25 dark:bg-sky-400/8',
  },
  gnv: {
    id: 'gnv',
    label: 'GNV / GNC',
    hex: '#4f46e5',
    fillRgba: 'rgba(79, 70, 229, 0.15)',
    strokeRgba: 'rgba(79, 70, 229, 0.54)',
    dotClass: 'bg-indigo-600 dark:bg-indigo-400',
    iconClass: 'text-indigo-600 dark:text-indigo-400',
    textClass: 'text-indigo-700 dark:text-indigo-400',
    borderAccent: 'border-l-4 border-l-indigo-600 dark:border-l-indigo-400',
    pillClass:
      'bg-indigo-600/10 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-300 font-semibold',
    barClass: 'bg-indigo-700 dark:bg-indigo-600',
    barSecondaryClass: 'bg-indigo-800',
    barTextClass: 'text-white',
    activeButtonClass:
      'bg-indigo-700 text-white border-indigo-700 hover:bg-indigo-800 dark:bg-indigo-600 dark:border-indigo-600 dark:hover:bg-indigo-500',
    bannerClass:
      'border-indigo-600/30 bg-indigo-600/8 dark:border-indigo-400/30 dark:bg-indigo-400/10',
    badgeClass:
      'border border-indigo-600/25 bg-indigo-600/12 text-indigo-800 dark:text-indigo-300',
    chipClass:
      'border-indigo-600/30 bg-indigo-600/10 text-indigo-800 dark:text-indigo-300',
    surfaceCardClass:
      'border-indigo-600/25 bg-indigo-600/6 dark:border-indigo-400/25 dark:bg-indigo-400/8',
  },
};
