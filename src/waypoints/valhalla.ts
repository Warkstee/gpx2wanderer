/**
 * Valhalla routing engine client
 */

import type { GPXPoint } from '../gpx/types.js';

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

/**
 * Valhalla routing client
 */
export class ValhallaClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Route between waypoints using Valhalla
   * @param waypoints - Array of waypoints (lat/lon)
   * @param costing - Valhalla costing model (default: 'bicycle')
   * @returns Route geometry and metadata
   */
  async route(waypoints: GPXPoint[], costing = 'bicycle'): Promise<ValhallaRoute> {
    const locations = waypoints.map((wp) => ({
      lat: wp.lat,
      lon: wp.lng,
    }));

    const requestBody = {
      locations,
      costing,
      directions_options: {
        units: 'meters',
      },
    };

    const response = await fetch(`${this.baseUrl}/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Valhalla routing failed: ${response.statusText}`);
    }

    const data = (await response.json()) as ValhallaResponse;

    if (data.error) {
      throw new Error(`Valhalla routing error: ${data.error}`);
    }

    // Extract route geometry
    const shape = data.trip.legs[0].shape;
    const points = this.decodePolyline(shape);

    return {
      points,
      distance: data.trip.legs[0].summary.length * 1000, // Convert km to meters
      duration: data.trip.legs[0].summary.time,
    };
  }

  /**
   * Decode Valhalla polyline encoding
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
