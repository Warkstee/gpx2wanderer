/**
 * Server-side caching for provider routes and sync status
 * 
 * Caches expensive provider API calls (Komoot, Strava) with TTL-based invalidation.
 * Also caches sync status to avoid repeated Wanderer API calls.
 */

import type { RouteSummary } from '../providers/types.js';
import * as logger from '../utils/logger.js';

/** Default TTL for provider route cache (5 minutes) */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Cached provider routes with timestamp.
 */
interface RouteCacheEntry {
  routes: RouteSummary[];
  fetchedAt: number;
}

/**
 * In-memory cache for provider routes.
 * Key: provider name ('komoot' | 'strava')
 */
const routeCache = new Map<string, RouteCacheEntry>();

/**
 * In-memory cache for sync status.
 * Key: source tag (e.g., "gpx2wanderer-komoot-12345")
 * Value: sync status ('synced' | 'not_synced')
 */
const syncStatusCache = new Map<string, 'synced' | 'not_synced'>();

/**
 * Get cached routes for a provider.
 * 
 * Returns null if cache is empty or expired (TTL exceeded).
 * 
 * @param provider - Provider name ('komoot' | 'strava')
 * @returns Cached routes or null if expired/missing
 */
export function getCachedRoutes(provider: string): RouteSummary[] | null {
  const entry = routeCache.get(provider);
  
  if (!entry) {
    logger.debug(`Cache miss for ${provider} routes`);
    return null;
  }
  
  const age = Date.now() - entry.fetchedAt;
  if (age > DEFAULT_TTL_MS) {
    logger.debug(`Cache expired for ${provider} routes (age: ${Math.round(age / 1000)}s)`);
    routeCache.delete(provider);
    return null;
  }
  
  logger.debug(`Cache hit for ${provider} routes (${entry.routes.length} routes, age: ${Math.round(age / 1000)}s)`);
  return entry.routes;
}

/**
 * Cache routes for a provider.
 * 
 * @param provider - Provider name ('komoot' | 'strava')
 * @param routes - Routes to cache
 */
export function setCachedRoutes(provider: string, routes: RouteSummary[]): void {
  routeCache.set(provider, {
    routes,
    fetchedAt: Date.now(),
  });
  logger.debug(`Cached ${routes.length} routes for ${provider}`);
}

/**
 * Invalidate the route cache for a provider (or all providers).
 * 
 * @param provider - Optional provider name. If omitted, clears all provider caches.
 */
export function invalidateRouteCache(provider?: string): void {
  if (provider) {
    routeCache.delete(provider);
    logger.debug(`Invalidated route cache for ${provider}`);
  } else {
    routeCache.clear();
    logger.debug('Invalidated all route caches');
  }
}

/**
 * Get cached sync status for a source tag.
 * 
 * @param sourceTag - Source tag (e.g., "gpx2wanderer-komoot-12345")
 * @returns Cached sync status or undefined if not cached
 */
export function getCachedSyncStatus(sourceTag: string): 'synced' | 'not_synced' | undefined {
  return syncStatusCache.get(sourceTag);
}

/**
 * Set sync status for a source tag.
 * 
 * @param sourceTag - Source tag (e.g., "gpx2wanderer-komoot-12345")
 * @param status - Sync status ('synced' | 'not_synced')
 */
export function setCachedSyncStatus(sourceTag: string, status: 'synced' | 'not_synced'): void {
  syncStatusCache.set(sourceTag, status);
}

/**
 * Batch set sync status for multiple source tags.
 * 
 * @param statusMap - Map of sourceTag → status
 */
export function setCachedSyncStatusBatch(statusMap: Map<string, 'synced' | 'not_synced'>): void {
  for (const [tag, status] of statusMap) {
    syncStatusCache.set(tag, status);
  }
  logger.debug(`Cached sync status for ${statusMap.size} tags`);
}

/**
 * Invalidate sync status cache for a specific tag (or all tags).
 * 
 * @param sourceTag - Optional source tag. If omitted, clears all sync status cache.
 */
export function invalidateSyncStatusCache(sourceTag?: string): void {
  if (sourceTag) {
    syncStatusCache.delete(sourceTag);
    logger.debug(`Invalidated sync status cache for ${sourceTag}`);
  } else {
    syncStatusCache.clear();
    logger.debug('Invalidated all sync status cache');
  }
}

/**
 * Update sync status for a specific route after a successful sync.
 * 
 * This is a partial update that marks a route as synced without
 * requiring a full cache invalidation or re-fetch.
 * 
 * @param provider - Provider name ('komoot' | 'strava')
 * @param routeId - Route ID
 * @param status - New sync status (typically 'synced')
 */
export function updateRouteSyncStatus(
  provider: string,
  routeId: string,
  status: 'synced' | 'not_synced'
): void {
  const sourceTag = `gpx2wanderer-${provider}-${routeId}`;
  setCachedSyncStatus(sourceTag, status);
  logger.debug(`Updated sync status for ${sourceTag} to ${status}`);
}

/**
 * Get cache statistics for debugging/monitoring.
 */
export function getCacheStats(): {
  routeCacheSize: number;
  syncStatusCacheSize: number;
  routeCacheAges: Record<string, number>;
} {
  const routeCacheAges: Record<string, number> = {};
  
  for (const [provider, entry] of routeCache) {
    routeCacheAges[provider] = Math.round((Date.now() - entry.fetchedAt) / 1000);
  }
  
  return {
    routeCacheSize: routeCache.size,
    syncStatusCacheSize: syncStatusCache.size,
    routeCacheAges,
  };
}
