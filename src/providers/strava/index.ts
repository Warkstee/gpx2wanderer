/**
 * Strava route provider (stub).
 *
 * Implements the RouteProvider interface for Strava.
 * Full implementation (OAuth2 flow, activity listing, GPX download) will be
 * added in a follow-up story.
 */

import type { RouteProvider, RouteSummary } from '../types.js';
import type { GPXFile } from '../../gpx/types.js';

export class StravaProvider implements RouteProvider {
  readonly name = 'strava';

  async authenticate(_credentials: unknown): Promise<void> {
    throw new Error('Strava authentication not yet implemented');
  }

  async listRoutes(): Promise<RouteSummary[]> {
    throw new Error('Strava route listing not yet implemented');
  }

  async downloadRoute(_routeId: string): Promise<GPXFile> {
    throw new Error('Strava route download not yet implemented');
  }
}
