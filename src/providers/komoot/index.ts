/**
 * Komoot route provider (stub).
 *
 * Implements the RouteProvider interface for Komoot.
 * Full implementation (API client, route listing, GPX download) will be
 * added in a follow-up story.
 */

import type { RouteProvider, RouteSummary } from '../types.js';
import type { GPXFile } from '../../gpx/types.js';

export class KomootProvider implements RouteProvider {
  readonly name = 'komoot';

  async authenticate(_credentials: unknown): Promise<void> {
    throw new Error('Komoot authentication not yet implemented');
  }

  async listRoutes(): Promise<RouteSummary[]> {
    throw new Error('Komoot route listing not yet implemented');
  }

  async downloadRoute(_routeId: string): Promise<GPXFile> {
    throw new Error('Komoot route download not yet implemented');
  }
}
