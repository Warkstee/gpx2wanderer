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
 * Result of finding minimum distance to a track segment
 */
interface SegmentDistanceResult {
  /** Distance in meters */
  distance: number;
  /** Index of the closest segment (between point i and i+1) */
  segmentIndex: number;
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
 * 
 * @returns Object with distance and the index of the closest segment
 */
function minDistanceToTrack(
  point: GPXPoint,
  track: GPXPoint[],
  startIndex: number = 0
): SegmentDistanceResult {
  if (track.length === 0) return { distance: Infinity, segmentIndex: 0 };
  if (track.length === 1) return { distance: haversineDistance(point, track[0]), segmentIndex: 0 };

  let minDist = Infinity;
  let minSegmentIndex = startIndex;

  // Check segments starting from startIndex
  for (let i = startIndex; i < track.length - 1; i++) {
    const dist = pointToSegmentDistance(point, track[i], track[i + 1]);
    if (dist < minDist) {
      minDist = dist;
      minSegmentIndex = i;
    }

    // Early exit: if we've found a very close match, stop searching
    if (dist < 1) return { distance: dist, segmentIndex: i }; // Within 1 meter, good enough
  }

  // Also check the last point
  const lastPointDist = haversineDistance(point, track[track.length - 1]);
  if (lastPointDist < minDist) {
    minDist = lastPointDist;
    minSegmentIndex = track.length - 2; // Last segment
  }

  return { distance: minDist, segmentIndex: minSegmentIndex };
}

/**
 * Find point of maximum divergence between two tracks
 * Uses ordered traversal to ensure we compare points in sequence
 * 
 * Algorithm:
 * - Traverse original track points in order
 * - For each point, find closest segment in routed track starting from last matched segment
 * - This prevents "up the road" false positives where a point matches a segment far ahead
 * - Multiple original points can match the same segment (when routed track is denser)
 * - We never go backwards to earlier segments
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
  
  // Track the last matched segment index for ordered traversal
  // Start at 0, only move forward
  let lastSegmentIndex = 0;

  // For each point in original track, find minimum distance to routed track
  // using ordered traversal (only search segments from lastSegmentIndex onward)
  for (let i = 0; i < original.length; i++) {
    const result = minDistanceToTrack(original[i], routed, lastSegmentIndex);
    divergenceProfile[i] = result.distance;

    // Update lastSegmentIndex to the matched segment (or keep it if same)
    // This ensures we never go backwards
    lastSegmentIndex = result.segmentIndex;

    if (result.distance > maxDistance) {
      maxDistance = result.distance;
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
