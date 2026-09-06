/**
 * Provider interface definitions
 */

import type { GPXFile } from '../gpx/types.js';

export interface RouteProvider {
  /**
   * Provider name (e.g., 'komoot', 'strava')
   */
  name: string;

  /**
   * Authenticate with provider
   */
  authenticate(credentials: unknown): Promise<void>;

  /**
   * List available routes/activities
   */
  listRoutes(): Promise<RouteSummary[]>;

  /**
   * Download route as GPX
   */
  downloadRoute(routeId: string): Promise<GPXFile>;

  /**
   * Get route metadata (category, duration, etc.)
   */
  getRouteMetadata(routeId: string): Promise<RouteMetadata>;
}

export interface RouteMetadata {
  category?: string;
  subcategory?: string;
  duration?: number; // seconds
  sport?: string;
}

export interface RouteSummary {
  id: string;
  name: string;
  distance: number; // meters
  elevationGain: number; // meters
  activityType: string;
  date: string;
  tourType?: string; // Provider-specific tour type (e.g., "tour_planned", "tour_recorded")
}
