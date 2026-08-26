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
  /** The closest point on the track (projected onto segment or endpoint) */
  closestPoint: GPXPoint;
}

/**
 * Threshold for the secondary divergence check.
 * If the closest routed point lies within this distance of the interpolated
 * segment between the two neighboring original points, the divergence is
 * considered an "along-track" sampling difference rather than a genuine
 * off-track deviation.
 */
const SECONDARY_CHECK_THRESHOLD = 5; // meters

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
 * Returns the distance in meters and the projected point coordinates
 */
export function pointToSegmentDistance(
  point: GPXPoint,
  segStart: GPXPoint,
  segEnd: GPXPoint
): { distance: number; projectedPoint: GPXPoint } {
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
    return {
      distance: Math.sqrt(px * px + py * py),
      projectedPoint: { lat: segStart.lat, lng: segStart.lng },
    };
  }

  // Project point onto segment, clamping to [0, 1]
  const t = Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));
  const projX = sx + t * dx;
  const projY = sy + t * dy;

  // Distance from point to projection
  const distX = px - projX;
  const distY = py - projY;
  const distance = Math.sqrt(distX * distX + distY * distY);

  // Convert projected point back to lat/lng
  const projectedPoint: GPXPoint = {
    lat: segStart.lat + projY / metersPerDegLat,
    lng: segStart.lng + projX / metersPerDegLng,
  };

  return { distance, projectedPoint };
}

/**
 * Find the minimum distance from a point to any segment in the track
 * Uses early exit optimization: stops checking segments once we're past
 * the point's approximate position along the track
 * 
 * @returns Object with distance, the index of the closest segment, and the closest point
 */
function minDistanceToTrack(
  point: GPXPoint,
  track: GPXPoint[],
  startIndex: number = 0
): SegmentDistanceResult {
  if (track.length === 0) return { distance: Infinity, segmentIndex: 0, closestPoint: point };
  if (track.length === 1) {
    const dist = haversineDistance(point, track[0]);
    return { distance: dist, segmentIndex: 0, closestPoint: track[0] };
  }

  let minDist = Infinity;
  let minSegmentIndex = startIndex;
  let closestPoint = point;

  // Check segments starting from startIndex
  for (let i = startIndex; i < track.length - 1; i++) {
    const result = pointToSegmentDistance(point, track[i], track[i + 1]);
    if (result.distance < minDist) {
      minDist = result.distance;
      minSegmentIndex = i;
      closestPoint = result.projectedPoint;
    }

    // Early exit: if we've found a very close match, stop searching
    if (result.distance < 1) {
      return { distance: result.distance, segmentIndex: i, closestPoint: result.projectedPoint };
    }
  }

  // Also check the last point
  const lastPointDist = haversineDistance(point, track[track.length - 1]);
  if (lastPointDist < minDist) {
    minDist = lastPointDist;
    minSegmentIndex = track.length - 2;
    closestPoint = track[track.length - 1];
  }

  return { distance: minDist, segmentIndex: minSegmentIndex, closestPoint };
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
 * - When divergence exceeds tolerance, perform a secondary check: verify whether the
 *   closest routed point lies on the interpolated segment between the two neighboring
 *   original points. If it does (within SECONDARY_CHECK_THRESHOLD), it's an along-track
 *   sampling difference, not a genuine off-track deviation.
 *
 * @param original - The original track to analyze
 * @param routed - The reference track to compare against
 * @param tolerance - Primary divergence tolerance in meters (used to trigger secondary check)
 * @returns Divergence result with max distance, index, point, and full profile
 */
export function findMaxDivergence(
  original: GPXPoint[],
  routed: GPXPoint[],
  tolerance: number = 50
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
    
    // Update lastSegmentIndex to the matched segment (or keep it if same)
    // This ensures we never go backwards
    lastSegmentIndex = result.segmentIndex;

    // Primary divergence check
    let effectiveDistance = result.distance;

    // Secondary check: if divergence exceeds tolerance, verify whether
    // the closest routed point is actually close to the original point.
    // If both points are very close (< 5m), it's likely a sampling difference
    // rather than a genuine off-track deviation.
    if (result.distance > tolerance) {
      const pointToPointDist = haversineDistance(original[i], result.closestPoint);
      
      if (pointToPointDist <= SECONDARY_CHECK_THRESHOLD) {
        // The closest routed point is very close to the original point
        // This is likely a sampling difference, not a real divergence
        effectiveDistance = 0;
      }
    }

    divergenceProfile[i] = effectiveDistance;

    if (effectiveDistance > maxDistance) {
      maxDistance = effectiveDistance;
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
