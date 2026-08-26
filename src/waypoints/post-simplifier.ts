/**
 * Post-processing waypoint simplification
 * 
 * After the main pipeline converges, this module attempts to remove redundant
 * waypoints that don't significantly affect route fidelity. Uses a segment-based
 * approach: identifies anchor points at sharp turns, then validates entire
 * segments between anchors to remove all intermediate redundant waypoints.
 */

import type { GPXPoint } from '../gpx/types.js';
import { ValhallaClient } from './valhalla.js';
import { findMaxDivergence } from './comparison.js';
import * as logger from '../utils/logger.js';

export interface PostSimplificationResult {
  /** Simplified waypoints */
  waypoints: GPXPoint[];
  /** Number of waypoints removed */
  removed: number;
  /** Number of Valhalla calls made */
  valhallaCalls: number;
}

/**
 * Calculate angle at a waypoint (in degrees)
 * Returns angle between 0° (sharp turn) and 180° (straight line)
 */
function calculateAngle(prev: GPXPoint, current: GPXPoint, next: GPXPoint): number {
  // Convert to approximate meters
  const latRad = current.lat * (Math.PI / 180);
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos(latRad);

  // Vector from current to prev
  const v1x = (prev.lng - current.lng) * metersPerDegLng;
  const v1y = (prev.lat - current.lat) * metersPerDegLat;

  // Vector from current to next
  const v2x = (next.lng - current.lng) * metersPerDegLng;
  const v2y = (next.lat - current.lat) * metersPerDegLat;

  // Calculate angle using dot product
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  const angleRad = Math.acos(cosAngle);
  
  return (angleRad * 180) / Math.PI;
}

/**
 * Post-process waypoints to remove redundant ones using segment-based validation
 * 
 * Algorithm:
 * 1. Identify "anchor points" - waypoints at sharp turns (angle < turnThreshold)
 * 2. For each segment between consecutive anchors:
 *    a. Send just the two anchor points to Valhalla
 *    b. Check if all intermediate waypoints lie on the Valhalla route
 *    c. If yes, remove all intermediate waypoints (they're redundant)
 * 3. Always preserve first and last waypoints
 * 
 * This approach is more aggressive than point-by-point removal because it
 * validates entire segments at once, removing multiple redundant waypoints
 * in a single Valhalla call.
 * 
 * @param waypoints - Current waypoints from main pipeline
 * @param originalTrack - Original dense track
 * @param valhalla - Valhalla client
 * @param options - Simplification options
 * @returns Post-simplification result
 */
export async function postSimplifyWaypoints(
  waypoints: GPXPoint[],
  originalTrack: GPXPoint[],
  valhalla: ValhallaClient,
  options: {
    tolerance?: number;
    turnThreshold?: number;
    costing?: string;
  } = {}
): Promise<PostSimplificationResult> {
  const {
    tolerance = 50,
    turnThreshold = 150, // degrees - waypoints with angle < this are anchors
    costing = 'bike',
  } = options;

  if (waypoints.length <= 2) {
    return { waypoints, removed: 0, valhallaCalls: 0 };
  }

  logger.info(`Post-simplification: starting with ${waypoints.length} waypoints`);

  // Step 1: Identify anchor points (sharp turns + first/last)
  const anchorIndices: number[] = [0]; // Always include first waypoint
  
  for (let i = 1; i < waypoints.length - 1; i++) {
    const angle = calculateAngle(waypoints[i - 1], waypoints[i], waypoints[i + 1]);
    if (angle < turnThreshold) {
      anchorIndices.push(i);
    }
  }
  
  anchorIndices.push(waypoints.length - 1); // Always include last waypoint

  logger.info(`Post-simplification: ${anchorIndices.length} anchor points identified (turns < ${turnThreshold}°)`);

  // Step 2: Process segments between consecutive anchors
  let currentWaypoints = [...waypoints];
  let removed = 0;
  let valhallaCalls = 0;

  // Process segments from end to start to avoid index shifting
  for (let i = anchorIndices.length - 2; i >= 0; i--) {
    const anchorStart = anchorIndices[i];
    const anchorEnd = anchorIndices[i + 1];
    
    // Skip if no intermediate waypoints to remove
    if (anchorEnd - anchorStart <= 1) {
      continue;
    }

    // Extract just the two anchor points
    const anchorPair = [currentWaypoints[anchorStart], currentWaypoints[anchorEnd]];

    try {
      // Send anchor pair to Valhalla
      valhallaCalls++;
      const route = await valhalla.route(anchorPair, costing);
      
      // Check if all intermediate waypoints lie on the Valhalla route
      const intermediateWaypoints = currentWaypoints.slice(anchorStart + 1, anchorEnd);
      const divergence = findMaxDivergence(intermediateWaypoints, route.points, tolerance);

      if (divergence.maxDistance <= tolerance) {
        // All intermediate waypoints are redundant - remove them
        const waypointsToRemove = anchorEnd - anchorStart - 1;
        currentWaypoints = [
          ...currentWaypoints.slice(0, anchorStart + 1),
          ...currentWaypoints.slice(anchorEnd),
        ];
        removed += waypointsToRemove;
        logger.debug(`  Removed ${waypointsToRemove} waypoints between anchors ${anchorStart} and ${anchorEnd} (max divergence: ${divergence.maxDistance.toFixed(1)}m)`);
      } else {
        logger.debug(`  Kept ${intermediateWaypoints.length} waypoints between anchors ${anchorStart} and ${anchorEnd} (max divergence: ${divergence.maxDistance.toFixed(1)}m > ${tolerance}m)`);
      }
    } catch (error) {
      // Valhalla error - keep all waypoints in this segment
      logger.warn(`  Valhalla error, keeping waypoints between anchors ${anchorStart} and ${anchorEnd}`);
    }
  }

  logger.info(`Post-simplification: removed ${removed} waypoints, ${valhallaCalls} Valhalla calls`);
  logger.info(`Post-simplification: ${currentWaypoints.length} waypoints remaining`);

  return {
    waypoints: currentWaypoints,
    removed,
    valhallaCalls,
  };
}
