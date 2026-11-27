import React, { useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  AriaComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { AlternativeId, SimulationParameters } from '../../../lib/types/parameters';
import type { SimulationResults } from '../../../lib/types/scenario';
import { calculateAnnuityDiscountFactor } from '../../../lib/calc/tco';
import { FUEL_THEME } from '../../../lib/theme/fuels';
import { useDarkMode } from '../../../lib/theme/useDarkMode';
import { formatCurrency, formatNumber } from '../../../lib/utils/format';
import { SourceRef } from '../../common/SourceRef';
import { ChartContainer, type ChartTableData } from './ChartContainer';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  AriaComponent,
  SVGRenderer,
]);

interface PaybackTimelineChartProps {
  results: SimulationResults;
  params: SimulationParameters;
  fleetSize?: number;
}

const ALTERNATIVES: { id: AlternativeId; name: string; color: string }[] = [
  { id: 'diesel', name: 'Diesel B15', color: FUEL_THEME.diesel.hex },
  { id: 'gnv', name: 'GNV', color: FUEL_THEME.gnv.hex },
  { id: 'biometano', name: 'Biometano', color: FUEL_THEME.biometano.hex },
  { id: 'eletrico', name: 'Elétrico', color: FUEL_THEME.eletrico.hex },
];

export const PaybackTimelineChart: React.FC<PaybackTimelineChartProps> = ({
  results,
  params,
  fleetSize = 1,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const isDark = useDarkMode();

  const horizonYears = Math.max(1, Math.round(params.general.horizon_years.value));
  const discountRate = params.general.discount_rate.value;

  // Compute yearly cumulative costs (t = 0..h)
  const yearlyData = useMemo(() => {
    const years = Array.from({ length: horizonYears + 1 }, (_, i) => i);

    const seriesData: Record<AlternativeId, number[]> = {
      diesel: [],
      gnv: [],
      biometano: [],
      eletrico: [],
    };

    for (const alt of ALTERNATIVES) {
      const res = results[alt.id];
      const vehicle = params.vehicles[alt.id];
      if (!res || !vehicle) continue;

      const v0 = vehicle.vehicle_purchase_price.value * fleetSize;
      const annualOpex = res.annualOperationalCost * fleetSize;
      const residualRatio = vehicle.residual_value_ratio.value;

      for (let t = 0; t <= horizonYears; t++) {
        if (t === 0) {
          seriesData[alt.id].push(v0);
        } else {
          const pvifa = calculateAnnuityDiscountFactor(discountRate, t);
          let cumulative = v0 + annualOpex * pvifa;

          // At final year h, subtract discounted residual value
          if (t === horizonYears) {
            const residualDiscountFactor =
              Math.abs(discountRate) < 1e-12
                ? 1
                : Math.pow(1 + discountRate, -horizonYears);
            const pvResidual = residualRatio * v0 * residualDiscountFactor;
            cumulative -= pvResidual;
          }

          seriesData[alt.id].push(cumulative);
        }
      }
    }

    return { years, seriesData };
  }, [results, params, horizonYears, discountRate, fleetSize]);

  // Compute crossover / payback estimates vs Diesel for all alternatives
  const paybackText = useMemo(() => {
    const dieselSeries = yearlyData.seriesData.diesel;
    if (!dieselSeries.length) return '';

    const estimates: string[] = [];
    for (const alt of ALTERNATIVES) {
      if (alt.id === 'diesel') continue;
      const altSeries = yearlyData.seriesData[alt.id];
      if (!altSeries.length) continue;

      for (let t = 1; t <= horizonYears; t++) {
        if (altSeries[t] <= dieselSeries[t]) {
          const prevDiff = altSeries[t - 1] - dieselSeries[t - 1];
          const currDiff = altSeries[t] - dieselSeries[t];
          const denom = prevDiff - currDiff;
          const frac = Math.abs(denom) > 1e-9 ? prevDiff / denom : 0;
          const crossYear = Math.max(0, t - 1 + frac);
          estimates.push(`${alt.name}: ~${formatNumber(crossYear, 1)} anos`);
          break;
        }
      }
    }

    if (estimates.length > 0) {
      return `Ponto de equilíbrio (payback) frente ao Diesel — ${estimates.join(' · ')}.`;
    }
    return `No cenário configurado, o sobrepreço inicial das alternativas não é compensado dentro do horizonte de ${horizonYears} anos.`;
  }, [yearlyData, horizonYears]);

  // Table Data for accessibility
  const tableData: ChartTableData = useMemo(() => {
    const headers = ['Ano', 'Diesel B15', 'GNV', 'Biometano', 'Elétrico'];
    const rows = yearlyData.years.map((year) => {
      const yearLabel = year === 0 ? 'Ano 0 (Aquisição)' : `Fim do Ano ${year}`;
      return [
        yearLabel,
        formatCurrency(yearlyData.seriesData.diesel[year] ?? 0, 0),
        formatCurrency(yearlyData.seriesData.gnv[year] ?? 0, 0),
        formatCurrency(yearlyData.seriesData.biometano[year] ?? 0, 0),
        formatCurrency(yearlyData.seriesData.eletrico[year] ?? 0, 0),
      ];
    });
    return { headers, rows };
  }, [yearlyData]);

  // ECharts render
  useEffect(() => {
    if (!chartRef.current) return;

    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart) {
      chart = echarts.init(chartRef.current, null, {
        renderer: 'svg',
      });
      chartInstance.current = chart;
    }

    const series = ALTERNATIVES.map((alt) => ({
      name: alt.name,
      type: 'line' as const,
      smooth: true,
      data: yearlyData.seriesData[alt.id],
      lineStyle: {
        width: alt.id === 'diesel' ? 3 : 2.5,
        color: alt.color,
      },
      itemStyle: {
        color: alt.color,
      },
      symbolSize: 6,
    }));

    const tooltipBg = isDark ? '#0f172a' : '#ffffff';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';
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
        formatter: (params: unknown) => {
          const items = params as {
            seriesName: string;
            value: number;
            color: string;
            axisValueLabel: string;
          }[];
          if (!items || items.length === 0) return '';
          const year = items[0].axisValueLabel;

          let html = `<div style="font-family: inherit; font-size: 12px; min-width: 170px;">`;
          html += `<div style="font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid ${tooltipBorder}; padding-bottom: 4px;">${
            year === '0' ? 'Ano 0 (Investimento Inicial)' : `Ano ${year}`
          }</div>`;

          for (const item of items) {
            html += `<div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3px;">
              <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background-color:${item.color};margin-right:6px;"></span>${item.seriesName}</span>
              <span style="font-weight: 600; font-family: monospace;">${formatCurrency(item.value, 0)}</span>
            </div>`;
          }
          html += `</div>`;
          return html;
        },
      },
      legend: {
        data: ALTERNATIVES.map((a) => a.name),
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
        name: 'Ano',
        data: yearlyData.years.map(String),
        axisLabel: {
          fontSize: 12,
          color: 'currentColor',
          formatter: (val: string) => (val === '0' ? '0' : `${val}`),
        },
        axisLine: {
          lineStyle: { color: axisBorder },
        },
      },
      yAxis: {
        type: 'value',
        name:
          fleetSize > 1
            ? `Custo Acumulado (R$, ${fleetSize} caminhões)`
            : 'Custo Acumulado (R$)',
        nameTextStyle: {
          fontSize: 11,
          color: 'currentColor',
        },
        axisLabel: {
          fontSize: 11,
          color: 'currentColor',
          formatter: (value: number) => {
            if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
            if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
            return `R$ ${value}`;
          },
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: gridLine,
          },
        },
      },
      series,
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
  }, [yearlyData, fleetSize, isDark]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  const sourceAttribution = (
    <>
      <span className="font-semibold">Fontes:</span>
      <span>ANP (Diesel/GNV)</span>
      <SourceRef id="P01" context="Preços ANP no Payback" />
      <span>· ANEEL CELESC (Eletricidade)</span>
      <SourceRef id="P06" context="Tarifa elétrica no Payback" />
      <span>· Biometano (Ilustrativa)</span>
      <SourceRef id="P05" context="Referência de biometano" />
      <span>· FIPE &amp; NTC/CNT</span>
      <SourceRef id="V06" context="CAPEX e residual FIPE" />
      <SourceRef id="V05" context="OPEX NTC/CNT" />
    </>
  );

  return (
    <ChartContainer
      id="payback-timeline"
      title="Evolução Temporal dos Custos e Ponto de Equilíbrio (Payback)"
      subtitle="Custos acumulados (investimento inicial + custos operacionais descontados) do Ano 0 ao fim do horizonte."
      summaryText={paybackText}
      sourceAttribution={sourceAttribution}
      tableData={tableData}
    >
      <div
        ref={chartRef}
        className="h-72 w-full sm:h-80 md:h-96"
        role="img"
        aria-label="Gráfico de linhas mostrando a evolução cumulativa dos custos e ponto de cruzamento de payback"
      />
    </ChartContainer>
  );
};
