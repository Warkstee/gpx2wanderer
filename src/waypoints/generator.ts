/**
 * Hybrid waypoint generation orchestrator
 */

import type { GPXPoint } from '../gpx/types.js';
import { simplifyTrack } from './simplifier.js';
import { ValhallaClient } from './valhalla.js';

export interface GenerationResult {
  waypoints: GPXPoint[];
  iterations: number;
  maxDivergence: number; // meters
  converged: boolean;
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
function haversineDistance(p1: GPXPoint, p2: GPXPoint): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Find point of maximum divergence between two tracks
 */
function findMaxDivergence(
  original: GPXPoint[],
  routed: GPXPoint[]
): { index: number; distance: number; point: GPXPoint } {
  let maxDistance = 0;
  let maxIndex = 0;
  let maxPoint = original[0];

  // For each point in original track, find closest point in routed track
  for (let i = 0; i < original.length; i++) {
    let minDistance = Infinity;

    for (const routedPoint of routed) {
      const distance = haversineDistance(original[i], routedPoint);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    if (minDistance > maxDistance) {
      maxDistance = minDistance;
      maxIndex = i;
      maxPoint = original[i];
    }
  }

  return { index: maxIndex, distance: maxDistance, point: maxPoint };
}

/**
 * Generate waypoints using hybrid Douglas-Peucker + Valhalla validation
 * @param originalTrack - Original GPX track points
 * @param valhallaUrl - Valhalla routing engine URL
 * @param options - Generation options
 * @returns Generation result with waypoints and metadata
 */
export async function generateWaypoints(
  originalTrack: GPXPoint[],
  valhallaUrl: string,
  options: {
    epsilon?: number;
    tolerance?: number;
    maxIterations?: number;
    costing?: string;
  } = {}
): Promise<GenerationResult> {
  const {
    epsilon = 30,
    tolerance = 50,
    maxIterations = 10,
    costing = 'bicycle',
  } = options;

  const valhalla = new ValhallaClient(valhallaUrl);

  // Phase 1: Douglas-Peucker simplification
  let waypoints = simplifyTrack(originalTrack, epsilon);

  let iterations = 0;
  let maxDivergence = 0;
  let converged = false;

  // Phase 2: Valhalla validation loop
  while (iterations < maxIterations) {
    iterations++;

    // Send waypoints to Valhalla
    const route = await valhalla.route(waypoints, costing);

    // Compare routes
    const divergence = findMaxDivergence(originalTrack, route.points);
    maxDivergence = divergence.distance;

    // Check if within tolerance
    if (maxDivergence <= tolerance) {
      converged = true;
      break;
    }

    // Add waypoint at point of maximum divergence
    waypoints.push(divergence.point);

    // Sort waypoints by their position along the original track
    // (simplified: just sort by index in original track)
    const originalIndices = waypoints.map((wp) => {
      for (let i = 0; i < originalTrack.length; i++) {
        if (
          Math.abs(originalTrack[i].lat - wp.lat) < 1e-7 &&
          Math.abs(originalTrack[i].lon - wp.lon) < 1e-7
        ) {
          return i;
        }
      }
      return 0;
    });

    const sorted = waypoints
      .map((wp, i) => ({ wp, index: originalIndices[i] }))
      .sort((a, b) => a.index - b.index)
      .map((x) => x.wp);

    waypoints = sorted;
  }

  return {
    waypoints,
    iterations,
    maxDivergence,
    converged,
  };
}
