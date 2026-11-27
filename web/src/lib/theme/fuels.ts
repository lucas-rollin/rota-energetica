import type { AlternativeId } from '../types/parameters';

export interface FuelThemeConfig {
  id: AlternativeId;
  label: string;
  hex: string;
  fillRgba: string;
  strokeRgba: string;
  dotClass: string;
  textClass: string;
  borderAccent: string;
  pillClass: string;
  barClass: string;
  barSecondaryClass: string;
  activeButtonClass: string;
}

/**
 * Single source of truth for the 4 fuel/powertrain colors across the entire site:
 * - diesel: Slate (#64748b)
 * - biometano: Emerald (#10b981)
 * - eletrico: Cyan (#06b6d4)
 * - gnv: Amber (#f59e0b)
 */
export const FUEL_THEME: Record<AlternativeId, FuelThemeConfig> = {
  diesel: {
    id: 'diesel',
    label: 'Diesel B15',
    hex: '#64748b',
    fillRgba: 'rgba(100, 116, 139, 0.14)',
    strokeRgba: 'rgba(100, 116, 139, 0.5)',
    dotClass: 'bg-slate-500',
    textClass: 'text-slate-700 dark:text-slate-300',
    borderAccent: 'border-l-4 border-l-slate-400 dark:border-l-slate-500',
    pillClass: 'bg-base-200/70 text-base-content/80 font-medium',
    barClass: 'bg-slate-600',
    barSecondaryClass: 'bg-slate-700',
    activeButtonClass: 'bg-slate-700 text-white border-slate-700 hover:bg-slate-800',
  },
  biometano: {
    id: 'biometano',
    label: 'Biometano',
    hex: '#10b981',
    fillRgba: 'rgba(16, 185, 129, 0.16)',
    strokeRgba: 'rgba(16, 185, 129, 0.52)',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    borderAccent: 'border-l-4 border-l-emerald-500',
    pillClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold',
    barClass: 'bg-emerald-700',
    barSecondaryClass: 'bg-emerald-800',
    activeButtonClass:
      'bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800',
  },
  eletrico: {
    id: 'eletrico',
    label: 'Elétrico (BEV)',
    hex: '#06b6d4',
    fillRgba: 'rgba(6, 182, 212, 0.18)',
    strokeRgba: 'rgba(6, 182, 212, 0.56)',
    dotClass: 'bg-cyan-500',
    textClass: 'text-cyan-700 dark:text-cyan-400',
    borderAccent: 'border-l-4 border-l-cyan-500',
    pillClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-semibold',
    barClass: 'bg-cyan-700',
    barSecondaryClass: 'bg-cyan-800',
    activeButtonClass: 'bg-cyan-700 text-white border-cyan-700 hover:bg-cyan-800',
  },
  gnv: {
    id: 'gnv',
    label: 'GNV / GNC',
    hex: '#f59e0b',
    fillRgba: 'rgba(245, 158, 11, 0.16)',
    strokeRgba: 'rgba(245, 158, 11, 0.52)',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderAccent: 'border-l-4 border-l-amber-500',
    pillClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold',
    barClass: 'bg-amber-400',
    barSecondaryClass: 'bg-amber-600',
    activeButtonClass: 'bg-amber-700 text-white border-amber-700 hover:bg-amber-800',
  },
};
