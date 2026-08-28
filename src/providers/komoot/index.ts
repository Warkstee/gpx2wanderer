/**
 * Komoot route provider.
 *
 * Implements the RouteProvider interface for Komoot.
 * Currently supports listing planned routes. GPX download will be added later.
 */

import type { RouteProvider, RouteSummary } from '../types.js';
import type { GPXFile, GPXTrack, GPXTrackSegment, GPXPoint } from '../../gpx/types.js';
import type { TourSummary, TourResponse } from './types.js';
import { KomootClient, login } from './api.js';
import { loadKomootCredentials, saveKomootCredentials, type KomootCredentials } from '../auth/credentials.js';
import * as logger from '../../utils/logger.js';

export class KomootProvider implements RouteProvider {
  private client: KomootClient | null = null;
  readonly name = 'komoot';

  /**
   * Authenticate with Komoot using stored or provided credentials.
   *
   * If credentials are provided (email/password), performs login and stores
   * the resulting token. If no credentials are provided, attempts to load
   * stored credentials from the encrypted credential store.
   *
   * @param credentials - Optional email/password for login
   */
  async authenticate(credentials?: { email: string; password: string }): Promise<void> {
    let komootCreds: KomootCredentials | null = null;

    if (credentials) {
      // Perform login with provided credentials
      logger.debug('Authenticating with Komoot using provided credentials...');
      const loginResult = await login(credentials.email, credentials.password);

      komootCreds = {
        email: credentials.email,
        password: credentials.password,
        token: loginResult.token,
        userID: loginResult.userID,
      };

      // Store credentials for future use
      saveKomootCredentials(komootCreds);
      logger.debug('Komoot credentials saved');
    } else {
      // Load stored credentials
      komootCreds = loadKomootCredentials();
      if (!komootCreds) {
        throw new Error('No Komoot credentials found. Please authenticate with email/password first.');
      }
      logger.debug('Loaded stored Komoot credentials');
    }

    // Create client with token
    this.client = new KomootClient(komootCreds.email, komootCreds.userID, komootCreds.token);

    // Validate the token
    const isValid = await this.client.validate();
    if (!isValid) {
      throw new Error('Komoot authentication failed — token may be expired. Please re-authenticate.');
    }

    logger.debug('Komoot authentication successful');
  }

  /**
   * List available planned routes from Komoot.
   *
   * Fetches all tours and filters to only include "tour_planned" type tours.
   * Elevation gain is set to 0 as it's not available in the tour summary.
   *
   * @returns Array of route summaries
   */
  async listRoutes(): Promise<RouteSummary[]> {
    if (!this.client) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    logger.debug('Fetching all tours from Komoot...');
    const tours = await this.client.listAllTours();

    // Filter to only planned tours
    const plannedTours = tours.filter(tour => tour.type === 'tour_planned');

    logger.debug(`Found ${plannedTours.length} planned tours out of ${tours.length} total tours`);

    return plannedTours.map(tour => this.mapTourToRouteSummary(tour));
  }

  /**
   * Map a Komoot TourSummary to the provider-agnostic RouteSummary interface.
   */
  private mapTourToRouteSummary(tour: TourSummary): RouteSummary {
    return {
      id: String(tour.id),
      name: tour.name,
      distance: tour.distance,
      elevationGain: tour.elevation_up,
      activityType: tour.sport,
      date: tour.date,
    };
  }

  /**
   * Download a route from Komoot and convert it to GPX format.
   *
   * @param routeId - The Komoot tour ID
   * @returns GPX file with a single track segment containing all points
   */
  async downloadRoute(routeId: string): Promise<GPXFile> {
    if (!this.client) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    logger.debug(`Fetching tour ${routeId} from Komoot...`);
    const tour = await this.client.getTour(routeId);

    // Extract coordinates from the embedded data
    const coordinates = tour._embedded?.coordinates?.items;
    if (!coordinates || coordinates.length === 0) {
      throw new Error(`Tour ${routeId} has no coordinate data`);
    }

    logger.debug(`Found ${coordinates.length} coordinate points`);

    // Convert coordinates to GPX points
    const points: GPXPoint[] = coordinates.map(coord => ({
      lat: coord.lat,
      lng: coord.lng,
      ele: coord.alt,
      time: coord.t ? new Date(coord.t).toISOString() : undefined,
    }));

    // Create a single track segment with all points
    const segment: GPXTrackSegment = { points };

    // Create the track
    const track: GPXTrack = {
      name: tour.name,
      type: tour.sport,
      segments: [segment],
    };

    // Create the GPX file
    const gpxFile: GPXFile = {
      version: '1.1',
      creator: 'Komoot',
      metadata: {
        name: tour.name,
        time: tour.date,
      },
      tracks: [track],
    };

    logger.debug(`Created GPX file with ${points.length} points`);
    return gpxFile;
  }
}
