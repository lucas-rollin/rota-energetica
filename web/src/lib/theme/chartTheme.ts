/**
 * Warm Stone & Deep Pine aligned ECharts surface, axis, map, and non-fuel series colors.
 * Keeps charts visually coherent with the light/dark DaisyUI themes without reusing fuel hues.
 */
export interface ChartTheme {
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
  axisBorder: string;
  gridLine: string;
  warningText: string;
  baselineAreaFill: string;
  baselineAreaText: string;
  brentLine: string;
  mapArea: string;
  mapBorder: string;
  mapEmphasis: string;
  corridorOther: string;
  corridorUncovered: string;
  corridorMixed: string;
}

export function getChartTheme(isDark: boolean): ChartTheme {
  return isDark
    ? {
        tooltipBg: '#211f1b',
        tooltipBorder: '#3a362f',
        tooltipText: '#e9e5dc',
        tooltipMuted: '#a8a298',
        axisBorder: '#4c473e',
        gridLine: '#322f29',
        warningText: '#e5b567',
        baselineAreaFill: 'rgba(132, 176, 153, 0.12)',
        baselineAreaText: '#9ec4b0',
        brentLine: '#d49a6a',
        mapArea: '#26231e',
        mapBorder: '#4a453d',
        mapEmphasis: '#35312a',
        corridorOther: 'rgba(168, 162, 152, 0.28)',
        corridorUncovered: '#d96b62',
        corridorMixed: '#84b099',
      }
    : {
        tooltipBg: '#fcfbf8',
        tooltipBorder: '#e1dcd0',
        tooltipText: '#26221c',
        tooltipMuted: '#6b655c',
        axisBorder: '#cfc9bc',
        gridLine: '#e8e3d9',
        warningText: '#9a6213',
        baselineAreaFill: 'rgba(45, 74, 62, 0.08)',
        baselineAreaText: '#2d4a3e',
        brentLine: '#9a5b25',
        mapArea: '#f3f0e8',
        mapBorder: '#cbc4b6',
        mapEmphasis: '#e7e2d7',
        corridorOther: 'rgba(87, 83, 78, 0.28)',
        corridorUncovered: '#b83c32',
        corridorMixed: '#2d4a3e',
      };
}

/**
 * Editorial cost-component palette for stacked TCO bars.
 * Intentionally distinct from the 4 powertrain fuel hues; paired with ECharts decal patterns.
 */
export const TCO_BREAKDOWN_COLORS = {
  netInvestment: '#475569', // Deep slate
  energy: '#c27828', // Warm ochre
  maintenance: '#5c7c70', // Muted sage-teal
  arla: '#8e5d7a', // Muted mauve
} as const;
