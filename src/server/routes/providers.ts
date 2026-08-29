/**
 * Provider Routes
 * 
 * Handles endpoints for listing routes from external providers (Komoot, Strava).
 */

import { Hono } from 'hono';
import { KomootProvider } from '../../providers/komoot/index.js';
import { StravaProvider } from '../../providers/strava/index.js';
import { hasKomootCredentials, hasStravaCredentials } from '../../providers/auth/credentials.js';
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

      // Authenticate and list routes
      const provider = new KomootProvider();
      await provider.authenticate();
      const routes = await provider.listRoutes();

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

      // Authenticate and list routes
      const provider = new StravaProvider();
      await provider.authenticate();
      const routes = await provider.listRoutes();

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

  return strava;
}
