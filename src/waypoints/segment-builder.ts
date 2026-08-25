/**
 * Multi-segment track builder — splits dense tracks at waypoint locations.
 * 
 * Takes the original dense track and generated waypoints, then constructs
 * a GPXTrack with multiple <trkseg> blocks. Each segment represents a leg
 * between consecutive waypoints, containing all the dense track points
 * between them.
 */

import type { GPXPoint, GPXTrackSegment } from '../gpx/types.js';
import { haversineDistance } from './comparison.js';

/**
 * Find the index of the closest point in the original track to a waypoint.
 * 
 * Unlike komoot-route-extractor which has exact coordinate matches,
 * gpx2wanderer waypoints may not exactly match original track points
 * (they're simplified points from Douglas-Peucker + Valhalla validation).
 * So we use haversine distance to find the closest point.
 * 
 * @param waypoint - The waypoint to find
 * @param originalTrack - The dense original track
 * @param startIndex - Minimum index to start searching from
 * @returns The index of the closest point
 */
function findClosestPointIndex(
  waypoint: GPXPoint,
  originalTrack: GPXPoint[],
  startIndex: number
): number {
  let minDistance = Infinity;
  let minIndex = startIndex;

  // Search from startIndex onward
  for (let i = startIndex; i < originalTrack.length; i++) {
    const distance = haversineDistance(waypoint, originalTrack[i]);
    if (distance < minDistance) {
      minDistance = distance;
      minIndex = i;
    }
  }

  return minIndex;
}

/**
 * Build a multi-segment GPX track from waypoints and original dense track.
 * 
 * Algorithm:
 *   1. Find the index of each waypoint in the original dense track
 *   2. Build segment boundaries: [0, waypoint1, waypoint2, ..., len-1]
 *   3. Slice the original track into segments at those boundaries
 *   4. Each segment contains all dense track points between consecutive waypoints
 * 
 * @param waypoints - Generated waypoints (simplified points)
 * @param originalTrack - Original dense track with all points
 * @returns Array of track segments
 */
export function buildMultiSegmentTrack(
  waypoints: GPXPoint[],
  originalTrack: GPXPoint[]
): GPXTrackSegment[] {
  if (waypoints.length < 2) {
    // If we have fewer than 2 waypoints, just return the original track as one segment
    return [{ points: originalTrack }];
  }

  // Find indices for each waypoint in the original track
  const splitIndices: number[] = [];
  let lastFoundIndex = 0;
  
  for (const waypoint of waypoints) {
    const idx = findClosestPointIndex(waypoint, originalTrack, lastFoundIndex);
    splitIndices.push(idx);
    lastFoundIndex = idx;
  }

  // Build segment boundaries: [0, waypoint1, waypoint2, ..., len-1]
  const bounds = [0, ...splitIndices, originalTrack.length - 1];

  // Create segments by slicing the original track
  // Each segment includes points from bounds[i] to bounds[i+1] (inclusive)
  // Boundary points are duplicated: last point of segment N = first point of segment N+1
  const segments: GPXTrackSegment[] = [];
  
  for (let i = 0; i < bounds.length - 1; i++) {
    const startIdx = bounds[i];
    const endIdx = bounds[i + 1];
    
    // Skip empty or single-point segments
    if (endIdx <= startIdx) {
      continue;
    }
    
    const points: GPXPoint[] = [];
    for (let j = startIdx; j <= endIdx; j++) {
      points.push(originalTrack[j]);
    }
    
    segments.push({ points });
  }

  return segments;
}
