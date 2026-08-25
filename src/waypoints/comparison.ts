/**
 * Route comparison engine for measuring divergence between tracks
 */

import type { GPXPoint } from '../gpx/types.js';

/**
 * Result of divergence analysis between two tracks
 */
export interface DivergenceResult {
  /** Maximum distance in meters */
  maxDistance: number;
  /** Index in original track where max divergence occurs */
  maxIndex: number;
  /** The point of maximum divergence */
  maxPoint: GPXPoint;
  /** Distance in meters for each point in the original track */
  divergenceProfile: number[];
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
export function haversineDistance(p1: GPXPoint, p2: GPXPoint): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate perpendicular distance from a point to a line segment
 * Returns the distance in meters
 */
export function pointToSegmentDistance(
  point: GPXPoint,
  segStart: GPXPoint,
  segEnd: GPXPoint
): number {
  // Convert to approximate meters for calculation
  const latRad = ((segStart.lat + segEnd.lat) / 2) * (Math.PI / 180);
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latRad);

  // Convert points to meters relative to segStart
  const px = (point.lng - segStart.lng) * metersPerDegLng;
  const py = (point.lat - segStart.lat) * metersPerDegLat;
  const sx = 0;
  const sy = 0;
  const ex = (segEnd.lng - segStart.lng) * metersPerDegLng;
  const ey = (segEnd.lat - segStart.lat) * metersPerDegLat;

  // Segment vector
  const dx = ex - sx;
  const dy = ey - sy;
  const segLenSq = dx * dx + dy * dy;

  // If segment is a point, return distance to that point
  if (segLenSq === 0) {
    return Math.sqrt(px * px + py * py);
  }

  // Project point onto segment, clamping to [0, 1]
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));
  const projX = sx + t * dx;
  const projY = sy + t * dy;

  // Distance from point to projection
  const distX = px - projX;
  const distY = py - projY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Find the minimum distance from a point to any segment in the track
 * Uses early exit optimization: stops checking segments once we're past
 * the point's approximate position along the track
 */
function minDistanceToTrack(
  point: GPXPoint,
  track: GPXPoint[],
  startIndex: number = 0
): number {
  if (track.length === 0) return Infinity;
  if (track.length === 1) return haversineDistance(point, track[0]);

  let minDist = Infinity;

  // Check segments starting from startIndex
  for (let i = startIndex; i < track.length - 1; i++) {
    const dist = pointToSegmentDistance(point, track[i], track[i + 1]);
    minDist = Math.min(minDist, dist);

    // Early exit: if we've found a very close match, stop searching
    if (dist < 1) return dist; // Within 1 meter, good enough
  }

  // Also check the last point
  const lastPointDist = haversineDistance(point, track[track.length - 1]);
  minDist = Math.min(minDist, lastPointDist);

  return minDist;
}

/**
 * Find point of maximum divergence between two tracks
 * Uses segment-based comparison for accuracy and early exit for performance
 *
 * @param original - The original track to analyze
 * @param routed - The reference track to compare against
 * @returns Divergence result with max distance, index, point, and full profile
 */
export function findMaxDivergence(
  original: GPXPoint[],
  routed: GPXPoint[]
): DivergenceResult {
  if (original.length === 0) {
    return {
      maxDistance: 0,
      maxIndex: 0,
      maxPoint: { lat: 0, lng: 0 },
      divergenceProfile: [],
    };
  }

  const divergenceProfile: number[] = new Array(original.length);
  let maxDistance = 0;
  let maxIndex = 0;
  let maxPoint = original[0];

  // For each point in original track, find minimum distance to routed track
  for (let i = 0; i < original.length; i++) {
    const minDist = minDistanceToTrack(original[i], routed);
    divergenceProfile[i] = minDist;

    if (minDist > maxDistance) {
      maxDistance = minDist;
      maxIndex = i;
      maxPoint = original[i];
    }
  }

  return {
    maxDistance,
    maxIndex,
    maxPoint,
    divergenceProfile,
  };
}
