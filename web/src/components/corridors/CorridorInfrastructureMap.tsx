import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts/core';
import { CustomChart, LinesChart, ScatterChart } from 'echarts/charts';
import {
  AriaComponent,
  GeoComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Fuel,
  Maximize2,
  Map as MapIcon,
  Table as TableIcon,
  Zap,
} from 'lucide-react';
import type { FreightCorridor, FuelStation } from '../../lib/types/catalogs';
import { FUEL_THEME } from '../../lib/theme/fuels';
import { formatNumber } from '../../lib/utils/format';
import { SourceRef } from '../common/SourceRef';
import {
  buildCorridorCoverageSegments,
  computeCorridorCoverageStats,
  createGeodesicCircleCoords,
  getCorridorViewport,
  getEffectiveRadiusKm,
  projectWebMercator,
  unprojectWebMercator,
  type CoverageRadiusMode,
} from '../../lib/utils/geo';

echarts.use([
  GeoComponent,
  LinesChart,
  CustomChart,
  ScatterChart,
  TooltipComponent,
  LegendComponent,
  AriaComponent,
  CanvasRenderer,
]);

type CoverageVisualMode = 'route' | 'unified' | 'rings';

interface CorridorInfrastructureMapProps {
  corridors: FreightCorridor[];
  selectedCorridor: FreightCorridor;
  onSelectCorridor: (corridorId: string) => void;
  stations: FuelStation[];
  brazilGeoJson: unknown;
  viewportScope: 'corridor' | 'brazil';
  onViewportScopeChange: (scope: 'corridor' | 'brazil') => void;
  viewportTick: number;
  onFocusCorridor: () => void;
}

const AUTONOMY_PRESETS = [
  { id: 'bev', label: 'Elétrico BEV', km: 400 },
  { id: 'bio-gnc', label: 'Biometano Bio-GNC', km: 900 },
  { id: 'bio-gnl', label: 'Biometano GNL', km: 1400 },
] as const;

const COLORS = {
  biomethane: FUEL_THEME.biometano.hex,
  biomethaneUnifiedFill: FUEL_THEME.biometano.fillRgba,
  biomethaneStroke: FUEL_THEME.biometano.strokeRgba,
  electric: FUEL_THEME.eletrico.hex,
  electricUnifiedFill: FUEL_THEME.eletrico.fillRgba,
  electricStroke: FUEL_THEME.eletrico.strokeRgba,
  corridorCovered: '#059669',
  corridorCoveredElectric: '#0891b2',
  corridorCoveredMixed: '#2563eb',
  corridorUncovered: '#e11d48',
  corridorOther: 'rgba(100, 116, 139, 0.30)',
};

function ringCoordsToSvgPath(
  rings: [number, number][][],
  coordFn: (val: [number, number]) => [number, number]
): string {
  const segments: string[] = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const cmds: string[] = [];
    for (let i = 0; i < ring.length; i++) {
      const [px, py] = coordFn(ring[i]);
      cmds.push(`${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    cmds.push('Z');
    segments.push(cmds.join(''));
  }
  return segments.join(' ');
}

export const CorridorInfrastructureMap: React.FC<CorridorInfrastructureMapProps> = ({
  corridors,
  selectedCorridor,
  onSelectCorridor,
  stations,
  brazilGeoJson,
  viewportScope,
  onViewportScopeChange,
  viewportTick,
  onFocusCorridor,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const lastViewportKeyRef = useRef<string>('');

  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');
  const [showBiomethaneCng, setShowBiomethaneCng] = useState<boolean>(true);
  const [showElectricHpc, setShowElectricHpc] = useState<boolean>(false);
  const [onlySelectedCorridorStations, setOnlySelectedCorridorStations] =
    useState<boolean>(false);
  const [autonomyKm, setAutonomyKm] = useState<number>(900);
  const [radiusMode, setRadiusMode] = useState<CoverageRadiusMode>('half');
  const [coverageVisualMode, setCoverageVisualMode] =
    useState<CoverageVisualMode>('route');
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [tableUfFilter, setTableUfFilter] = useState<string>('TODOS');
  const [isDark, setIsDark] = useState<boolean>(false);

  // Track system dark mode for crisp map palette
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setIsDark(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const effectiveRadiusKm = useMemo(
    () => getEffectiveRadiusKm(autonomyKm, radiusMode),
    [autonomyKm, radiusMode]
  );

  // Stations matching selected network filters (all Brazil) for route coverage calculation
  const networkFilteredStations = useMemo(() => {
    return stations.filter((st) => {
      if (st.technology === 'biomethane_cng' && !showBiomethaneCng) return false;
      if (st.technology === 'electric_hpc' && !showElectricHpc) return false;
      return true;
    });
  }, [stations, showBiomethaneCng, showElectricHpc]);

  // Visible stations on map/table (optionally restricted to selected corridor)
  const visibleStations = useMemo(() => {
    if (!onlySelectedCorridorStations) return networkFilteredStations;
    return networkFilteredStations.filter((st) =>
      st.corridor_ids.includes(selectedCorridor.id)
    );
  }, [networkFilteredStations, onlySelectedCorridorStations, selectedCorridor.id]);

  const corridorStationsCount = useMemo(
    () =>
      networkFilteredStations.filter((st) =>
        st.corridor_ids.includes(selectedCorridor.id)
      ).length,
    [networkFilteredStations, selectedCorridor.id]
  );

  const coverageStats = useMemo(
    () =>
      computeCorridorCoverageStats(
        selectedCorridor,
        networkFilteredStations,
        effectiveRadiusKm
      ),
    [selectedCorridor, networkFilteredStations, effectiveRadiusKm]
  );

  const corridorSegments = useMemo(
    () =>
      buildCorridorCoverageSegments(
        selectedCorridor,
        networkFilteredStations,
        effectiveRadiusKm
      ),
    [selectedCorridor, networkFilteredStations, effectiveRadiusKm]
  );

  // Precompute geodesic rings grouped by technology (for unified area) and hovered station
  const bioRingCoordsList = useMemo(() => {
    if (coverageVisualMode === 'route' || !showBiomethaneCng) return [];
    return visibleStations
      .filter((s) => s.technology === 'biomethane_cng')
      .map((s) =>
        createGeodesicCircleCoords(s.longitude, s.latitude, effectiveRadiusKm, 28)
      );
  }, [coverageVisualMode, showBiomethaneCng, visibleStations, effectiveRadiusKm]);

  const hpcRingCoordsList = useMemo(() => {
    if (coverageVisualMode === 'route' || !showElectricHpc) return [];
    return visibleStations
      .filter((s) => s.technology === 'electric_hpc')
      .map((s) =>
        createGeodesicCircleCoords(s.longitude, s.latitude, effectiveRadiusKm, 28)
      );
  }, [coverageVisualMode, showElectricHpc, visibleStations, effectiveRadiusKm]);

  const individualOutlineRings = useMemo(() => {
    if (coverageVisualMode !== 'rings') return [];
    return visibleStations.map((st) => ({
      technology: st.technology,
      coords: createGeodesicCircleCoords(
        st.longitude,
        st.latitude,
        effectiveRadiusKm,
        28
      ),
    }));
  }, [coverageVisualMode, visibleStations, effectiveRadiusKm]);

  const hoveredStationRing = useMemo(() => {
    if (!hoveredStationId) return null;
    const st = visibleStations.find((s) => s.id === hoveredStationId);
    if (!st) return null;
    return {
      technology: st.technology,
      coords: createGeodesicCircleCoords(
        st.longitude,
        st.latitude,
        effectiveRadiusKm,
        32
      ),
    };
  }, [hoveredStationId, visibleStations, effectiveRadiusKm]);

  const viewport = useMemo(() => {
    return viewportScope === 'brazil'
      ? getCorridorViewport(null)
      : getCorridorViewport(selectedCorridor);
    // viewportTick forces re-centering when user clicks "Focar Eixo"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportScope, selectedCorridor, viewportTick]);

  // Available UFs for table filter
  const availableTableUfs = useMemo(() => {
    const ufs = new Set(visibleStations.map((s) => s.state));
    return ['TODOS', ...Array.from(ufs).sort()];
  }, [visibleStations]);

  const tableStations = useMemo(() => {
    if (tableUfFilter === 'TODOS') return visibleStations;
    return visibleStations.filter((s) => s.state === tableUfFilter);
  }, [visibleStations, tableUfFilter]);

  const summaryText = useMemo(() => {
    const networks: string[] = [];
    if (showBiomethaneCng) networks.push('GNV/Biometano');
    if (showElectricHpc) networks.push('Eletropostos HPC (>150 kW)');
    const netLabel =
      networks.length > 0 ? networks.join(' e ') : 'nenhuma rede selecionada';
    return `Mapa de cobertura para ${selectedCorridor.name} (${formatNumber(selectedCorridor.distance_km, 0)} km) considerando ${netLabel}, autonomia de ${formatNumber(autonomyKm, 0)} km (raio de cobertura de ${formatNumber(effectiveRadiusKm, 0)} km). Cobertura estimada do eixo: ${formatNumber(coverageStats.coveredPercent, 0)}%, com maior trecho sem cobertura de ${formatNumber(coverageStats.maxUncoveredSpanKm, 0)} km.`;
  }, [
    selectedCorridor,
    showBiomethaneCng,
    showElectricHpc,
    autonomyKm,
    effectiveRadiusKm,
    coverageStats,
  ]);

  // Resize chart cleanly when returning to 'map' view
  useEffect(() => {
    if (viewMode === 'map') {
      const timer = setTimeout(() => {
        chartInstanceRef.current?.resize();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  // Initialize and update ECharts GeoJSON map
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (!echarts.getMap('brasil_uf')) {
      echarts.registerMap(
        'brasil_uf',
        brazilGeoJson as Parameters<typeof echarts.registerMap>[1]
      );
    }

    let chart = echarts.getInstanceByDom(chartContainerRef.current);
    if (!chart) {
      chart = echarts.init(chartContainerRef.current, null, {
        renderer: 'canvas',
      });
      chartInstanceRef.current = chart;

      chart.on('mouseover', (params: unknown) => {
        const p = params as { data?: { station?: FuelStation } };
        if (p.data?.station?.id) {
          setHoveredStationId(p.data.station.id);
        }
      });
      chart.on('mouseout', (params: unknown) => {
        const p = params as { data?: { station?: FuelStation } };
        if (p.data?.station?.id) {
          setHoveredStationId(null);
        }
      });
    }

    const otherCorridorLines = corridors
      .filter((c) => c.id !== selectedCorridor.id && c.route_waypoints?.length)
      .map((c) => ({
        name: c.name,
        coords: c.route_waypoints as [number, number][],
      }));

    const coveredRouteColor =
      showBiomethaneCng && !showElectricHpc
        ? COLORS.corridorCovered
        : !showBiomethaneCng && showElectricHpc
          ? COLORS.corridorCoveredElectric
          : COLORS.corridorCoveredMixed;

    const coveredSegments = corridorSegments
      .filter((seg) => seg.covered)
      .map((seg) => ({
        name: `${selectedCorridor.name} (Trecho Coberto)`,
        coords: seg.coords,
      }));

    const uncoveredSegments = corridorSegments
      .filter((seg) => !seg.covered)
      .map((seg) => ({
        name: `${selectedCorridor.name} (Deserto Operacional)`,
        coords: seg.coords,
      }));

    const bioPoints = showBiomethaneCng
      ? visibleStations
          .filter((s) => s.technology === 'biomethane_cng')
          .map((s) => ({
            name: s.name,
            value: [s.longitude, s.latitude],
            station: s,
          }))
      : [];

    const hpcPoints = showElectricHpc
      ? visibleStations
          .filter((s) => s.technology === 'electric_hpc')
          .map((s) => ({
            name: s.name,
            value: [s.longitude, s.latitude],
            station: s,
          }))
      : [];

    const areaColor = isDark ? '#1e293b' : '#f1f5f9';
    const borderColor = isDark ? '#475569' : '#cbd5e1';
    const emphasisAreaColor = isDark ? '#334155' : '#e2e8f0';

    // Build custom coverage layer according to coverageVisualMode
    const unifiedLayers: {
      technology: 'biomethane_cng' | 'electric_hpc';
      rings: [number, number][][];
    }[] = [];
    if (coverageVisualMode === 'unified') {
      if (bioRingCoordsList.length > 0) {
        unifiedLayers.push({
          technology: 'biomethane_cng',
          rings: bioRingCoordsList,
        });
      }
      if (hpcRingCoordsList.length > 0) {
        unifiedLayers.push({
          technology: 'electric_hpc',
          rings: hpcRingCoordsList,
        });
      }
    }

    const currentViewportKey = `${viewportScope}:${selectedCorridor.id}:${viewportTick}`;
    const shouldResetViewport = lastViewportKeyRef.current !== currentViewportKey;
    lastViewportKeyRef.current = currentViewportKey;

    const geoConfig: Record<string, unknown> = {
      map: 'brasil_uf',
      roam: true,
      projection: {
        project: projectWebMercator,
        unproject: unprojectWebMercator,
      },
      layoutCenter: ['50%', '50%'],
      layoutSize: '94%',
      scaleLimit: { min: 1, max: 14 },
      itemStyle: {
        areaColor,
        borderColor,
        borderWidth: 0.9,
      },
      emphasis: {
        label: { show: false },
        itemStyle: {
          areaColor: emphasisAreaColor,
        },
      },
    };
    if (shouldResetViewport) {
      geoConfig.center = projectWebMercator(viewport.center);
      geoConfig.zoom = viewport.zoom;
    }

    const option: echarts.EChartsCoreOption = {
      animation: false,
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        textStyle: {
          color: isDark ? '#f8fafc' : '#0f172a',
          fontSize: 12,
        },
        formatter: (params: unknown) => {
          const item = params as {
            data?: { station?: FuelStation };
            name?: string;
          };
          const st = item.data?.station;
          if (st) {
            const badgeColor =
              st.technology === 'biomethane_cng'
                ? FUEL_THEME.biometano.hex
                : FUEL_THEME.eletrico.hex;
            const techLabel =
              st.technology === 'biomethane_cng' ? 'GNV / Biometano' : 'Eletroposto HPC';
            const kmInfo =
              st.km_marker != null ? ` • km ${formatNumber(st.km_marker, 0)}` : '';
            return `
              <div style="max-width:280px;white-space:normal;line-height:1.45;">
                <div style="font-weight:700;margin-bottom:3px;">${st.name}</div>
                <div style="font-size:11px;margin-bottom:4px;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${badgeColor};margin-right:5px;"></span>
                  <strong>${techLabel}</strong> (${st.status})
                </div>
                <div style="font-size:11px;opacity:0.85;">
                  <div><strong>Rodovia:</strong> ${st.highway}${kmInfo}</div>
                  <div><strong>Local:</strong> ${st.city} / ${st.state}</div>
                  <div><strong>Capacidade:</strong> ${st.capacity_spec}</div>
                  ${st.operator_network ? `<div><strong>Rede:</strong> ${st.operator_network}</div>` : ''}
                  <div style="margin-top:4px;font-size:10px;opacity:0.75;">Anel exibido no mapa: ${formatNumber(effectiveRadiusKm, 0)} km • Fonte: ${st.source_id} (${st.badge})</div>
                </div>
              </div>
            `;
          }

          return item.name ?? '';
        },
      },
      geo: geoConfig,
      series: [
        {
          name: 'Outros Eixos',
          type: 'lines',
          coordinateSystem: 'geo',
          polyline: true,
          silent: true,
          zlevel: 1,
          data: otherCorridorLines,
          lineStyle: {
            color: COLORS.corridorOther,
            width: 1.5,
            type: 'dashed',
          },
        },
        {
          name: 'Área Unificada de Cobertura',
          type: 'custom',
          coordinateSystem: 'geo',
          silent: true,
          zlevel: 1,
          renderItem: (
            params: { dataIndex: number },
            api: { coord: (val: [number, number]) => [number, number] }
          ) => {
            const layer = unifiedLayers[params.dataIndex];
            if (!layer) return null;
            const pathData = ringCoordsToSvgPath(layer.rings, api.coord);
            if (!pathData) return null;
            const isBio = layer.technology === 'biomethane_cng';
            return {
              type: 'path',
              shape: { pathData },
              style: {
                fill: isBio ? COLORS.biomethaneUnifiedFill : COLORS.electricUnifiedFill,
                stroke: 'none',
              },
            };
          },
          data: unifiedLayers.map((l, i) => [i, l.rings.length]),
        },
        {
          name: 'Contornos Individuais',
          type: 'custom',
          coordinateSystem: 'geo',
          silent: true,
          zlevel: 1,
          renderItem: (
            params: { dataIndex: number },
            api: { coord: (val: [number, number]) => [number, number] }
          ) => {
            const ring = individualOutlineRings[params.dataIndex];
            if (!ring) return null;
            const points = ring.coords.map((pt) => api.coord(pt));
            const isBio = ring.technology === 'biomethane_cng';
            return {
              type: 'polygon',
              shape: { points },
              style: {
                fill: 'transparent',
                stroke: isBio ? COLORS.biomethaneStroke : COLORS.electricStroke,
                lineWidth: 1,
                lineDash: [4, 4],
              },
            };
          },
          data: individualOutlineRings.map((_, i) => [i, 0]),
        },
        {
          name: 'Eixo Coberto',
          type: 'lines',
          coordinateSystem: 'geo',
          polyline: true,
          silent: true,
          zlevel: 2,
          data: coveredSegments,
          lineStyle: {
            color: coveredRouteColor,
            width: 4.5,
            opacity: 0.95,
            cap: 'round',
            join: 'round',
          },
        },
        {
          name: 'Deserto Operacional',
          type: 'lines',
          coordinateSystem: 'geo',
          polyline: true,
          silent: true,
          zlevel: 2,
          data: uncoveredSegments,
          lineStyle: {
            color: COLORS.corridorUncovered,
            width: 4.5,
            opacity: 0.95,
            type: 'dashed',
            cap: 'round',
            join: 'round',
          },
        },
        {
          name: 'Alcance do Ponto em Foco',
          type: 'custom',
          coordinateSystem: 'geo',
          silent: true,
          zlevel: 2,
          renderItem: (
            _params: { dataIndex: number },
            api: { coord: (val: [number, number]) => [number, number] }
          ) => {
            if (!hoveredStationRing) return null;
            const points = hoveredStationRing.coords.map((pt) => api.coord(pt));
            const isBio = hoveredStationRing.technology === 'biomethane_cng';
            return {
              type: 'polygon',
              shape: { points },
              style: {
                fill: isBio ? COLORS.biomethaneUnifiedFill : COLORS.electricUnifiedFill,
                stroke: isBio ? COLORS.biomethane : COLORS.electric,
                lineWidth: 1.8,
                lineDash: [5, 3],
              },
            };
          },
          data: hoveredStationRing ? [[0, 1]] : [],
        },
        {
          name: 'Postos GNV / Biometano',
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 3,
          symbol: 'circle',
          symbolSize: 9,
          itemStyle: {
            color: COLORS.biomethane,
            borderColor: '#ffffff',
            borderWidth: 1.5,
          },
          emphasis: {
            scale: 1.45,
          },
          data: bioPoints,
        },
        {
          name: 'Eletropostos HPC (>150 kW)',
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 3,
          symbol: 'circle',
          symbolSize: 9,
          itemStyle: {
            color: COLORS.electric,
            borderColor: '#ffffff',
            borderWidth: 1.5,
          },
          emphasis: {
            scale: 1.45,
          },
          data: hpcPoints,
        },
      ],
    };

    chart.setOption(option, { replaceMerge: ['series'] });
  }, [
    brazilGeoJson,
    corridors,
    selectedCorridor,
    corridorSegments,
    visibleStations,
    showBiomethaneCng,
    showElectricHpc,
    coverageVisualMode,
    bioRingCoordsList,
    hpcRingCoordsList,
    individualOutlineRings,
    hoveredStationRing,
    effectiveRadiusKm,
    viewport,
    viewportScope,
    viewportTick,
    isDark,
  ]);

  // Responsive chart resize
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      chartInstanceRef.current?.resize();
    });
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Dispose chart on unmount
  useEffect(() => {
    return () => {
      chartInstanceRef.current?.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  return (
    <section
      aria-labelledby="infra-map-heading"
      className="bg-base-100 border-base-200 space-y-5 rounded-xl border p-5 shadow-xs"
    >
      {/* Header + Local Corridor Selector + View Mode Toggle */}
      <div className="border-base-200 flex flex-col justify-between gap-4 border-b pb-4 lg:flex-row lg:items-center">
        <div>
          <h2
            id="infra-map-heading"
            className="text-base-content text-lg font-bold tracking-tight"
          >
            Mapa de Infraestrutura de Abastecimento &amp; Cobertura por Autonomia
          </h2>
          <p className="text-base-content/70 mt-0.5 text-xs">
            Explore os corredores rodoviários, filtre a rede energética desejada e ajuste
            a autonomia do caminhão para identificar trechos cobertos e desertos
            operacionais.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label
              htmlFor="map-corridor-select"
              className="text-base-content/70 text-xs font-semibold whitespace-nowrap"
            >
              Eixo no Mapa:
            </label>
            <select
              id="map-corridor-select"
              value={selectedCorridor.id}
              onChange={(e) => onSelectCorridor(e.target.value)}
              className="select select-xs select-bordered max-w-65 text-xs font-medium"
            >
              {corridors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div
            className="join self-start sm:self-auto"
            role="group"
            aria-label="Alternar entre mapa e tabela"
          >
            <button
              type="button"
              onClick={() => setViewMode('map')}
              aria-pressed={viewMode === 'map'}
              className={`join-item btn btn-xs gap-1.5 ${
                viewMode === 'map' ? 'btn-primary' : 'btn-ghost text-base-content/70'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Mapa</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`join-item btn btn-xs gap-1.5 ${
                viewMode === 'table' ? 'btn-primary' : 'btn-ghost text-base-content/70'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tabela ({visibleStations.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-base-200/40 border-base-200 grid grid-cols-1 gap-4 rounded-xl border p-4 lg:grid-cols-12">
        {/* Network & Layer Toggles */}
        <div className="space-y-2.5 lg:col-span-5">
          <div className="text-base-content/60 text-[11px] font-bold tracking-wider uppercase">
            Camadas de Infraestrutura (Mapa)
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium">
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-success"
                checked={showBiomethaneCng}
                onChange={(e) => setShowBiomethaneCng(e.target.checked)}
              />
              <Fuel
                className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              <span>GNV / Biometano</span>
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-medium">
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-info"
                checked={showElectricHpc}
                onChange={(e) => setShowElectricHpc(e.target.checked)}
              />
              <Zap
                className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400"
                aria-hidden="true"
              />
              <span>Eletropostos HPC (&gt;150 kW)</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="text-base-content/80 inline-flex cursor-pointer items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={onlySelectedCorridorStations}
                onChange={(e) => setOnlySelectedCorridorStations(e.target.checked)}
              />
              <span>Exibir apenas pontos do eixo selecionado</span>
            </label>
          </div>
        </div>

        {/* Autonomy Slider + Presets */}
        <div className="space-y-2 lg:col-span-4">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="autonomy-slider"
              className="text-base-content/60 text-[11px] font-bold tracking-wider uppercase"
            >
              Autonomia do Caminhão
            </label>
            <span className="text-primary font-mono font-bold">
              {formatNumber(autonomyKm, 0)} km
            </span>
          </div>

          <input
            id="autonomy-slider"
            type="range"
            min={200}
            max={1500}
            step={50}
            value={autonomyKm}
            onChange={(e) => setAutonomyKm(Number(e.target.value))}
            className="range range-xs range-primary w-full"
          />

          <div className="flex flex-wrap gap-1.5">
            {AUTONOMY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAutonomyKm(preset.km)}
                className={`btn btn-xs ${
                  autonomyKm === preset.km ? 'btn-primary' : 'btn-outline border-base-300'
                }`}
              >
                {preset.label} ({formatNumber(preset.km, 0)} km)
              </button>
            ))}
          </div>
        </div>

        {/* Radius Mode + Visual Style + Map Framing */}
        <div className="space-y-2 lg:col-span-3">
          <div className="text-base-content/60 text-[11px] font-bold tracking-wider uppercase">
            Cálculo &amp; Estilo da Cobertura
          </div>

          <div
            className="join w-full"
            role="group"
            aria-label="Modo de cálculo do raio de cobertura"
          >
            <button
              type="button"
              onClick={() => setRadiusMode('half')}
              aria-pressed={radiusMode === 'half'}
              className={`join-item btn btn-xs flex-1 ${
                radiusMode === 'half' ? 'btn-neutral' : 'btn-outline border-base-300'
              }`}
              title="Raio = Autonomia / 2 (margem segura / ida e volta)"
            >
              ½ ({formatNumber(autonomyKm / 2, 0)} km)
            </button>
            <button
              type="button"
              onClick={() => setRadiusMode('full')}
              aria-pressed={radiusMode === 'full'}
              className={`join-item btn btn-xs flex-1 ${
                radiusMode === 'full' ? 'btn-neutral' : 'btn-outline border-base-300'
              }`}
              title="Raio = 1× Autonomia (salto contínuo entre postos)"
            >
              1× ({formatNumber(autonomyKm, 0)} km)
            </button>
          </div>

          {viewMode === 'map' && (
            <>
              <div
                className="join w-full"
                role="group"
                aria-label="Estilo visual da área de autonomia"
              >
                <button
                  type="button"
                  onClick={() => setCoverageVisualMode('route')}
                  aria-pressed={coverageVisualMode === 'route'}
                  className={`join-item btn btn-xs flex-1 ${
                    coverageVisualMode === 'route'
                      ? 'btn-primary'
                      : 'btn-outline border-base-300'
                  }`}
                  title="Destaca trechos cobertos e desertos na rota; anel aparece ao passar o mouse no posto"
                >
                  Na Rota
                </button>
                <button
                  type="button"
                  onClick={() => setCoverageVisualMode('unified')}
                  aria-pressed={coverageVisualMode === 'unified'}
                  className={`join-item btn btn-xs flex-1 ${
                    coverageVisualMode === 'unified'
                      ? 'btn-primary'
                      : 'btn-outline border-base-300'
                  }`}
                  title="Zona contínua unificada sem acúmulo escuro de transparência"
                >
                  Unificada
                </button>
                <button
                  type="button"
                  onClick={() => setCoverageVisualMode('rings')}
                  aria-pressed={coverageVisualMode === 'rings'}
                  className={`join-item btn btn-xs flex-1 ${
                    coverageVisualMode === 'rings'
                      ? 'btn-primary'
                      : 'btn-outline border-base-300'
                  }`}
                  title="Contornos individuais finos sem preenchimento"
                >
                  Contornos
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onFocusCorridor}
                  className={`btn btn-xs flex-1 gap-1 ${
                    viewportScope === 'corridor'
                      ? 'btn-secondary btn-outline'
                      : 'btn-ghost'
                  }`}
                >
                  <Compass className="h-3 w-3" aria-hidden="true" />
                  <span>Focar Eixo</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewportScopeChange('brazil')}
                  className={`btn btn-xs flex-1 gap-1 ${
                    viewportScope === 'brazil' ? 'btn-secondary btn-outline' : 'btn-ghost'
                  }`}
                >
                  <Maximize2 className="h-3 w-3" aria-hidden="true" />
                  <span>Brasil Completo</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live Coverage Diagnostics Strip */}
      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
        <div className="bg-base-200/40 border-base-200 flex items-center justify-between rounded-lg border p-3">
          <div>
            <span className="text-base-content/60 block text-[11px]">
              Pontos no Eixo ({selectedCorridor.highways?.join(' / ') || 'Rota'})
            </span>
            <span className="text-base-content font-mono text-base font-bold">
              {corridorStationsCount} hubs mapeados
            </span>
          </div>
          <span className="text-base-content/60 font-mono text-[11px]">
            Raio: {formatNumber(effectiveRadiusKm, 0)} km
          </span>
        </div>

        <div className="bg-base-200/40 border-base-200 flex items-center justify-between rounded-lg border p-3">
          <div>
            <span className="text-base-content/60 block text-[11px]">
              Cobertura Geográfica Estimada
            </span>
            <span className="text-base-content font-mono text-base font-bold">
              {formatNumber(coverageStats.coveredPercent, 0)}% do traçado
            </span>
          </div>
          <div className="bg-base-300 h-2 w-20 overflow-hidden rounded-full">
            <div
              className={`h-full ${
                coverageStats.coveredPercent >= 90
                  ? 'bg-emerald-500'
                  : coverageStats.coveredPercent >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, coverageStats.coveredPercent)}%` }}
            />
          </div>
        </div>

        <div
          className={`flex items-center gap-2.5 rounded-lg border p-3 ${
            coverageStats.hasOperationalDesert
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          }`}
        >
          {coverageStats.hasOperationalDesert ? (
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <div>
            <span className="block text-[11px] font-bold tracking-wider uppercase">
              {coverageStats.hasOperationalDesert
                ? 'Deserto Operacional Detectado'
                : 'Cobertura Contínua no Eixo'}
            </span>
            <span className="font-mono text-xs font-semibold">
              {coverageStats.hasOperationalDesert
                ? `Vão máximo descoberto: ~${formatNumber(coverageStats.maxUncoveredSpanKm, 0)} km`
                : 'Sem trechos descobertos para este raio'}
            </span>
          </div>
        </div>
      </div>

      {/* Screen-reader live summary */}
      <div className="sr-only" aria-live="polite">
        {summaryText}
      </div>

      {/* Map Container (always mounted, toggled via hidden/block to keep ECharts DOM isolated) */}
      <div key="map-panel" className={viewMode === 'map' ? 'block space-y-3' : 'hidden'}>
        <div className="border-base-200 bg-base-200/20 relative overflow-hidden rounded-xl border">
          <div
            ref={chartContainerRef}
            className="h-115 w-full sm:h-135"
            role="img"
            aria-label={summaryText}
          />

          {/* Floating Legend */}
          <div className="border-base-200 bg-base-100/95 text-base-content/80 flex flex-wrap items-center gap-4 border-t px-4 py-2.5 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-1 w-3.5 rounded-full bg-emerald-600" />
              <span>Trecho Coberto</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-1 w-3.5 border-b-2 border-dashed border-rose-600" />
              <span>Deserto Operacional</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>GNV / Biometano</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-500" />
              <span>Eletroposto HPC (&gt;150 kW)</span>
            </span>
            <span className="text-base-content/60 ml-auto text-[10px]">
              Passe o mouse sobre um posto para ver o anel de{' '}
              {formatNumber(effectiveRadiusKm, 0)} km
            </span>
          </div>
        </div>

        <p className="text-base-content/65 text-xs italic">{summaryText}</p>
      </div>

      {/* Accessible Table Panel */}
      <div
        key="table-panel"
        className={viewMode === 'table' ? 'block space-y-4' : 'hidden'}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-base-content/60 mr-1 text-xs">Filtrar UF:</span>
            {availableTableUfs.map((uf) => (
              <button
                key={uf}
                type="button"
                onClick={() => setTableUfFilter(uf)}
                className={`btn btn-xs ${
                  tableUfFilter === uf ? 'btn-neutral' : 'btn-ghost'
                }`}
              >
                {uf}
              </button>
            ))}
          </div>
          <span className="text-base-content/60 text-xs">
            Exibindo {tableStations.length} pontos rodoviários
          </span>
        </div>

        <div className="border-base-200 overflow-x-auto rounded-lg border">
          <table className="table-xs sm:table-sm table-zebra table w-full">
            <caption className="sr-only">
              Lista de pontos rodoviários de abastecimento e recarga rápida
            </caption>
            <thead>
              <tr className="border-base-200 text-base-content/70 border-b text-xs font-semibold uppercase">
                <th>Ponto / Hub</th>
                <th>Tecnologia</th>
                <th>Rodovia</th>
                <th>Localização</th>
                <th>Especificação</th>
                <th>Status</th>
                <th>Fonte / Selo</th>
              </tr>
            </thead>
            <tbody>
              {tableStations.map((st) => (
                <tr key={st.id} className="hover:bg-base-200/40">
                  <td className="text-xs font-semibold">
                    {st.name}
                    {st.operator_network && (
                      <span className="text-base-content/60 block text-[10px] font-normal">
                        {st.operator_network}
                      </span>
                    )}
                  </td>
                  <td className="text-xs whitespace-nowrap">
                    {st.technology === 'biomethane_cng' ? (
                      <span className="badge badge-xs badge-success">
                        GNV / Biometano
                      </span>
                    ) : (
                      <span className="badge badge-xs badge-info">HPC &gt;150 kW</span>
                    )}
                  </td>
                  <td className="font-mono text-xs whitespace-nowrap">
                    {st.highway}
                    {st.km_marker != null ? ` km ${formatNumber(st.km_marker, 0)}` : ''}
                  </td>
                  <td className="text-xs whitespace-nowrap">
                    {st.city} / <span className="font-semibold">{st.state}</span>
                  </td>
                  <td className="text-base-content/80 text-xs">{st.capacity_spec}</td>
                  <td className="text-xs whitespace-nowrap">{st.status}</td>
                  <td className="text-xs whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <SourceRef
                        id={st.source_id}
                        context={`${st.name} (${st.highway})`}
                      />
                      <span className="text-base-content/60 text-[11px]">
                        ({st.badge})
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attribution Footer */}
      <div className="border-base-200 text-base-content/60 flex flex-col justify-between gap-2 border-t pt-3 text-[11px] sm:flex-row sm:items-center">
        <span>
          Nota: Pontos rodoviários agregados em nível de hub/entroncamento (sem exposição
          de dados cadastrais individuais).
        </span>
        <span className="leading-relaxed">
          Fontes: IBGE Malha UF{' '}
          <SourceRef id="I14" context="Malha Territorial UF (Mapa)" />, ANP{' '}
          <SourceRef id="I09" context="Corredores Sustentáveis do Paraná" />, SCGÁS{' '}
          <SourceRef id="I16" context="Rede GNV Naturgy São Paulo Sul" />, Compagás{' '}
          <SourceRef id="I07" context="Revendedores de Combustíveis e GNV" />, Necta{' '}
          <SourceRef id="I15" context="Rede GNV/Biometano Necta (SP)" />, Naturgy SP Sul{' '}
          <SourceRef id="P09" context="Rede de Postos GNV/Biometano SCGÁS" /> &amp;
          ABVE/Tupi <SourceRef id="I01" context="Mapeamento Nacional de Eletropostos" />
        </span>
      </div>
    </section>
  );
};
