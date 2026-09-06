/**
 * Unified Routes Endpoint
 * 
 * Provides a single paginated endpoint that merges routes from all providers
 * (Komoot, Strava) with sync status enrichment.
 */

import { Hono } from 'hono';
import { KomootProvider } from '../../providers/komoot/index.js';
import { StravaProvider } from '../../providers/strava/index.js';
import { hasKomootCredentials, hasStravaCredentials } from '../../providers/auth/credentials.js';
import { getCachedRoutes, setCachedRoutes, invalidateRouteCache } from '../cache.js';
import { findTrailsBySourceTags } from '../../wanderer/api.js';
import { resolveWandererAuth } from '../../service/auth.js';
import { mapSportToActivityType } from '../../wanderer/category-mapping.js';
import type { Env } from '../app.js';
import type { RouteSummary } from '../../providers/types.js';
import * as logger from '../../utils/logger.js';

/**
 * Unified route format for the merged endpoint.
 */
export interface UnifiedRoute {
  id: string;
  name: string;
  provider: 'komoot' | 'strava';
  distance: number; // meters
  elevationGain: number; // meters
  activityType: string; // normalized via mapSportToActivityType
  date: string; // ISO 8601
  syncStatus: 'synced' | 'not_synced';
  sourceTag: string; // e.g., "gpx2wanderer-komoot-12345"
  tourType?: string; // Provider-specific tour type (e.g., "tour_planned", "tour_recorded")
}

/**
 * Paginated response for unified routes.
 */
export interface UnifiedRoutesResponse {
  routes: UnifiedRoute[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Create unified routes endpoint.
 */
export function createRoutesEndpoint(): Hono<Env> {
  const routes = new Hono<Env>();

  /**
   * GET /api/routes
   * 
   * Unified paginated endpoint that merges routes from all providers.
   * Enriches each route with sync status by checking Wanderer.
   * 
   * Query params:
   * - page: Page number (default: 1)
   * - perPage: Routes per page (default: 20)
   * - refresh: Force cache invalidation (default: false)
   */
  routes.get('/', async (c) => {
    const startTime = Date.now();
    
    try {
      // Parse query parameters
      const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
      const perPage = Math.min(100, Math.max(1, parseInt(c.req.query('perPage') || '20', 10)));
      const refresh = c.req.query('refresh') === 'true';

      if (refresh) {
        invalidateRouteCache();
        logger.debug('Route cache invalidated via refresh parameter');
      }

      // Fetch routes from all providers (using cache)
      const allRoutes = await fetchAllProviderRoutes();
      
      // Sort by date descending (newest first)
      allRoutes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate pagination
      const total = allRoutes.length;
      const totalPages = Math.ceil(total / perPage);
      const startIndex = (page - 1) * perPage;
      const endIndex = Math.min(startIndex + perPage, total);
      const pageRoutes = allRoutes.slice(startIndex, endIndex);

      // Enrich with sync status
      const enrichedRoutes = await enrichWithSyncStatus(pageRoutes, c);

      const response: UnifiedRoutesResponse = {
        routes: enrichedRoutes,
        total,
        page,
        perPage,
        totalPages,
      };

      const elapsed = Date.now() - startTime;
      logger.debug(`Unified routes endpoint completed in ${elapsed}ms (page ${page}/${totalPages}, ${enrichedRoutes.length} routes)`);

      return c.json(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to fetch unified routes: ${message}`);
      
      return c.json({
        error: 'Internal Server Error',
        message: `Failed to fetch routes: ${message}`,
      }, 500);
    }
  });

  return routes;
}

/**
 * Fetch routes from all configured providers.
 * Uses cache when available.
 */
async function fetchAllProviderRoutes(): Promise<Array<RouteSummary & { provider: 'komoot' | 'strava' }>> {
  const allRoutes: Array<RouteSummary & { provider: 'komoot' | 'strava' }> = [];

  // Fetch Komoot routes
  if (hasKomootCredentials()) {
    try {
      let komootRoutes = getCachedRoutes('komoot');
      
      if (!komootRoutes) {
        logger.debug('Fetching Komoot routes from provider...');
        const provider = new KomootProvider();
        await provider.authenticate();
        komootRoutes = await provider.listRoutes();
        setCachedRoutes('komoot', komootRoutes);
      }
      
      // Tag each route with provider
      const taggedRoutes = komootRoutes.map(r => ({ ...r, provider: 'komoot' as const }));
      allRoutes.push(...taggedRoutes);
      logger.debug(`Fetched ${komootRoutes.length} Komoot routes`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Failed to fetch Komoot routes: ${message}`);
    }
  }

  // Fetch Strava routes
  if (hasStravaCredentials()) {
    try {
      let stravaRoutes = getCachedRoutes('strava');
      
      if (!stravaRoutes) {
        logger.debug('Fetching Strava routes from provider...');
        const provider = new StravaProvider();
        await provider.authenticate();
        stravaRoutes = await provider.listRoutes();
        setCachedRoutes('strava', stravaRoutes);
      }
      
      // Tag each route with provider
      const taggedRoutes = stravaRoutes.map(r => ({ ...r, provider: 'strava' as const }));
      allRoutes.push(...taggedRoutes);
      logger.debug(`Fetched ${stravaRoutes.length} Strava routes`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Failed to fetch Strava routes: ${message}`);
    }
  }

  return allRoutes;
}

/**
 * Enrich routes with sync status by checking Wanderer.
 */
async function enrichWithSyncStatus(
  routes: Array<RouteSummary & { provider: 'komoot' | 'strava' }>,
  c: any
): Promise<UnifiedRoute[]> {
  if (routes.length === 0) {
    return [];
  }

  // Build source tags for all routes on this page
  const sourceTags = routes.map(r => `gpx2wanderer-${r.provider}-${r.id}`);

  // Check sync status via Wanderer
  let syncedTags = new Set<string>();
  
  try {
    const wandererSession = await resolveWandererAuth();
    
    if (wandererSession) {
      const syncMap = await findTrailsBySourceTags(
        wandererSession.host,
        wandererSession.cookie,
        sourceTags
      );
      
      // Extract the tags that were found (have a trail ID)
      syncedTags = new Set(syncMap.keys());
      logger.debug(`Found ${syncedTags.size} synced routes out of ${sourceTags.length} checked`);
    } else {
      logger.debug('Wanderer not configured — all routes marked as not_synced');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Failed to check sync status: ${message}`);
    // Continue with all routes marked as not_synced
  }

  // Build unified route objects
  return routes.map(route => {
    const sourceTag = `gpx2wanderer-${route.provider}-${route.id}`;
    const syncStatus = syncedTags.has(sourceTag) ? 'synced' : 'not_synced';
    
    // Normalize activity type
    const activityType = mapSportToActivityType(route.provider, route.activityType);

    return {
      id: route.id,
      name: route.name,
      provider: route.provider,
      distance: route.distance,
      elevationGain: route.elevationGain,
      activityType,
      date: route.date,
      syncStatus,
      sourceTag,
      tourType: route.tourType,
    };
  });
}
