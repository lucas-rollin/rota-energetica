import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDeltaText, formatNumber, formatPercent } from './format';

describe('format utilities', () => {
  it('formats numbers using pt-BR convention', () => {
    // Note: non-breaking space or standard comma may be returned by Intl
    const formatted = formatNumber(1234.56, 2);
    expect(formatted).toBe('1.234,56');
  });

  it('formats currency correctly', () => {
    const formatted = formatCurrency(500000, 2);
    // Currency in pt-BR has R$ and non-breaking space
    expect(formatted).toContain('500.000,00');
    expect(formatted).toContain('R$');
  });

  it('formats percentage with sign', () => {
    expect(formatPercent(12.34, 1)).toBe('+12,3%');
    expect(formatPercent(-8.5, 1)).toBe('-8,5%');
    expect(formatPercent(0, 1)).toBe('0,0%');
  });

  it('formats delta text', () => {
    expect(formatDeltaText(0, 0)).toBe('Referência');
    expect(formatDeltaText(-1.25, -15.5, 'R$/km')).toBe('-15,5% (-1,25 R$/km)');
    expect(formatDeltaText(2.5, 20.0, 'R$/km')).toBe('+20,0% (+2,50 R$/km)');
  });
});
