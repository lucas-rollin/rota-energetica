import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { AlternativeId } from '../../../lib/types/parameters';
import type { SimulationResults } from '../../../lib/types/scenario';
import { useDarkMode } from '../../../lib/theme/useDarkMode';
import { escapeHtml, formatCurrency, formatNumber } from '../../../lib/utils/format';
import { SourceRef } from '../../common/SourceRef';
import { ChartContainer } from './ChartContainer';

// Register necessary ECharts components once
echarts.use([
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  AriaComponent,
  SVGRenderer,
]);

interface TcoComparisonChartProps {
  results: SimulationResults;
  horizonYears: number;
  fleetSize?: number;
}

type MetricMode = 'total' | 'perKm';

const ALTERNATIVES: { id: AlternativeId; name: string }[] = [
  { id: 'diesel', name: 'Diesel B15' },
  { id: 'gnv', name: 'GNV' },
  { id: 'biometano', name: 'Biometano' },
  { id: 'eletrico', name: 'Elétrico' },
];

// Okabe-Ito Colorblind-Safe Palette
const COLORS = {
  netInvestment: '#56B4E9', // Sky Blue
  energy: '#E69F00', // Orange
  maintenance: '#009E73', // Bluish Green
  arla: '#CC79A7', // Reddish Purple
};

export const TcoComparisonChart: React.FC<TcoComparisonChartProps> = ({
  results,
  horizonYears,
  fleetSize = 1,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [metricMode, setMetricMode] = useState<MetricMode>('total');
  const isDark = useDarkMode();

  const isTotal = metricMode === 'total';
  const multiplier = isTotal ? fleetSize : 1;

  // Prepare table data and text summary for accessibility
  const { tableData, summaryText, cheapestAlt } = useMemo(() => {
    const headers = [
      'Alternativa',
      isTotal ? `Investimento Líq. (R$)` : 'Investimento Líq. (R$/km)',
      isTotal ? `Energia (R$)` : 'Energia (R$/km)',
      isTotal ? `Manutenção (R$)` : 'Manutenção (R$/km)',
      isTotal ? `ARLA 32 (R$)` : 'ARLA 32 (R$/km)',
      isTotal ? `TCO Total (R$)` : 'Custo Nivelado (R$/km)',
    ];

    // Find alternative with minimum TCO
    const minAlt = ALTERNATIVES.reduce((cheapest, curr) => {
      const resCurr = results[curr.id];
      const resCheapest = results[cheapest.id];
      if (!resCurr) return cheapest;
      if (!resCheapest || resCurr.tco < resCheapest.tco) return curr;
      return cheapest;
    }, ALTERNATIVES[0]);
    const minAltName = minAlt.name;

    const rows = ALTERNATIVES.map((alt) => {
      const res = results[alt.id];
      if (!res) return [alt.name, '-', '-', '-', '-', '-'];

      const levelizedKm = res.levelizedKm > 0 ? res.levelizedKm : 1;
      const netInv = isTotal
        ? res.tcoBreakdown.netInvestment * multiplier
        : res.tcoBreakdown.netInvestment / levelizedKm;
      const energy = isTotal
        ? res.tcoBreakdown.pvEnergy * multiplier
        : res.tcoBreakdown.pvEnergy / levelizedKm;
      const maint = isTotal
        ? res.tcoBreakdown.pvMaintenance * multiplier
        : res.tcoBreakdown.pvMaintenance / levelizedKm;
      const arla = isTotal
        ? res.tcoBreakdown.pvArla * multiplier
        : res.tcoBreakdown.pvArla / levelizedKm;
      const totalVal = isTotal ? res.tco * multiplier : res.levelizedCostPerKm;

      return [
        alt.name,
        isTotal ? formatCurrency(netInv, 0) : `R$ ${formatNumber(netInv, 2)}`,
        isTotal ? formatCurrency(energy, 0) : `R$ ${formatNumber(energy, 2)}`,
        isTotal ? formatCurrency(maint, 0) : `R$ ${formatNumber(maint, 2)}`,
        arla > 0
          ? isTotal
            ? formatCurrency(arla, 0)
            : `R$ ${formatNumber(arla, 2)}`
          : '—',
        isTotal ? formatCurrency(totalVal, 0) : `R$ ${formatNumber(totalVal, 2)}`,
      ];
    });

    const summary = `Comparativo de Custo Total de Propriedade (TCO) em ${horizonYears} anos${
      fleetSize > 1 ? ` para frota de ${fleetSize} caminhões` : ''
    }. A alternativa com menor TCO acumulado é ${minAltName}.`;

    return {
      tableData: { headers, rows },
      summaryText: summary,
      cheapestAlt: minAltName,
    };
  }, [results, isTotal, multiplier, horizonYears, fleetSize]);

  // Update ECharts options
  useEffect(() => {
    if (!chartRef.current) return;

    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart) {
      chart = echarts.init(chartRef.current, null, {
        renderer: 'svg',
      });
      chartInstance.current = chart;
    }

    const categories = ALTERNATIVES.map((a) => a.name);

    const netInvestmentData = ALTERNATIVES.map((a) => {
      const res = results[a.id];
      if (!res) return 0;
      return isTotal
        ? res.tcoBreakdown.netInvestment * multiplier
        : res.tcoBreakdown.netInvestment / (res.levelizedKm || 1);
    });

    const energyData = ALTERNATIVES.map((a) => {
      const res = results[a.id];
      if (!res) return 0;
      return isTotal
        ? res.tcoBreakdown.pvEnergy * multiplier
        : res.tcoBreakdown.pvEnergy / (res.levelizedKm || 1);
    });

    const maintenanceData = ALTERNATIVES.map((a) => {
      const res = results[a.id];
      if (!res) return 0;
      return isTotal
        ? res.tcoBreakdown.pvMaintenance * multiplier
        : res.tcoBreakdown.pvMaintenance / (res.levelizedKm || 1);
    });

    const arlaData = ALTERNATIVES.map((a) => {
      const res = results[a.id];
      if (!res) return 0;
      return isTotal
        ? res.tcoBreakdown.pvArla * multiplier
        : res.tcoBreakdown.pvArla / (res.levelizedKm || 1);
    });

    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';
    const tooltipMuted = isDark ? '#94a3b8' : '#64748b';
    const axisBorder = isDark ? '#475569' : '#cbd5e1';
    const gridLine = isDark ? '#334155' : '#e2e8f0';

    const option: echarts.EChartsCoreOption = {
      aria: {
        enabled: true,
        decal: {
          show: true,
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: tooltipText },
        axisPointer: {
          type: 'shadow',
        },
        formatter: (params: unknown) => {
          const items = params as {
            seriesName: string;
            value: number;
            color: string;
            name: string;
          }[];
          if (!items || items.length === 0) return '';
          const title = items[0].name;
          let sum = 0;
          for (const item of items) {
            sum += item.value;
          }

          let html = `<div style="font-family: inherit; font-size: 12px; min-width: 180px;">`;
          html += `<div style="font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid ${tooltipBorder}; padding-bottom: 4px;">${escapeHtml(title)}</div>`;

          for (const item of items) {
            if (item.value <= 0) continue;
            const pct = sum > 0 ? ((item.value / sum) * 100).toFixed(1) : '0';
            const valStr = isTotal
              ? formatCurrency(item.value, 0)
              : `R$ ${formatNumber(item.value, 2)}/km`;

            html += `<div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
              <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background-color:${escapeHtml(item.color)};margin-right:6px;"></span>${escapeHtml(item.seriesName)}</span>
              <span style="font-weight: 600; font-family: monospace;">${escapeHtml(valStr)} <span style="font-weight: normal; color: ${tooltipMuted};">(${pct}%)</span></span>
            </div>`;
          }

          const sumStr = isTotal
            ? formatCurrency(sum, 0)
            : `R$ ${formatNumber(sum, 2)}/km`;
          html += `<div style="border-top: 1px solid ${tooltipBorder}; margin-top: 6px; padding-top: 4px; display: flex; justify-content: space-between; font-weight: bold;">
            <span>TCO Total</span>
            <span style="font-family: monospace; color: #06b6d4;">${sumStr}</span>
          </div>`;
          html += `</div>`;
          return html;
        },
      },
      legend: {
        data: [
          'Investimento Líquido',
          'Combustível / Energia',
          'Manutenção & Pneus',
          'ARLA 32',
        ],
        bottom: 0,
        textStyle: {
          fontSize: 11,
          color: 'currentColor',
        },
      },
      grid: {
        left: '2%',
        right: '4%',
        bottom: '12%',
        top: '6%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          fontSize: 12,
          fontWeight: 600,
          color: 'currentColor',
        },
        axisLine: {
          lineStyle: { color: axisBorder },
        },
      },
      yAxis: {
        type: 'value',
        name: isTotal
          ? fleetSize > 1
            ? `R$ (${fleetSize} veículos)`
            : 'R$ (Valor Presente)'
          : 'R$/km',
        nameTextStyle: {
          fontSize: 11,
          color: 'currentColor',
        },
        axisLabel: {
          fontSize: 11,
          color: 'currentColor',
          formatter: (value: number) => {
            if (isTotal) {
              if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
              if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
              return `R$ ${value}`;
            }
            return `R$ ${value.toFixed(2)}`;
          },
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: gridLine,
          },
        },
      },
      series: [
        {
          name: 'Investimento Líquido',
          type: 'bar',
          stack: 'total',
          data: netInvestmentData,
          color: COLORS.netInvestment,
          emphasis: { focus: 'series' },
        },
        {
          name: 'Combustível / Energia',
          type: 'bar',
          stack: 'total',
          data: energyData,
          color: COLORS.energy,
          emphasis: { focus: 'series' },
        },
        {
          name: 'Manutenção & Pneus',
          type: 'bar',
          stack: 'total',
          data: maintenanceData,
          color: COLORS.maintenance,
          emphasis: { focus: 'series' },
        },
        {
          name: 'ARLA 32',
          type: 'bar',
          stack: 'total',
          data: arlaData,
          color: COLORS.arla,
          emphasis: { focus: 'series' },
        },
      ],
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
  }, [results, isTotal, multiplier, fleetSize, isDark]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  const controls = (
    <div className="join" role="group" aria-label="Métrica do TCO">
      <button
        type="button"
        className={`join-item btn btn-xs ${
          isTotal ? 'btn-primary' : 'btn-ghost text-base-content/70'
        }`}
        onClick={() => setMetricMode('total')}
        aria-pressed={isTotal}
      >
        Valor Total (R$)
      </button>
      <button
        type="button"
        className={`join-item btn btn-xs ${
          !isTotal ? 'btn-primary' : 'btn-ghost text-base-content/70'
        }`}
        onClick={() => setMetricMode('perKm')}
        aria-pressed={!isTotal}
      >
        Por Quilômetro (R$/km)
      </button>
    </div>
  );

  const sourceAttribution = (
    <>
      <span className="font-semibold">Fontes:</span>
      <span>ANP (Diesel/GNV)</span>
      <SourceRef id="P01" context="Preços ANP no TCO" />
      <span>· ANEEL CELESC (Eletricidade)</span>
      <SourceRef id="P06" context="Tarifa elétrica no TCO" />
      <span>· NTC/CNT &amp; FIPE (OPEX/Residual)</span>
      <SourceRef id="V05" context="Manutenção NTC/CNT" />
      <SourceRef id="V06" context="Valor residual FIPE" />
      <span>· Montadoras (Scania/Sany)</span>
      <SourceRef id="V07" context="Especificações Scania G/R 460" />
      <SourceRef id="V08" context="Especificações Sany SE 588" />
    </>
  );

  return (
    <ChartContainer
      id="tco-comparison"
      title="Decomposição do Custo Total de Propriedade (TCO)"
      subtitle={`Comparativo da composição de capital líquido e custos operacionais descontados em ${horizonYears} anos.`}
      summaryText={`${summaryText} Destaque: ${cheapestAlt}.`}
      sourceAttribution={sourceAttribution}
      tableData={tableData}
      controls={controls}
    >
      <div
        ref={chartRef}
        className="h-72 w-full sm:h-80 md:h-96"
        role="img"
        aria-label="Gráfico de barras empilhadas comparando a composição do TCO entre Diesel B15, GNV, Biometano e Elétrico"
      />
    </ChartContainer>
  );
};
