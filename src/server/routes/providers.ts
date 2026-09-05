/**
 * Provider Routes
 * 
 * Handles endpoints for listing and syncing routes from external providers (Komoot, Strava).
 */

import { Hono } from 'hono';
import { KomootProvider } from '../../providers/komoot/index.js';
import { StravaProvider } from '../../providers/strava/index.js';
import { hasKomootCredentials, hasStravaCredentials } from '../../providers/auth/credentials.js';
import { serializeGPX } from '../../gpx/serializer.js';
import { processGPX } from '../../service/pipeline.js';
import { syncToWanderer } from '../../service/wanderer-sync.js';
import { resolveWandererAuth } from '../../service/auth.js';
import { getCachedRoutes, setCachedRoutes, invalidateRouteCache, updateRouteSyncStatus } from '../cache.js';
import type { Env } from '../app.js';
import * as logger from '../../utils/logger.js';

/**
 * Create Komoot provider routes.
 */
export function createKomootRoutes(): Hono<Env> {
  const komoot = new Hono<Env>();

  /**
   * GET /api/komoot/routes
   * 
   * List all planned routes from Komoot.
   * Supports caching with TTL-based invalidation.
   * Use ?refresh=true to force cache invalidation.
   */
  komoot.get('/routes', async (c) => {
    try {
      // Check if credentials are configured
      if (!hasKomootCredentials()) {
        return c.json({
          error: 'Service Unavailable',
          message: 'Komoot credentials not configured. Please configure via POST /api/config/komoot'
        }, 503);
      }

      // Check for refresh parameter
      const refresh = c.req.query('refresh') === 'true';
      if (refresh) {
        invalidateRouteCache('komoot');
        logger.debug('Komoot route cache invalidated via refresh parameter');
      }

      // Try to get cached routes first
      let routes = getCachedRoutes('komoot');
      
      if (!routes) {
        // Cache miss or expired — fetch from provider
        logger.debug('Fetching Komoot routes from provider...');
        const provider = new KomootProvider();
        await provider.authenticate();
        routes = await provider.listRoutes();
        
        // Cache the results
        setCachedRoutes('komoot', routes);
      }

      return c.json(routes);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to list Komoot routes: ${message}`);
      
      return c.json({
        error: 'Bad Gateway',
        message: `Failed to fetch routes from Komoot: ${message}`
      }, 502);
    }
  });

  /**
   * POST /api/komoot/routes/sync/:id
   * 
   * Sync a Komoot route: download → process → upload to Wanderer.
   * Returns comprehensive result with timing data.
   */
  komoot.post('/routes/sync/:id', async (c) => {
    const routeId = c.req.param('id');
    const startTime = Date.now();
    const timings: Record<string, number> = {};

    try {
      // Check if credentials are configured
      if (!hasKomootCredentials()) {
        return c.json({
          error: 'Service Unavailable',
          message: 'Komoot credentials not configured'
        }, 503);
      }

      // Authenticate with Wanderer
      const wandererSession = await resolveWandererAuth();
      if (!wandererSession) {
        return c.json({
          error: 'Service Unavailable',
          message: 'Wanderer credentials not configured or invalid'
        }, 503);
      }

      // Download route from Komoot
      const downloadStart = Date.now();
      logger.info(`Downloading Komoot route ${routeId}...`);
      const provider = new KomootProvider();
      await provider.authenticate();
      const gpxData = await provider.downloadRoute(routeId);
      const routeMetadata = await provider.getRouteMetadata(routeId);
      const gpxXml = serializeGPX(gpxData);
      timings.download = Date.now() - downloadStart;
      logger.info(`Downloaded route in ${timings.download}ms`);

      // Parse pipeline options from request body
      const body = await c.req.json().catch(() => ({}));
      const pipelineOptions = {
        postSimplify: body.postSimplify ?? false,
        turnThreshold: body.turnThreshold ?? 150,
      };

      // Process GPX through pipeline
      const processStart = Date.now();
      logger.info('Processing GPX...');
      const pipelineResult = await processGPX(gpxXml, pipelineOptions);
      timings.process = Date.now() - processStart;
      logger.info(`Processed GPX in ${timings.process}ms`);

      // Upload to Wanderer
      const uploadStart = Date.now();
      logger.info('Uploading to Wanderer...');
      const syncResult = await syncToWanderer({
        session: wandererSession,
        gpxXml: pipelineResult.gpxXml,
        trackName: pipelineResult.trackName,
        trackType: routeMetadata.sport,
        provider: 'komoot',
        routeMetadata,
        sourceId: `komoot-${routeId}`,
      });
      timings.upload = Date.now() - uploadStart;
      logger.info(`Uploaded to Wanderer in ${timings.upload}ms`);

      timings.total = Date.now() - startTime;

      // Update sync status cache
      updateRouteSyncStatus('komoot', routeId, 'synced');

      return c.json({
        success: true,
        trail: {
          id: syncResult.trailId,
          name: syncResult.trailName,
          url: syncResult.url,
          isNew: syncResult.isNew,
        },
        processing: {
          waypoints: pipelineResult.waypointCount,
          iterations: pipelineResult.iterations,
          maxDivergence: pipelineResult.maxDivergence,
          converged: pipelineResult.converged,
        },
        timings,
      });
    } catch (err) {
      timings.total = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to sync Komoot route ${routeId}: ${message}`);
      
      return c.json({
        success: false,
        error: 'Bad Gateway',
        message: `Failed to sync route from Komoot: ${message}`,
        timings,
      }, 502);
    }
  });

  return komoot;
}

/**
 * Create Strava provider routes.
 */
export function createStravaRoutes(): Hono<Env> {
  const strava = new Hono<Env>();

  /**
   * GET /api/strava/routes
   * 
   * List all routes from Strava.
   * Supports caching with TTL-based invalidation.
   * Use ?refresh=true to force cache invalidation.
   */
  strava.get('/routes', async (c) => {
    try {
      // Check if credentials are configured
      if (!hasStravaCredentials()) {
        return c.json({
          error: 'Service Unavailable',
          message: 'Strava credentials not configured. Please configure via POST /api/config/strava'
        }, 503);
      }

      // Check for refresh parameter
      const refresh = c.req.query('refresh') === 'true';
      if (refresh) {
        invalidateRouteCache('strava');
        logger.debug('Strava route cache invalidated via refresh parameter');
      }

      // Try to get cached routes first
      let routes = getCachedRoutes('strava');
      
      if (!routes) {
        // Cache miss or expired — fetch from provider
        logger.debug('Fetching Strava routes from provider...');
        const provider = new StravaProvider();
        await provider.authenticate();
        routes = await provider.listRoutes();
        
        // Cache the results
        setCachedRoutes('strava', routes);
      }

      return c.json(routes);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to list Strava routes: ${message}`);
      
      return c.json({
        error: 'Bad Gateway',
        message: `Failed to fetch routes from Strava: ${message}`
      }, 502);
    }
  });

  /**
   * POST /api/strava/routes/sync/:id
   * 
   * Sync a Strava route: download → process → upload to Wanderer.
   * Returns comprehensive result with timing data.
   */
  strava.post('/routes/sync/:id', async (c) => {
    const routeId = c.req.param('id');
    const startTime = Date.now();
    const timings: Record<string, number> = {};

    try {
      // Check if credentials are configured
      if (!hasStravaCredentials()) {
        return c.json({
          error: 'Service Unavailable',
          message: 'Strava credentials not configured'
        }, 503);
      }

      // Authenticate with Wanderer
      const wandererSession = await resolveWandererAuth();
      if (!wandererSession) {
        return c.json({
          error: 'Service Unavailable',
          message: 'Wanderer credentials not configured or invalid'
        }, 503);
      }

      // Download route from Strava
      const downloadStart = Date.now();
      logger.info(`Downloading Strava route ${routeId}...`);
      const provider = new StravaProvider();
      await provider.authenticate();
      const gpxData = await provider.downloadRoute(routeId);
      const routeMetadata = await provider.getRouteMetadata(routeId);
      const gpxXml = serializeGPX(gpxData);
      timings.download = Date.now() - downloadStart;
      logger.info(`Downloaded route in ${timings.download}ms`);

      // Parse pipeline options from request body
      const body = await c.req.json().catch(() => ({}));
      const pipelineOptions = {
        postSimplify: body.postSimplify ?? false,
        turnThreshold: body.turnThreshold ?? 150,
      };

      // Process GPX through pipeline
      const processStart = Date.now();
      logger.info('Processing GPX...');
      const pipelineResult = await processGPX(gpxXml, pipelineOptions);
      timings.process = Date.now() - processStart;
      logger.info(`Processed GPX in ${timings.process}ms`);

      // Upload to Wanderer
      const uploadStart = Date.now();
      logger.info('Uploading to Wanderer...');
      const syncResult = await syncToWanderer({
        session: wandererSession,
        gpxXml: pipelineResult.gpxXml,
        trackName: pipelineResult.trackName,
        trackType: routeMetadata.sport,
        provider: 'strava',
        routeMetadata,
        sourceId: `strava-${routeId}`,
      });
      timings.upload = Date.now() - uploadStart;
      logger.info(`Uploaded to Wanderer in ${timings.upload}ms`);

      timings.total = Date.now() - startTime;

      // Update sync status cache
      updateRouteSyncStatus('strava', routeId, 'synced');

      return c.json({
        success: true,
        trail: {
          id: syncResult.trailId,
          name: syncResult.trailName,
          url: syncResult.url,
          isNew: syncResult.isNew,
        },
        processing: {
          waypoints: pipelineResult.waypointCount,
          iterations: pipelineResult.iterations,
          maxDivergence: pipelineResult.maxDivergence,
          converged: pipelineResult.converged,
        },
        timings,
      });
    } catch (err) {
      timings.total = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to sync Strava route ${routeId}: ${message}`);
      
      return c.json({
        success: false,
        error: 'Bad Gateway',
        message: `Failed to sync route from Strava: ${message}`,
        timings,
      }, 502);
    }
  });

  return strava;
}
