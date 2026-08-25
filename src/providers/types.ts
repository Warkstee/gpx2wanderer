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
}

export interface RouteSummary {
  id: string;
  name: string;
  distance: number; // meters
  elevationGain: number; // meters
  activityType: string;
  date: string;
}
