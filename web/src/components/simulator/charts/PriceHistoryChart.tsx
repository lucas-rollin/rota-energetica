import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, type LineSeriesOption } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { PricesHistory, PricePoint } from '../../../lib/types/prices';
import { FUEL_THEME } from '../../../lib/theme/fuels';
import { useDarkMode } from '../../../lib/theme/useDarkMode';
import { escapeHtml, formatNumber } from '../../../lib/utils/format';
import { SourceRef } from '../../common/SourceRef';
import { ChartContainer, type ChartTableData } from './ChartContainer';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkAreaComponent,
  AriaComponent,
  SVGRenderer,
]);

interface PriceHistoryChartProps {
  pricesHistory?: PricesHistory;
}

type RangeMode = 'recent' | 'anp' | 'all';
type UnitMode = 'nominal' | 'energy';

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  pricesHistory,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [rangeMode, setRangeMode] = useState<RangeMode>('recent');
  const [unitMode, setUnitMode] = useState<UnitMode>('nominal');
  const [loadedHistory, setLoadedHistory] = useState<PricesHistory | null>(null);
  const isDark = useDarkMode();

  useEffect(() => {
    if (pricesHistory) return;
    let active = true;
    import('../../../../../data/processed/prices_history.json').then((mod) => {
      if (active) {
        const data = ('default' in mod ? mod.default : mod) as unknown as PricesHistory;
        setLoadedHistory(data);
      }
    });
    return () => {
      active = false;
    };
  }, [pricesHistory]);

  const activeHistory = pricesHistory ?? loadedHistory;
  const referenceUf = activeHistory?.reference_uf ?? 'SC';
  const dieselSeries = activeHistory?.fuels.diesel_s10;
  const gnvSeries = activeHistory?.fuels.gnv;
  const brentSeries = activeHistory?.fuels.brent;

  // Baseline 12-week window from diesel_s10
  const baselineWindow = useMemo(() => {
    const pts = dieselSeries?.series ?? [];
    if (pts.length === 0) return null;
    const recent12 = pts.slice(-12);
    return {
      startWeek: recent12[0].week,
      endWeek: recent12[recent12.length - 1].week,
    };
  }, [dieselSeries]);

  const { weeks, dieselMap, gnvMap, brentMap, fallbackCount } = useMemo(() => {
    const dPts = dieselSeries?.series ?? [];
    const gPts = gnvSeries?.series ?? [];
    const bPts = brentSeries?.series ?? [];

    const minWeek =
      rangeMode === 'recent' ? '2025-W01' : rangeMode === 'anp' ? '2020-W01' : '0000-W00';

    const weekSet = new Set<string>();
    const dMap = new Map<string, PricePoint>();
    const gMap = new Map<string, PricePoint>();
    const bMap = new Map<string, PricePoint>();

    for (const p of dPts) {
      if (p.week >= minWeek) {
        weekSet.add(p.week);
        dMap.set(p.week, p);
      }
    }
    for (const p of gPts) {
      if (p.week >= minWeek) {
        weekSet.add(p.week);
        gMap.set(p.week, p);
      }
    }
    if (unitMode === 'nominal') {
      for (const p of bPts) {
        if (p.week >= minWeek) {
          weekSet.add(p.week);
          bMap.set(p.week, p);
        }
      }
    }

    const sortedWeeks = Array.from(weekSet).sort();
    let fbCount = 0;
    for (const w of sortedWeeks) {
      if (dMap.get(w)?.is_fallback || gMap.get(w)?.is_fallback) {
        fbCount++;
      }
    }

    return {
      weeks: sortedWeeks,
      dieselMap: dMap,
      gnvMap: gMap,
      brentMap: bMap,
      fallbackCount: fbCount,
    };
  }, [dieselSeries, gnvSeries, brentSeries, rangeMode, unitMode]);

  const tableData: ChartTableData = useMemo(() => {
    const headers =
      unitMode === 'nominal'
        ? [
            'Semana ISO',
            `Diesel S10 (${dieselSeries?.unit_nominal ?? 'R$/L'})`,
            `GNV (${gnvSeries?.unit_nominal ?? 'R$/m³'})`,
            `Brent (${brentSeries?.unit_nominal ?? 'US$/bbl'})`,
            'Cobertura ANP',
          ]
        : ['Semana ISO', 'Diesel S10 (R$/MJ)', 'GNV (R$/MJ)', 'Cobertura ANP'];

    // Show latest 24 weeks in accessible table for readability
    const recentWeeks = weeks.slice(-24).reverse();
    const rows = recentWeeks.map((w) => {
      const d = dieselMap.get(w);
      const g = gnvMap.get(w);
      const b = brentMap.get(w);
      const isFb = Boolean(d?.is_fallback || g?.is_fallback);
      const cov = isFb ? 'Fallback BR' : referenceUf;

      if (unitMode === 'nominal') {
        return [
          w,
          d ? `R$ ${formatNumber(d.price_nominal, 2)}` : '—',
          g ? `R$ ${formatNumber(g.price_nominal, 2)}` : '—',
          b ? `US$ ${formatNumber(b.price_nominal, 2)}` : '—',
          cov,
        ];
      }
      return [
        w,
        d?.price_mj != null ? `R$ ${formatNumber(d.price_mj, 4)}` : '—',
        g?.price_mj != null ? `R$ ${formatNumber(g.price_mj, 4)}` : '—',
        cov,
      ];
    });

    return { headers, rows };
  }, [
    weeks,
    dieselMap,
    gnvMap,
    brentMap,
    unitMode,
    dieselSeries,
    gnvSeries,
    brentSeries,
    referenceUf,
  ]);

  useEffect(() => {
    if (!chartRef.current || !activeHistory) return;

    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart) {
      chart = echarts.init(chartRef.current, null, { renderer: 'svg' });
      chartInstance.current = chart;
    }

    const dieselData = weeks.map((w) => {
      const pt = dieselMap.get(w);
      if (!pt) return null;
      return unitMode === 'nominal' ? pt.price_nominal : (pt.price_mj ?? null);
    });
    const gnvData = weeks.map((w) => {
      const pt = gnvMap.get(w);
      if (!pt) return null;
      return unitMode === 'nominal' ? pt.price_nominal : (pt.price_mj ?? null);
    });
    const brentData = weeks.map((w) => brentMap.get(w)?.price_nominal ?? null);

    // Baseline 12-week markArea coords if visible in current week window
    type MarkAreaData = NonNullable<NonNullable<LineSeriesOption['markArea']>['data']>;
    const markAreaData: MarkAreaData =
      baselineWindow &&
      weeks.includes(baselineWindow.startWeek) &&
      weeks.includes(baselineWindow.endWeek)
        ? [
            [
              {
                name: 'Janela Base (12 sem.)',
                xAxis: baselineWindow.startWeek,
              },
              {
                xAxis: baselineWindow.endWeek,
              },
            ],
          ]
        : [];

    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';
    const axisBorder = isDark ? '#475569' : '#cbd5e1';
    const gridLine = isDark ? '#334155' : '#e2e8f0';

    const seriesList: LineSeriesOption[] = [
      {
        name:
          unitMode === 'nominal'
            ? `Diesel S10 (${dieselSeries?.unit_nominal ?? 'R$/L'})`
            : 'Diesel S10 (R$/MJ)',
        type: 'line',
        yAxisIndex: 0,
        data: dieselData,
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 2.2, color: FUEL_THEME.diesel.hex },
        itemStyle: { color: FUEL_THEME.diesel.hex },
        markArea:
          markAreaData.length > 0
            ? {
                silent: true,
                itemStyle: {
                  color: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.10)',
                },
                label: {
                  show: true,
                  position: 'insideTop',
                  fontSize: 10,
                  color: isDark ? '#6ee7b7' : '#047857',
                },
                data: markAreaData,
              }
            : undefined,
      },
      {
        name:
          unitMode === 'nominal'
            ? `GNV (${gnvSeries?.unit_nominal ?? 'R$/m³'})`
            : 'GNV (R$/MJ)',
        type: 'line',
        yAxisIndex: 0,
        data: gnvData,
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 2.2, color: FUEL_THEME.gnv.hex },
        itemStyle: { color: FUEL_THEME.gnv.hex },
      },
    ];

    if (unitMode === 'nominal') {
      seriesList.push({
        name: `Petróleo Brent (${brentSeries?.unit_nominal ?? 'US$/bbl'})`,
        type: 'line',
        yAxisIndex: 1,
        data: brentData,
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 1.8, type: 'dashed', color: '#6366f1' },
        itemStyle: { color: '#6366f1' },
      });
    }

    const option: echarts.EChartsCoreOption = {
      aria: { enabled: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipText },
        formatter: (params: unknown) => {
          const items = params as {
            axisValue: string;
            seriesName: string;
            value: number | null;
            color: string;
          }[];
          if (!items || items.length === 0) return '';
          const week = items[0].axisValue;
          const dPt = dieselMap.get(week);
          const gPt = gnvMap.get(week);
          const bPt = brentMap.get(week);
          const refDate = dPt?.date ?? gPt?.date ?? bPt?.date ?? '';
          const hasFallback = Boolean(dPt?.is_fallback || gPt?.is_fallback);

          let html = `<div style="font-family: inherit; font-size: 12px; min-width: 195px;">`;
          html += `<div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid ${tooltipBorder}; padding-bottom: 4px;">${escapeHtml(week)}${refDate ? ` (${escapeHtml(refDate)})` : ''}</div>`;
          for (const item of items) {
            if (item.value === null || item.value === undefined) continue;
            const dec = unitMode === 'energy' ? 4 : 2;
            html += `<div style="display:flex; justify-content:space-between; gap:10px; margin-bottom:2px;">
              <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${escapeHtml(item.color)};margin-right:6px;"></span>${escapeHtml(item.seriesName)}</span>
              <span style="font-family:monospace; font-weight:600;">${escapeHtml(formatNumber(item.value, dec))}</span>
            </div>`;
          }
          if (hasFallback) {
            html += `<div style="margin-top:4px; font-size:11px; color:${isDark ? '#fbbf24' : '#b45309'};">⚠ Semana com fallback nacional (BR)</div>`;
          }
          html += `</div>`;
          return html;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 11, color: 'currentColor' },
      },
      grid: {
        left: '2%',
        right: unitMode === 'nominal' ? '3%' : '2%',
        bottom: '13%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: weeks,
        axisLabel: { fontSize: 11, color: 'currentColor' },
        axisLine: { lineStyle: { color: axisBorder } },
      },
      yAxis:
        unitMode === 'nominal'
          ? [
              {
                type: 'value',
                name: 'ANP (R$/L · R$/m³)',
                nameTextStyle: { fontSize: 11, color: 'currentColor' },
                axisLabel: {
                  fontSize: 11,
                  color: 'currentColor',
                  formatter: (v: number) => `R$ ${v.toFixed(1)}`,
                },
                splitLine: { lineStyle: { type: 'dashed', color: gridLine } },
              },
              {
                type: 'value',
                name: 'Brent (US$/bbl)',
                nameTextStyle: { fontSize: 11, color: 'currentColor' },
                axisLabel: {
                  fontSize: 11,
                  color: 'currentColor',
                  formatter: (v: number) => `US$ ${v.toFixed(0)}`,
                },
                splitLine: { show: false },
              },
            ]
          : [
              {
                type: 'value',
                name: 'Custo Energético (R$/MJ)',
                nameTextStyle: { fontSize: 11, color: 'currentColor' },
                axisLabel: {
                  fontSize: 11,
                  color: 'currentColor',
                  formatter: (v: number) => `R$ ${v.toFixed(2)}`,
                },
                splitLine: { lineStyle: { type: 'dashed', color: gridLine } },
              },
            ],
      series: seriesList,
    };

    chart.setOption(option, true);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          chart.resize();
        }
      }
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    weeks,
    dieselMap,
    gnvMap,
    brentMap,
    unitMode,
    baselineWindow,
    dieselSeries,
    gnvSeries,
    brentSeries,
    activeHistory,
    isDark,
  ]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  const summaryText = activeHistory
    ? `Série semanal histórica (${weeks[0] ?? '-'} a ${weeks[weeks.length - 1] ?? '-'}) para ${referenceUf}: Diesel S10, GNV (ANP) e Brent (EIA). Janela padrão de 12 semanas destacada (${baselineWindow?.startWeek ?? ''} a ${baselineWindow?.endWeek ?? ''}); ${fallbackCount} semanas no período usaram fallback nacional (BR).`
    : `Carregando série semanal histórica (ANP e EIA) para ${referenceUf}...`;

  const sourceAttribution = (
    <>
      <span className="font-semibold">Fontes:</span>
      <span>ANP — Diesel S10 e GNV ({referenceUf})</span>
      <SourceRef id={dieselSeries?.source_id ?? 'P01'} context="Série Histórica ANP" />
      {dieselSeries?.retrieved_at && (
        <span className="font-mono text-[11px] opacity-90">
          (acesso {dieselSeries.retrieved_at})
        </span>
      )}
      <span>· EIA — Petróleo Brent</span>
      <SourceRef id={brentSeries?.source_id ?? 'P02'} context="Série Histórica Brent" />
      {brentSeries?.retrieved_at && (
        <span className="font-mono text-[11px] opacity-90">
          (acesso {brentSeries.retrieved_at})
        </span>
      )}
    </>
  );

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="join" role="group" aria-label="Período da série histórica">
        {(
          [
            { id: 'recent', label: '2025–2026' },
            { id: 'anp', label: 'Desde 2020' },
            { id: 'all', label: 'Brent 1987+' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setRangeMode(opt.id)}
            aria-pressed={rangeMode === opt.id}
            className={`join-item btn btn-xs ${
              rangeMode === opt.id ? 'btn-primary' : 'btn-ghost text-base-content/70'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="join" role="group" aria-label="Unidade do gráfico histórico">
        <button
          type="button"
          onClick={() => setUnitMode('nominal')}
          aria-pressed={unitMode === 'nominal'}
          className={`join-item btn btn-xs ${
            unitMode === 'nominal' ? 'btn-neutral' : 'btn-ghost text-base-content/70'
          }`}
        >
          Unidade Original
        </button>
        <button
          type="button"
          onClick={() => setUnitMode('energy')}
          aria-pressed={unitMode === 'energy'}
          className={`join-item btn btn-xs ${
            unitMode === 'energy' ? 'btn-neutral' : 'btn-ghost text-base-content/70'
          }`}
        >
          R$/MJ
        </button>
      </div>
    </div>
  );

  return (
    <ChartContainer
      id="price-history"
      title="Histórico Semanal de Preços (Diesel S10, GNV e Brent)"
      subtitle="Séries históricas agregadas (ANP & EIA) com destaque para a janela-base de 12 semanas."
      summaryText={summaryText}
      sourceAttribution={sourceAttribution}
      tableData={tableData}
      controls={controls}
    >
      <div className="relative">
        <div
          ref={chartRef}
          className="h-72 w-full sm:h-80 md:h-96"
          role="img"
          aria-label="Gráfico de linhas mostrando séries históricas semanais de Diesel S10, GNV e Petróleo Brent"
        />
        {!activeHistory && (
          <div className="text-base-content/75 pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium">
            Carregando série histórica de preços...
          </div>
        )}
      </div>
    </ChartContainer>
  );
};
