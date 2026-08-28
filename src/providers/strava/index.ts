/**
 * Strava route provider.
 *
 * Implements the RouteProvider interface for Strava.
 * Uses OAuth2 with refresh tokens for authentication.
 */

import type { RouteProvider, RouteSummary as ProviderRouteSummary } from '../types.js';
import type { GPXFile } from '../../gpx/types.js';
import { StravaClient } from './api.js';
import { loadStravaCredentials, type StravaCredentials } from '../auth/credentials.js';
import { parseGPX } from '../../gpx/parser.js';
import * as logger from '../../utils/logger.js';

export class StravaProvider implements RouteProvider {
  readonly name = 'strava';
  private client: StravaClient | null = null;
  private athleteId: number | null = null;

  /**
   * Authenticate with Strava using stored credentials.
   *
   * Loads credentials from the encrypted store and validates them by
   * fetching the authenticated athlete profile.
   *
   * @param _credentials - Ignored (credentials are loaded from encrypted store)
   */
  async authenticate(_credentials?: unknown): Promise<void> {
    const creds = loadStravaCredentials();
    if (!creds) {
      throw new Error('No Strava credentials found. Run "config strava" to set up credentials.');
    }

    logger.debug('Authenticating with Strava...');
    this.client = new StravaClient(creds.clientId, creds.clientSecret, creds.refreshToken);

    // Validate credentials and get athlete ID
    const athlete = await this.client.validate();
    if (!athlete) {
      throw new Error('Strava authentication failed — credentials may be invalid or revoked.');
    }

    this.athleteId = athlete.id;
    logger.debug(`Strava authentication successful — athlete: ${athlete.firstname} ${athlete.lastname} (ID: ${athlete.id})`);
  }

  /**
   * List all routes from Strava.
   *
   * Fetches all routes created by the authenticated athlete.
   *
   * @returns Array of route summaries
   */
  async listRoutes(): Promise<ProviderRouteSummary[]> {
    if (!this.client || !this.athleteId) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    logger.debug('Fetching all routes from Strava...');
    const routes = await this.client.listAllRoutes(this.athleteId);

    logger.debug(`Found ${routes.length} routes`);

    return routes.map(route => this.mapRouteToSummary(route));
  }

  /**
   * Map a Strava RouteSummary to the provider-agnostic RouteSummary interface.
   */
  private mapRouteToSummary(route: { id: number; name: string; distance: number; elevation_gain: number; type: number; timestamp: number }): ProviderRouteSummary {
    // Map Strava route type to activity type string
    const typeMap: Record<number, string> = {
      1: 'ride',
      2: 'run',
      3: 'hike',
      4: 'walk',
    };

    return {
      id: String(route.id),
      name: route.name,
      distance: route.distance,
      elevationGain: route.elevation_gain,
      activityType: typeMap[route.type] || 'unknown',
      date: new Date(route.timestamp * 1000).toISOString(),
    };
  }

  /**
   * Download a route as GPX.
   *
   * Fetches the route from Strava's GPX export endpoint and parses it.
   *
   * @param routeId - The route ID to download
   * @returns Parsed GPX file
   */
  async downloadRoute(routeId: string): Promise<GPXFile> {
    if (!this.client) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const id = parseInt(routeId, 10);
    if (isNaN(id)) {
      throw new Error(`Invalid route ID: ${routeId}`);
    }

    logger.debug(`Downloading route ${id} from Strava...`);
    const gpxXml = await this.client.exportRouteGpx(id);

    logger.debug('Parsing GPX...');
    const gpx = parseGPX(gpxXml);

    return gpx;
  }
}
