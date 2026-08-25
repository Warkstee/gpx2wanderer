/**
 * Hybrid waypoint generation orchestrator
 */

import type { GPXPoint } from '../gpx/types.js';
import { simplifyTrack } from './simplifier.js';
import { ValhallaClient } from './valhalla.js';
import { findMaxDivergence } from './comparison.js';
import * as logger from '../utils/logger.js';

export interface GenerationResult {
  waypoints: GPXPoint[];
  iterations: number;
  maxDivergence: number; // meters
  converged: boolean;
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
    costing = 'bike',
  } = options;

  const valhalla = new ValhallaClient(valhallaUrl);

  // Phase 1: Douglas-Peucker simplification
  let waypoints = simplifyTrack(originalTrack, epsilon);
  logger.debug(`Phase 1: Simplified to ${waypoints.length} waypoints (epsilon=${epsilon}m)`);

  let iterations = 0;
  let maxDivergence = 0;
  let converged = false;
  let consecutiveFailures = 0;
  const maxConsecutiveFailures = 3;

  // Phase 2: Valhalla validation loop
  while (iterations < maxIterations) {
    iterations++;
    logger.debug(`Phase 2: Iteration ${iterations}/${maxIterations}, ${waypoints.length} waypoints`);

    try {
      // Send waypoints to Valhalla
      const route = await valhalla.route(waypoints, costing);

      // Reset failure counter on success
      consecutiveFailures = 0;

      // Compare routes
      const divergence = findMaxDivergence(originalTrack, route.points);
      maxDivergence = divergence.maxDistance;

      logger.debug(`Max divergence: ${maxDivergence.toFixed(1)}m (tolerance: ${tolerance}m)`);

      // Check if within tolerance
      if (maxDivergence <= tolerance) {
        converged = true;
        logger.debug(`Converged after ${iterations} iterations`);
        break;
      }

      // Add waypoint at point of maximum divergence
      waypoints.push(divergence.maxPoint);

      // Sort waypoints by their position along the original track
      // (simplified: just sort by index in original track)
      const originalIndices = waypoints.map((wp) => {
        for (let i = 0; i < originalTrack.length; i++) {
          if (
            Math.abs(originalTrack[i].lat - wp.lat) < 1e-7 &&
            Math.abs(originalTrack[i].lng - wp.lng) < 1e-7
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
    } catch (error) {
      // Handle Valhalla routing failures gracefully
      consecutiveFailures++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Valhalla routing failed (attempt ${consecutiveFailures}/${maxConsecutiveFailures}): ${errorMsg}`);

      if (consecutiveFailures >= maxConsecutiveFailures) {
        logger.warn(`Max consecutive failures reached (${maxConsecutiveFailures}), stopping iteration`);
        break;
      }

      // Continue with current waypoints, don't add new ones on failure
      logger.debug('Continuing with current waypoints');
    }
  }

  if (!converged && iterations >= maxIterations) {
    logger.warn(`Did not converge after ${iterations} iterations (max divergence: ${maxDivergence.toFixed(1)}m)`);
  }

  return {
    waypoints,
    iterations,
    maxDivergence,
    converged,
  };
}
