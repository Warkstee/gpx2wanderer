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

interface IndexedWaypoint {
  point: GPXPoint;
  originalIndex: number;
}

/**
 * Generate waypoints using hybrid Douglas-Peucker + Valhalla validation
 * @param originalTrack - Original GPX track points
 * @param valhalla - Valhalla routing client instance
 * @param options - Generation options
 * @returns Generation result with waypoints and metadata
 */
export async function generateWaypoints(
  originalTrack: GPXPoint[],
  valhalla: ValhallaClient,
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

  // Phase 1: Douglas-Peucker simplification
  const simplifiedPoints = simplifyTrack(originalTrack, epsilon);
  
  // Track waypoints with their original indices for proper sorting
  let indexedWaypoints: IndexedWaypoint[] = simplifiedPoints.map((point) => {
    const originalIndex = originalTrack.findIndex(
      (p) => p.lat === point.lat && p.lng === point.lng
    );
    return { point, originalIndex };
  });

  logger.info(`Phase 1: Simplified to ${indexedWaypoints.length} waypoints (epsilon=${epsilon}m)`);

  let iterations = 0;
  let maxDivergence = 0;
  let previousDivergence = 0;
  let converged = false;
  let consecutiveFailures = 0;
  let consecutiveIncreases = 0;
  const maxConsecutiveFailures = 3;
  const maxConsecutiveIncreases = 2;

  // Phase 2: Valhalla validation loop
  while (iterations < maxIterations) {
    iterations++;
    
    // Extract just the points for routing
    const waypoints = indexedWaypoints.map((wp) => wp.point);
    
    logger.info(`Iteration ${iterations}/${maxIterations}: ${waypoints.length} waypoints`);

    try {
      // Send waypoints to Valhalla
      const route = await valhalla.route(waypoints, costing);

      // Reset failure counter on success
      consecutiveFailures = 0;

      // Compare routes
      const divergence = findMaxDivergence(originalTrack, route.points);
      previousDivergence = maxDivergence;
      maxDivergence = divergence.maxDistance;

      logger.info(`  Max divergence: ${maxDivergence.toFixed(1)}m (tolerance: ${tolerance}m)`);

      // Check if within tolerance
      if (maxDivergence <= tolerance) {
        converged = true;
        logger.info(`✓ Converged after ${iterations} iterations`);
        break;
      }

      // Check if divergence is increasing (indicates routing degradation)
      if (maxDivergence > previousDivergence && previousDivergence > 0) {
        consecutiveIncreases++;
        logger.warn(`  Divergence increased from ${previousDivergence.toFixed(1)}m to ${maxDivergence.toFixed(1)}m (${consecutiveIncreases}/${maxConsecutiveIncreases})`);
        
        if (consecutiveIncreases >= maxConsecutiveIncreases) {
          logger.warn(`✗ Divergence increased ${maxConsecutiveIncreases} times in a row, stopping iteration`);
          break;
        }
      } else {
        consecutiveIncreases = 0;
      }

      // Add waypoint at point of maximum divergence
      const newWaypoint = divergence.maxPoint;
      const newOriginalIndex = divergence.maxIndex;
      
      indexedWaypoints.push({ point: newWaypoint, originalIndex: newOriginalIndex });

      // Sort waypoints by their original track index
      indexedWaypoints.sort((a, b) => a.originalIndex - b.originalIndex);
      
      logger.debug(`  Added waypoint at index ${newOriginalIndex}, total waypoints: ${indexedWaypoints.length}`);
      
    } catch (error) {
      // Handle Valhalla routing failures gracefully
      consecutiveFailures++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`✗ Valhalla routing failed (attempt ${consecutiveFailures}/${maxConsecutiveFailures}): ${errorMsg}`);

      if (consecutiveFailures >= maxConsecutiveFailures) {
        logger.warn(`✗ Max consecutive failures reached (${maxConsecutiveFailures}), stopping iteration`);
        break;
      }

      // Continue with current waypoints, don't add new ones on failure
      logger.debug('  Continuing with current waypoints');
    }
  }

  if (!converged && iterations >= maxIterations) {
    logger.warn(`✗ Did not converge after ${iterations} iterations (max divergence: ${maxDivergence.toFixed(1)}m)`);
  }

  const finalWaypoints = indexedWaypoints.map((wp) => wp.point);
  logger.info(`Final result: ${finalWaypoints.length} waypoints, ${iterations} iterations, max divergence ${maxDivergence.toFixed(1)}m`);

  return {
    waypoints: finalWaypoints,
    iterations,
    maxDivergence,
    converged,
  };
}
