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
import { getChartTheme } from '../../lib/theme/chartTheme';
import { FUEL_THEME } from '../../lib/theme/fuels';
import { useDarkMode } from '../../lib/theme/useDarkMode';
import { escapeHtml, formatNumber } from '../../lib/utils/format';
import { useDebouncedValue } from '../../lib/utils/useDebouncedValue';
import { SourceRef } from '../common/SourceRef';
import { useSharedCorridorSelection } from './corridorSelection';
import {
  buildCorridorCoverageSegments,
  computeCorridorCoverageStats,
  createGeodesicCircleCoords,
  DEFAULT_CORRIDOR_DETOUR_KM,
  getCorridorViewport,
  getEffectiveRadiusKm,
  OPERATIONAL_DESERT_MIN_GAP_KM,
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
  stations: FuelStation[];
  initialCorridorId?: string;
}

const AUTONOMY_PRESETS = [
  { id: 'bev', label: 'Elétrico BEV', km: 350, sourceId: 'V08', badge: 'Adaptada' },
  {
    id: 'bio-gnc',
    label: 'Biometano Bio-GNC',
    km: 650,
    sourceId: 'V07',
    badge: 'Adaptada',
  },
  {
    id: 'bio-gnl',
    label: 'GNL Estendido',
    km: 1400,
    sourceId: null,
    badge: 'Ilustrativa',
  },
] as const;

const COLORS = {
  biomethane: FUEL_THEME.biometano.hex,
  biomethaneUnifiedFill: FUEL_THEME.biometano.fillRgba,
  biomethaneStroke: FUEL_THEME.biometano.strokeRgba,
  electric: FUEL_THEME.eletrico.hex,
  electricUnifiedFill: FUEL_THEME.eletrico.fillRgba,
  electricStroke: FUEL_THEME.eletrico.strokeRgba,
  corridorCovered: FUEL_THEME.biometano.hex,
  corridorCoveredElectric: FUEL_THEME.eletrico.hex,
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
  stations,
  initialCorridorId,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  const lastViewportKeyRef = useRef<string>('');

  const defaultCorridorId =
    initialCorridorId ?? corridors[0]?.id ?? 'rondonopolis-santos';
  const [selectedCorridorId, setSelectedCorridorId] =
    useSharedCorridorSelection(defaultCorridorId);
  const [viewportScope, setViewportScope] = useState<'corridor' | 'brazil'>('corridor');
  const [viewportTick, setViewportTick] = useState<number>(0);
  const [brazilGeoJson, setBrazilGeoJson] = useState<unknown>(null);

  const selectedCorridor = useMemo(() => {
    return corridors.find((c) => c.id === selectedCorridorId) ?? corridors[0];
  }, [corridors, selectedCorridorId]);

  const handleSelectCorridor = (corridorId: string) => {
    setSelectedCorridorId(corridorId);
    setViewportScope('corridor');
    setViewportTick((t) => t + 1);
  };

  // Lazy-load Brazil UF GeoJSON only once this island is hydrated via client:visible
  useEffect(() => {
    let active = true;
    import('../../../../data/processed/brazil_states.geo.json').then((mod) => {
      if (active) {
        setBrazilGeoJson('default' in mod ? mod.default : mod);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const [viewMode, setViewMode] = useState<'map' | 'table'>('map');
  const [showBiomethaneCng, setShowBiomethaneCng] = useState<boolean>(true);
  const [showElectricHpc, setShowElectricHpc] = useState<boolean>(false);
  const [onlySelectedCorridorStations, setOnlySelectedCorridorStations] =
    useState<boolean>(false);
  const [autonomyKm, setAutonomyKm] = useState<number>(650);
  const [radiusMode, setRadiusMode] = useState<CoverageRadiusMode>('half');
  const [coverageVisualMode, setCoverageVisualMode] =
    useState<CoverageVisualMode>('route');
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [tableUfFilter, setTableUfFilter] = useState<string>('TODOS');
  const isDark = useDarkMode();

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

  const liveSummaryText = useDebouncedValue(summaryText, 600);

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
    if (!chartContainerRef.current || !brazilGeoJson) return;

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

    const chartTheme = getChartTheme(isDark);

    const coveredRouteColor =
      showBiomethaneCng && !showElectricHpc
        ? COLORS.corridorCovered
        : !showBiomethaneCng && showElectricHpc
          ? COLORS.corridorCoveredElectric
          : chartTheme.corridorMixed;

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

    const areaColor = chartTheme.mapArea;
    const borderColor = chartTheme.mapBorder;
    const emphasisAreaColor = chartTheme.mapEmphasis;

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
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: {
          color: chartTheme.tooltipText,
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
                <div style="font-weight:700;margin-bottom:3px;">${escapeHtml(st.name)}</div>
                <div style="font-size:11px;margin-bottom:4px;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${badgeColor};margin-right:5px;"></span>
                  <strong>${escapeHtml(techLabel)}</strong> (${escapeHtml(st.status)})
                </div>
                <div style="font-size:11px;opacity:0.9;">
                  <div><strong>Rodovia:</strong> ${escapeHtml(st.highway)}${escapeHtml(kmInfo)}</div>
                  <div><strong>Local:</strong> ${escapeHtml(st.city)} / ${escapeHtml(st.state)}</div>
                  <div><strong>Capacidade:</strong> ${escapeHtml(st.capacity_spec)}</div>
                  ${st.operator_network ? `<div><strong>Rede:</strong> ${escapeHtml(st.operator_network)}</div>` : ''}
                  <div style="margin-top:4px;font-size:11px;opacity:0.8;">Anel exibido no mapa: ${escapeHtml(formatNumber(effectiveRadiusKm, 0))} km • Fonte: ${escapeHtml(st.source_id)} (${escapeHtml(st.badge)})</div>
                </div>
              </div>
            `;
          }

          return escapeHtml(item.name ?? '');
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
            color: chartTheme.corridorOther,
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
            color: chartTheme.corridorUncovered,
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
      className="bg-base-100 border-base-300/70 space-y-4 rounded-xl border p-4"
    >
      {/* Header + Local Corridor Selector + View Mode Toggle */}
      <div className="border-base-300/60 flex flex-col justify-between gap-3 border-b pb-3 lg:flex-row lg:items-center">
        <h3
          id="infra-map-heading"
          className="text-base-content text-sm font-bold sm:text-base"
        >
          Mapa de Infraestrutura &amp; Cobertura por Autonomia
        </h3>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label
              htmlFor="map-corridor-select"
              className="text-base-content/70 text-xs font-semibold whitespace-nowrap"
            >
              Eixo
            </label>
            <select
              id="map-corridor-select"
              value={selectedCorridor.id}
              onChange={(e) => handleSelectCorridor(e.target.value)}
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
      <div className="bg-base-200/45 border-base-300/60 grid grid-cols-1 gap-3.5 rounded-xl border p-3.5 lg:grid-cols-12">
        {/* Network & Layer Toggles */}
        <div className="space-y-2 lg:col-span-5">
          <div className="text-base-content/65 text-[11px] font-bold tracking-wider uppercase">
            Redes no Mapa
          </div>
          <div className="flex flex-wrap gap-2">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${FUEL_THEME.biometano.chipClass}`}
            >
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-primary"
                checked={showBiomethaneCng}
                onChange={(e) => setShowBiomethaneCng(e.target.checked)}
              />
              <Fuel
                className={`h-3.5 w-3.5 ${FUEL_THEME.biometano.iconClass}`}
                aria-hidden="true"
              />
              <span>GNV / Biometano</span>
            </label>

            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${FUEL_THEME.eletrico.chipClass}`}
            >
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-primary"
                checked={showElectricHpc}
                onChange={(e) => setShowElectricHpc(e.target.checked)}
              />
              <Zap
                className={`h-3.5 w-3.5 ${FUEL_THEME.eletrico.iconClass}`}
                aria-hidden="true"
              />
              <span>Eletropostos HPC (&gt;150 kW)</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <label className="text-base-content/80 inline-flex cursor-pointer items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                className="checkbox checkbox-xs checkbox-primary"
                checked={onlySelectedCorridorStations}
                onChange={(e) => setOnlySelectedCorridorStations(e.target.checked)}
              />
              <span>Apenas pontos do eixo selecionado</span>
            </label>
          </div>
        </div>

        {/* Autonomy Slider + Presets */}
        <div className="space-y-2 lg:col-span-4">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="autonomy-slider"
              className="text-base-content/65 text-[11px] font-bold tracking-wider uppercase"
            >
              Autonomia
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
              <div key={preset.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAutonomyKm(preset.km)}
                  className={`btn btn-xs ${
                    autonomyKm === preset.km
                      ? 'btn-primary'
                      : 'btn-outline border-base-300'
                  }`}
                >
                  {preset.label} ({formatNumber(preset.km, 0)} km)
                </button>
                {preset.sourceId && (
                  <SourceRef
                    id={preset.sourceId}
                    context={`Autonomia de referência: ${preset.label}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Radius Mode + Visual Style + Map Framing */}
        <div className="space-y-2 lg:col-span-3">
          <div className="text-base-content/65 text-[11px] font-bold tracking-wider uppercase">
            Cobertura &amp; Enquadramento
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
                radiusMode === 'half' ? 'btn-primary' : 'btn-outline border-base-300'
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
                radiusMode === 'full' ? 'btn-primary' : 'btn-outline border-base-300'
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
                  onClick={() => {
                    setViewportScope('corridor');
                    setViewportTick((t) => t + 1);
                  }}
                  className={`btn btn-xs flex-1 gap-1 ${
                    viewportScope === 'corridor'
                      ? 'btn-primary btn-outline'
                      : 'btn-ghost text-base-content/70'
                  }`}
                >
                  <Compass className="h-3 w-3" aria-hidden="true" />
                  <span>Focar Eixo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewportScope('brazil')}
                  className={`btn btn-xs flex-1 gap-1 ${
                    viewportScope === 'brazil'
                      ? 'btn-primary btn-outline'
                      : 'btn-ghost text-base-content/70'
                  }`}
                >
                  <Maximize2 className="h-3 w-3" aria-hidden="true" />
                  <span>Brasil</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Live Coverage Diagnostics Strip */}
      <div className="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-3">
        <div className="bg-base-200/45 border-base-300/60 flex items-center justify-between rounded-lg border p-3">
          <div>
            <span className="text-base-content/65 block text-[11px]">
              Hubs na Rota (≤{DEFAULT_CORRIDOR_DETOUR_KM} km)
            </span>
            <span className="text-base-content font-mono text-sm font-bold">
              {coverageStats.onRouteStationsCount} elegíveis{' '}
              <span className="text-base-content/60 font-sans text-[11px] font-normal">
                ({corridorStationsCount} no eixo)
              </span>
            </span>
          </div>
          <span className="text-base-content/70 font-mono text-[11px]">
            R: {formatNumber(effectiveRadiusKm, 0)} km
          </span>
        </div>

        <div className="bg-base-200/45 border-base-300/60 flex items-center justify-between rounded-lg border p-3">
          <div>
            <span className="text-base-content/65 block text-[11px]">
              Cobertura no Traçado
            </span>
            <span className="text-base-content font-mono text-sm font-bold">
              {formatNumber(coverageStats.coveredPercent, 0)}%
            </span>
          </div>
          <div className="bg-base-300 h-2 w-20 overflow-hidden rounded-full">
            <div
              className={`h-full ${
                coverageStats.coveredPercent >= 90
                  ? 'bg-success'
                  : coverageStats.coveredPercent >= 60
                    ? 'bg-warning'
                    : 'bg-error'
              }`}
              style={{ width: `${Math.min(100, coverageStats.coveredPercent)}%` }}
            />
          </div>
        </div>

        <div
          className={`flex items-center gap-2.5 rounded-lg border p-3 ${
            coverageStats.hasOperationalDesert
              ? 'border-error/35 bg-error/10 text-error'
              : 'border-success/35 bg-success/10 text-success'
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
                ? `Deserto (≥${OPERATIONAL_DESERT_MIN_GAP_KM} km)`
                : 'Cobertura Contínua'}
            </span>
            <span className="font-mono text-xs font-semibold">
              {coverageStats.hasOperationalDesert
                ? `Vão máx.: ~${formatNumber(coverageStats.maxUncoveredSpanKm, 0)} km`
                : 'Sem vãos descobertos'}
            </span>
          </div>
        </div>
      </div>

      {/* Screen-reader live summary (debounced during rapid slider drags) */}
      <div className="sr-only" aria-live="polite">
        {liveSummaryText}
      </div>

      {/* Map Container (always mounted, toggled via hidden/block to keep ECharts DOM isolated) */}
      <div key="map-panel" className={viewMode === 'map' ? 'block' : 'hidden'}>
        <div className="border-base-300/70 bg-base-200/20 relative overflow-hidden rounded-xl border">
          <div className="relative">
            <div
              ref={chartContainerRef}
              className="h-108 w-full sm:h-128"
              role="img"
              aria-label={summaryText}
            />
            {!brazilGeoJson && (
              <div className="text-base-content/70 pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium">
                Carregando malha territorial...
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="border-base-300/60 bg-base-100/95 text-base-content/80 flex flex-wrap items-center gap-4 border-t px-3.5 py-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="bg-primary inline-block h-1 w-3.5 rounded-full" />
              <span>Trecho Coberto</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="border-error inline-block h-1 w-3.5 border-b-2 border-dashed" />
              <span>Deserto Operacional</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${FUEL_THEME.biometano.dotClass}`}
              />
              <span>GNV / Biometano</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${FUEL_THEME.eletrico.dotClass}`}
              />
              <span>Eletroposto HPC</span>
            </span>
            <span className="text-base-content/65 ml-auto text-[11px]">
              Passe o mouse no posto para ver o raio ({formatNumber(effectiveRadiusKm, 0)}{' '}
              km)
            </span>
          </div>
        </div>
      </div>

      {/* Accessible Table Panel */}
      <div
        key="table-panel"
        className={viewMode === 'table' ? 'block space-y-3' : 'hidden'}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-base-content/70 mr-1 text-xs">UF:</span>
            {availableTableUfs.map((uf) => (
              <button
                key={uf}
                type="button"
                onClick={() => setTableUfFilter(uf)}
                className={`btn btn-xs ${
                  tableUfFilter === uf ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                {uf}
              </button>
            ))}
          </div>
          <span className="text-base-content/70 text-xs">
            {tableStations.length} pontos
          </span>
        </div>

        <div className="border-base-300/70 overflow-x-auto rounded-lg border">
          <table className="table-xs sm:table-sm table-zebra table w-full">
            <caption className="sr-only">
              Lista de pontos rodoviários de abastecimento e recarga rápida
            </caption>
            <thead>
              <tr className="border-base-300/70 text-base-content/75 border-b text-xs font-semibold uppercase">
                <th>Ponto / Hub</th>
                <th>Tecnologia</th>
                <th>Rodovia</th>
                <th>Localização</th>
                <th>Especificação</th>
                <th>Status</th>
                <th>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {tableStations.map((st) => (
                <tr key={st.id} className="hover:bg-base-200/40">
                  <td className="text-xs font-semibold">
                    {st.name}
                    {st.operator_network && (
                      <span className="text-base-content/65 block text-[11px] font-normal">
                        {st.operator_network}
                      </span>
                    )}
                  </td>
                  <td className="text-xs whitespace-nowrap">
                    {st.technology === 'biomethane_cng' ? (
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${FUEL_THEME.biometano.badgeClass}`}
                      >
                        GNV / Biometano
                      </span>
                    ) : (
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${FUEL_THEME.eletrico.badgeClass}`}
                      >
                        HPC &gt;150 kW
                      </span>
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
                      <span className="text-base-content/65 text-[11px]">
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
      <div className="border-base-300/60 text-base-content/65 flex flex-col justify-between gap-2 border-t pt-2.5 text-[11px] sm:flex-row sm:items-center">
        <span>Hubs agregados por entroncamento (sem dados individuais de postos).</span>
        <span className="leading-relaxed">
          Fontes: IBGE <SourceRef id="I14" context="Malha Territorial UF (Mapa)" /> · ANP{' '}
          <SourceRef id="I09" context="Corredores Sustentáveis do Paraná" /> · SCGÁS{' '}
          <SourceRef id="P09" context="Rede de Postos GNV/Biometano SCGÁS" /> · Compagás{' '}
          <SourceRef id="I07" context="Revendedores de Combustíveis e GNV" /> · Necta{' '}
          <SourceRef id="I15" context="Rede GNV/Biometano Necta (SP)" /> · Naturgy{' '}
          <SourceRef id="I16" context="Rede GNV Naturgy São Paulo Sul" /> · ABVE/Tupi{' '}
          <SourceRef id="I01" context="Mapeamento Nacional de Eletropostos" />
        </span>
      </div>
    </section>
  );
};
