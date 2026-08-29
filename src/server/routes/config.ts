/**
 * Configuration Routes
 * 
 * Handles GET/POST endpoints for managing credentials for all services.
 */

import { Hono } from 'hono';
import {
  loadWandererCredentials,
  saveWandererCredentials,
  loadKomootCredentials,
  saveKomootCredentials,
  loadStravaCredentials,
  saveStravaCredentials,
  loadValhallaConfig,
  saveValhallaConfig,
} from '../../providers/auth/credentials.js';
import type { Env } from '../app.js';

/**
 * Mask a sensitive value for display.
 */
function mask(value: string | undefined): string {
  if (!value) return '';
  return '••••••';
}

/**
 * Create configuration routes.
 */
export function createConfigRoutes(): Hono<Env> {
  const config = new Hono<Env>();

  // ── Wanderer Configuration ────────────────────────────────────────────

  /**
   * GET /api/config/wanderer
   * 
   * Returns Wanderer configuration with masked password.
   */
  config.get('/wanderer', (c) => {
    const creds = loadWandererCredentials();
    
    if (!creds) {
      return c.json({ configured: false });
    }

    return c.json({
      configured: true,
      host: creds.host,
      username: creds.username,
      password: mask(creds.password),
    });
  });

  /**
   * POST /api/config/wanderer
   * 
   * Saves Wanderer credentials (host, username, password).
   */
  config.post('/wanderer', async (c) => {
    try {
      const body = await c.req.json();
      const { host, username, password } = body;

      if (!host || !username || !password) {
        return c.json({ 
          error: 'Bad Request', 
          message: 'host, username, and password are required' 
        }, 400);
      }

      saveWandererCredentials({ host, username, password });
      
      return c.json({ message: 'Wanderer credentials saved successfully' });
    } catch (err) {
      return c.json({ 
        error: 'Internal Server Error', 
        message: 'Failed to save Wanderer credentials' 
      }, 500);
    }
  });

  // ── Komoot Configuration ──────────────────────────────────────────────

  /**
   * GET /api/config/komoot
   * 
   * Returns Komoot configuration with masked password.
   */
  config.get('/komoot', (c) => {
    const creds = loadKomootCredentials();
    
    if (!creds) {
      return c.json({ configured: false });
    }

    return c.json({
      configured: true,
      email: creds.email,
      password: mask(creds.password),
    });
  });

  /**
   * POST /api/config/komoot
   * 
   * Saves Komoot credentials (email, password).
   * Note: token and userID are obtained during authentication, not configured here.
   */
  config.post('/komoot', async (c) => {
    try {
      const body = await c.req.json();
      const { email, password } = body;

      if (!email || !password) {
        return c.json({ 
          error: 'Bad Request', 
          message: 'email and password are required' 
        }, 400);
      }

      // Save with empty token and userID (will be populated during auth)
      saveKomootCredentials({ 
        email, 
        password, 
        token: '', 
        userID: '' 
      });
      
      return c.json({ message: 'Komoot credentials saved successfully' });
    } catch (err) {
      return c.json({ 
        error: 'Internal Server Error', 
        message: 'Failed to save Komoot credentials' 
      }, 500);
    }
  });

  // ── Strava Configuration ──────────────────────────────────────────────

  /**
   * GET /api/config/strava
   * 
   * Returns Strava configuration with masked client secret.
   */
  config.get('/strava', (c) => {
    const creds = loadStravaCredentials();
    
    if (!creds) {
      return c.json({ configured: false });
    }

    return c.json({
      configured: true,
      clientId: creds.clientId,
      clientSecret: mask(creds.clientSecret),
      refreshToken: creds.refreshToken ? mask(creds.refreshToken) : '',
    });
  });

  /**
   * POST /api/config/strava
   * 
   * Saves Strava credentials (clientId, clientSecret, refreshToken).
   * The refreshToken is required for Strava API access.
   */
  config.post('/strava', async (c) => {
    try {
      const body = await c.req.json();
      const { clientId, clientSecret, refreshToken } = body;

      if (!clientId || !clientSecret || !refreshToken) {
        return c.json({ 
          error: 'Bad Request', 
          message: 'clientId, clientSecret, and refreshToken are required' 
        }, 400);
      }

      saveStravaCredentials({ clientId, clientSecret, refreshToken });
      
      return c.json({ message: 'Strava credentials saved successfully' });
    } catch (err) {
      return c.json({ 
        error: 'Internal Server Error', 
        message: 'Failed to save Strava credentials' 
      }, 500);
    }
  });

  // ── Valhalla Configuration ────────────────────────────────────────────

  /**
   * GET /api/config/valhalla
   * 
   * Returns Valhalla configuration.
   */
  config.get('/valhalla', (c) => {
    const config = loadValhallaConfig();
    
    if (!config) {
      return c.json({ configured: false });
    }

    return c.json({
      configured: true,
      url: config.url,
    });
  });

  /**
   * POST /api/config/valhalla
   * 
   * Saves Valhalla configuration (url).
   */
  config.post('/valhalla', async (c) => {
    try {
      const body = await c.req.json();
      const { url } = body;

      if (!url) {
        return c.json({ 
          error: 'Bad Request', 
          message: 'url is required' 
        }, 400);
      }

      saveValhallaConfig({ url });
      
      return c.json({ message: 'Valhalla configuration saved successfully' });
    } catch (err) {
      return c.json({ 
        error: 'Internal Server Error', 
        message: 'Failed to save Valhalla configuration' 
      }, 500);
    }
  });

  return config;
}
