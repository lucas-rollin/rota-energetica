/**
 * Utility functions for consistent Portuguese (pt-BR) number and currency formatting.
 */

/**
 * Formats a number in pt-BR locale with fixed decimals.
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a monetary value in Brazilian Real (R$).
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return 'R$ -';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formats a percentage with explicit sign (+ / -).
 */
export function formatPercent(
  value: number,
  decimals: number = 1,
  showSign: boolean = true
): string {
  if (!Number.isFinite(value)) return '-';
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(value));

  if (Math.abs(value) < 1e-6) {
    return `0,0%`;
  }
  const sign = value > 0 ? '+' : '-';
  return showSign ? `${sign}${formatted}%` : `${formatted}%`;
}

/**
 * Formats delta relative to baseline.
 */
export function formatDeltaText(diff: number, pct: number, unit: string = ''): string {
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
  const absDiff = Math.abs(diff);
  const formattedDiff = formatNumber(absDiff, 2);
  const formattedPct = formatPercent(pct, 1, false);

  if (Math.abs(diff) < 1e-6) {
    return 'Referência';
  }

  const unitPart = unit ? ` ${unit}` : '';
  return `${sign}${formattedPct} (${sign}${formattedDiff}${unitPart})`;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes special HTML characters for safe interpolation inside tooltip HTML strings.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch);
}
