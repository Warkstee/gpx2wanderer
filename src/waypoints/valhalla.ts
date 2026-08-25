/**
 * Valhalla routing engine client
 */

import type { GPXPoint } from '../gpx/types.js';
import * as logger from '../utils/logger.js';

export interface ValhallaRoute {
  points: GPXPoint[];
  distance: number; // meters
  duration: number; // seconds
}

interface ValhallaResponse {
  error?: string;
  trip: {
    legs: Array<{
      shape: string;
      summary: {
        length: number; // kilometers
        time: number; // seconds
      };
    }>;
  };
}

export interface ValhallaClientOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
}

/**
 * Map CLI costing names to Valhalla API costing names
 */
function mapCosting(cliCosting: string): string {
  const mapping: Record<string, string> = {
    bike: 'bicycle',
    hike: 'pedestrian',
  };
  return mapping[cliCosting] || cliCosting;
}

/**
 * Valhalla routing client with retry logic and multi-leg support
 */
export class ValhallaClient {
  private baseUrl: string;
  private maxRetries: number;
  private initialBackoffMs: number;

  constructor(baseUrl: string, options: ValhallaClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.maxRetries = options.maxRetries ?? 3;
    this.initialBackoffMs = options.initialBackoffMs ?? 1000;
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is transient (should be retried)
   */
  private isTransientError(statusCode: number): boolean {
    // Retry on 5xx server errors and 429 (rate limit)
    return statusCode >= 500 || statusCode === 429;
  }

  /**
   * Route between waypoints using Valhalla with retry logic
   * @param waypoints - Array of waypoints (lat/lon)
   * @param costing - CLI costing model (bike or hike)
   * @returns Route geometry and metadata
   * @throws Error if routing fails after all retries
   */
  async route(waypoints: GPXPoint[], costing = 'bike'): Promise<ValhallaRoute> {
    const valhallaCosting = mapCosting(costing);
    const locations = waypoints.map((wp) => ({
      lat: wp.lat,
      lon: wp.lng,
    }));

    const requestBody = {
      locations,
      costing: valhallaCosting,
      directions_options: {
        units: 'meters',
      },
    };

    let lastError: Error | null = null;
    let backoffMs = this.initialBackoffMs;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`Valhalla routing attempt ${attempt + 1}/${this.maxRetries + 1}`);

        const response = await fetch(`${this.baseUrl}/route`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        // Handle HTTP errors
        if (!response.ok) {
          const errorMessage = `Valhalla routing failed: ${response.statusText}`;
          
          // Only retry on transient errors (5xx, 429)
          if (this.isTransientError(response.status) && attempt < this.maxRetries) {
            lastError = new Error(errorMessage);
            logger.warn(`Valhalla request failed with status ${response.status}, retrying in ${backoffMs}ms...`);
            await this.sleep(backoffMs);
            backoffMs *= 2;
            continue;
          }
          
          // Non-transient error or final attempt - throw immediately
          throw new Error(errorMessage);
        }

        const data = (await response.json()) as ValhallaResponse;

        // Valhalla application errors should not be retried
        if (data.error) {
          throw new Error(`Valhalla routing error: ${data.error}`);
        }

        // Process all legs (multi-leg support)
        return this.processLegs(data.trip.legs);
      } catch (error) {
        // If it's already a Valhalla error (not a network error), don't retry
        if (error instanceof Error && error.message.startsWith('Valhalla ')) {
          throw error;
        }

        // Network errors or other exceptions - retry if attempts remain
        if (attempt < this.maxRetries) {
          lastError = error instanceof Error ? error : new Error(String(error));
          logger.warn(`Valhalla request failed: ${lastError.message}, retrying in ${backoffMs}ms...`);
          await this.sleep(backoffMs);
          backoffMs *= 2;
          continue;
        }
        
        // Final attempt failed
        throw error;
      }
    }

    // Should not reach here, but TypeScript needs it
    throw lastError || new Error('Valhalla routing failed after all retries');
  }

  /**
   * Process multiple legs from Valhalla response into a single route
   * Concatenates points from all legs, avoiding duplication at leg boundaries
   */
  private processLegs(legs: Array<{ shape: string; summary: { length: number; time: number } }>): ValhallaRoute {
    if (!legs || legs.length === 0) {
      throw new Error('Valhalla response contains no legs');
    }

    let allPoints: GPXPoint[] = [];
    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const legPoints = this.decodePolyline(leg.shape);

      // For all legs except the first, skip the first point (it's the same as the last point of the previous leg)
      const startIdx = i === 0 ? 0 : 1;
      allPoints = allPoints.concat(legPoints.slice(startIdx));

      totalDistance += leg.summary.length * 1000; // Convert km to meters
      totalDuration += leg.summary.time;
    }

    logger.debug(`Processed ${legs.length} leg(s): ${allPoints.length} points, ${totalDistance}m, ${totalDuration}s`);

    return {
      points: allPoints,
      distance: totalDistance,
      duration: totalDuration,
    };
  }

  /**
   * Decode Valhalla polyline encoding (Google's encoded polyline format)
   * See: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
   */
  private decodePolyline(encoded: string): GPXPoint[] {
    const points: GPXPoint[] = [];
    let index = 0;
    let lat = 0;
    let lon = 0;

    while (index < encoded.length) {
      // Decode latitude
      let shift = 0;
      let result = 0;
      let byte;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      lat += result & 1 ? ~(result >> 1) : result >> 1;

      // Decode longitude
      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      lon += result & 1 ? ~(result >> 1) : result >> 1;

      points.push({
        lat: lat / 1e6,
        lng: lon / 1e6,
      });
    }

    return points;
  }
}
