/**
 * Douglas-Peucker line simplification algorithm
 */

import type { GPXPoint } from '../gpx/types.js';

/**
 * Calculate perpendicular distance from point to line segment
 */
function perpendicularDistance(point: GPXPoint, lineStart: GPXPoint, lineEnd: GPXPoint): number {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;

  // Normalize latitude for distance calculation (approximate)
  const latRad = ((lineStart.lat + lineEnd.lat) / 2) * (Math.PI / 180);
  const dxMeters = dx * 111320 * Math.cos(latRad);
  const dyMeters = dy * 110540;

  const pointDx = (point.lng - lineStart.lng) * 111320 * Math.cos(latRad);
  const pointDy = (point.lat - lineStart.lat) * 110540;

  const lineLengthSq = dxMeters * dxMeters + dyMeters * dyMeters;

  if (lineLengthSq === 0) {
    // Line segment is a point
    return Math.sqrt(pointDx * pointDx + pointDy * pointDy);
  }

  const t = Math.max(0, Math.min(1, (pointDx * dxMeters + pointDy * dyMeters) / lineLengthSq));
  const projX = t * dxMeters;
  const projY = t * dyMeters;

  const distX = pointDx - projX;
  const distY = pointDy - projY;

  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Douglas-Peucker simplification algorithm
 * @param points - Array of GPX points to simplify
 * @param epsilon - Maximum distance tolerance in meters
 * @returns Simplified array of GPX points
 */
export function douglasPeucker(points: GPXPoint[], epsilon: number): GPXPoint[] {
  if (points.length <= 2) {
    return points;
  }

  // Find the point with the maximum distance
  let maxDistance = 0;
  let maxIndex = 0;

  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    // Recursive call with points before and after the max distance point
    const before = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
    const after = douglasPeucker(points.slice(maxIndex), epsilon);

    // Combine results (avoid duplicating the max distance point)
    return [...before.slice(0, -1), ...after];
  } else {
    // Just return start and end points
    return [start, end];
  }
}

/**
 * Simplify a GPX track using Douglas-Peucker algorithm
 * @param points - Array of track points
 * @param epsilon - Simplification tolerance in meters (default: 30m)
 * @returns Simplified waypoints
 */
export function simplifyTrack(points: GPXPoint[], epsilon = 30): GPXPoint[] {
  return douglasPeucker(points, epsilon);
}
