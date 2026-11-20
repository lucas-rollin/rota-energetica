import type { FreightCorridor, FuelStation } from '../types/catalogs';

const EARTH_RADIUS_KM = 6371.0;
const MERCATOR_MAX_LAT = 85.05112878;

/**
 * Conformal Web Mercator forward projection matching ECharts geo screen space (Y down).
 */
export function projectWebMercator([lon, lat]: [number, number]): [number, number] {
  const clampedLat = Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat));
  const x = (lon * Math.PI) / 180;
  const y = -Math.log(Math.tan(Math.PI / 4 + (clampedLat * Math.PI) / 360));
  return [x, y];
}

/**
 * Conformal Web Mercator inverse projection back to [longitude, latitude].
 */
export function unprojectWebMercator([x, y]: [number, number]): [number, number] {
  const lon = (x * 180) / Math.PI;
  const lat = (2 * Math.atan(Math.exp(-y)) - Math.PI / 2) * (180 / Math.PI);
  return [lon, lat];
}

export type CoverageRadiusMode = 'full' | 'half';

export interface CorridorCoverageSegment {
  covered: boolean;
  coords: [number, number][];
}

export interface CorridorCoverageStats {
  activeStationsCount: number;
  coveredPercent: number;
  maxUncoveredSpanKm: number;
  sampledRouteKm: number;
  hasOperationalDesert: boolean;
}

export interface MapViewport {
  center: [number, number];
  zoom: number;
}

/**
 * Compute great-circle Haversine distance in kilometers between two WGS84 points.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Effective coverage radius in km given vehicle autonomy and operational mode.
 */
export function getEffectiveRadiusKm(
  autonomyKm: number,
  mode: CoverageRadiusMode
): number {
  const safeAutonomy = Math.max(0, autonomyKm);
  return mode === 'half' ? safeAutonomy / 2 : safeAutonomy;
}

/**
 * Generate a closed geodesic ring of [longitude, latitude] vertices around a point.
 */
export function createGeodesicCircleCoords(
  lon: number,
  lat: number,
  radiusKm: number,
  steps = 32
): [number, number][] {
  if (radiusKm <= 0) {
    return [[lon, lat]];
  }

  const angularDistance = radiusKm / EARTH_RADIUS_KM;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAng = Math.sin(angularDistance);
  const cosAng = Math.cos(angularDistance);

  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(sinLat1 * cosAng + cosLat1 * sinAng * Math.cos(theta));
    const lon2 =
      lon1 +
      Math.atan2(Math.sin(theta) * sinAng * cosLat1, cosAng - sinLat1 * Math.sin(lat2));

    coords.push([(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }

  return coords;
}

/**
 * Sample a corridor's [lon, lat] polyline at approximately `stepKm` intervals.
 */
export function sampleCorridorRoute(
  waypoints: [number, number][],
  stepKm = 10
): { points: [number, number][]; totalKm: number } {
  if (waypoints.length === 0) {
    return { points: [], totalKm: 0 };
  }
  if (waypoints.length === 1) {
    return { points: [waypoints[0]], totalKm: 0 };
  }

  const points: [number, number][] = [waypoints[0]];
  let totalKm = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lonA, latA] = waypoints[i];
    const [lonB, latB] = waypoints[i + 1];
    const segKm = haversineDistanceKm(latA, lonA, latB, lonB);
    totalKm += segKm;

    const divisions = Math.max(1, Math.ceil(segKm / stepKm));
    for (let d = 1; d <= divisions; d++) {
      const t = d / divisions;
      points.push([lonA + (lonB - lonA) * t, latA + (latB - latA) * t]);
    }
  }

  return { points, totalKm };
}

/**
 * Compute coverage percentage and longest uncovered gap along a corridor polyline.
 */
export function computeCorridorCoverageStats(
  corridor: FreightCorridor,
  stations: FuelStation[],
  effectiveRadiusKm: number
): CorridorCoverageStats {
  const waypoints = corridor.route_waypoints ?? [];
  const { points, totalKm } = sampleCorridorRoute(waypoints, 10);

  if (points.length === 0) {
    return {
      activeStationsCount: stations.length,
      coveredPercent: 0,
      maxUncoveredSpanKm: corridor.distance_km,
      sampledRouteKm: corridor.distance_km,
      hasOperationalDesert: true,
    };
  }

  if (stations.length === 0) {
    return {
      activeStationsCount: 0,
      coveredPercent: 0,
      maxUncoveredSpanKm: Math.round(totalKm),
      sampledRouteKm: Math.round(totalKm),
      hasOperationalDesert: true,
    };
  }

  let coveredCount = 0;
  let currentUncoveredRun = 0;
  let maxUncoveredRun = 0;

  const avgStepKm = points.length > 1 ? totalKm / (points.length - 1) : 0;

  for (const [lon, lat] of points) {
    let minStationDist = Infinity;
    for (const st of stations) {
      const d = haversineDistanceKm(lat, lon, st.latitude, st.longitude);
      if (d < minStationDist) {
        minStationDist = d;
      }
    }

    if (minStationDist <= effectiveRadiusKm) {
      coveredCount++;
      currentUncoveredRun = 0;
    } else {
      currentUncoveredRun++;
      if (currentUncoveredRun > maxUncoveredRun) {
        maxUncoveredRun = currentUncoveredRun;
      }
    }
  }

  const coveredPercent = (coveredCount / points.length) * 100;
  const maxUncoveredSpanKm = Math.round(maxUncoveredRun * avgStepKm);

  return {
    activeStationsCount: stations.length,
    coveredPercent,
    maxUncoveredSpanKm,
    sampledRouteKm: Math.round(totalKm),
    hasOperationalDesert: maxUncoveredSpanKm >= 20,
  };
}

/**
 * Split a corridor's polyline into contiguous covered vs uncovered segments.
 */
export function buildCorridorCoverageSegments(
  corridor: FreightCorridor,
  stations: FuelStation[],
  effectiveRadiusKm: number
): CorridorCoverageSegment[] {
  const waypoints = corridor.route_waypoints ?? [];
  const { points } = sampleCorridorRoute(waypoints, 10);

  if (points.length < 2) {
    return [];
  }

  const segments: CorridorCoverageSegment[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const ptA = points[i];
    const ptB = points[i + 1];
    const midLon = (ptA[0] + ptB[0]) / 2;
    const midLat = (ptA[1] + ptB[1]) / 2;

    let minDist = Infinity;
    for (const st of stations) {
      const d = haversineDistanceKm(midLat, midLon, st.latitude, st.longitude);
      if (d < minDist) {
        minDist = d;
      }
    }

    const isCovered = minDist <= effectiveRadiusKm;
    const last = segments[segments.length - 1];
    if (last && last.covered === isCovered) {
      last.coords.push(ptB);
    } else {
      segments.push({
        covered: isCovered,
        coords: [ptA, ptB],
      });
    }
  }

  return segments;
}

/**
 * Compute ECharts Geo center & zoom to frame a selected corridor or full Brazil.
 */
export function getCorridorViewport(corridor: FreightCorridor | null): MapViewport {
  const brazilDefault: MapViewport = {
    center: [-52.5, -14.8],
    zoom: 1.12,
  };

  if (!corridor?.route_waypoints || corridor.route_waypoints.length === 0) {
    return brazilDefault;
  }

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lon, lat] of corridor.route_waypoints) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const [minX, minY] = projectWebMercator([minLon, maxLat]);
  const [maxX, maxY] = projectWebMercator([maxLon, minLat]);
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const spanX = Math.max(maxX - minX, 0.045);
  const spanY = Math.max(maxY - minY, 0.045);

  const zoom = Math.min(
    6.5,
    Math.max(1.4, 0.72 * Math.min(0.684 / spanX, 0.708 / spanY))
  );

  return {
    center: [Number(centerLon.toFixed(3)), Number(centerLat.toFixed(3))],
    zoom: Number(zoom.toFixed(2)),
  };
}
