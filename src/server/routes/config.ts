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
import { login as wandererLogin } from '../../wanderer/api.js';
import { login as komootLogin } from '../../providers/komoot/api.js';
import { refreshAccessToken } from '../../providers/strava/api.js';
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
   * Verifies and saves Wanderer credentials (host, username, password).
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

      // Verify credentials by attempting login
      try {
        await wandererLogin(host, username, password);
      } catch (verifyErr) {
        const errorMessage = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
        return c.json({ 
          error: 'Verification Failed', 
          message: `Wanderer credentials could not be verified: ${errorMessage}` 
        }, 422);
      }

      // Save credentials only after successful verification
      saveWandererCredentials({ host, username, password });
      
      return c.json({ message: 'Wanderer credentials verified and saved successfully' });
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
   * Verifies and saves Komoot credentials (email, password).
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

      // Verify credentials by attempting login
      try {
        await komootLogin(email, password);
      } catch (verifyErr) {
        const errorMessage = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
        return c.json({ 
          error: 'Verification Failed', 
          message: `Komoot credentials could not be verified: ${errorMessage}` 
        }, 422);
      }

      // Save credentials only after successful verification
      saveKomootCredentials({ 
        email, 
        password, 
        token: '', 
        userID: '' 
      });
      
      return c.json({ message: 'Komoot credentials verified and saved successfully' });
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
   * Verifies and saves Strava credentials (clientId, clientSecret, refreshToken).
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

      // Verify credentials by attempting token refresh
      try {
        await refreshAccessToken({ clientId, clientSecret, refreshToken });
      } catch (verifyErr) {
        const errorMessage = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
        return c.json({ 
          error: 'Verification Failed', 
          message: `Strava credentials could not be verified: ${errorMessage}` 
        }, 422);
      }

      // Save credentials only after successful verification
      saveStravaCredentials({ clientId, clientSecret, refreshToken });
      
      return c.json({ message: 'Strava credentials verified and saved successfully' });
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
   * Verifies and saves Valhalla configuration (url).
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

      // Verify Valhalla is reachable by checking /status endpoint
      try {
        const statusUrl = `${url.replace(/\/$/, '')}/status`;
        const response = await fetch(statusUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Valhalla returned status ${response.status}`);
        }

        // Verify response contains expected fields
        const data = await response.json() as { version?: string; available_actions?: string[] };
        if (!data.version || !data.available_actions) {
          throw new Error('Invalid Valhalla response - missing version or available_actions');
        }
      } catch (verifyErr) {
        const errorMessage = verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
        return c.json({ 
          error: 'Verification Failed', 
          message: `Valhalla could not be reached: ${errorMessage}` 
        }, 422);
      }

      // Save configuration only after successful verification
      saveValhallaConfig({ url });
      
      return c.json({ message: 'Valhalla configuration verified and saved successfully' });
    } catch (err) {
      return c.json({ 
        error: 'Internal Server Error', 
        message: 'Failed to save Valhalla configuration' 
      }, 500);
    }
  });

  // ── Ping All ──────────────────────────────────────────────────────────

  /**
   * POST /api/config/ping-all
   * 
   * Verifies all saved credentials in parallel. Returns per-service results.
   * Services without saved credentials are reported as skipped.
   */
  config.post('/ping-all', async (c) => {
    interface PingResult {
      status: 'ok' | 'fail' | 'skip';
      message: string;
    }

    const results: Record<string, PingResult> = {};

    // Run all verifications in parallel
    const checks = await Promise.allSettled([
      // Wanderer
      (async () => {
        const creds = loadWandererCredentials();
        if (!creds) return { name: 'wanderer', result: { status: 'skip', message: 'Not configured' } as PingResult };
        try {
          await wandererLogin(creds.host, creds.username, creds.password);
          return { name: 'wanderer', result: { status: 'ok', message: 'Connected' } as PingResult };
        } catch (err) {
          return { name: 'wanderer', result: { status: 'fail', message: err instanceof Error ? err.message : String(err) } as PingResult };
        }
      })(),
      // Komoot
      (async () => {
        const creds = loadKomootCredentials();
        if (!creds) return { name: 'komoot', result: { status: 'skip', message: 'Not configured' } as PingResult };
        try {
          await komootLogin(creds.email, creds.password);
          return { name: 'komoot', result: { status: 'ok', message: 'Connected' } as PingResult };
        } catch (err) {
          return { name: 'komoot', result: { status: 'fail', message: err instanceof Error ? err.message : String(err) } as PingResult };
        }
      })(),
      // Strava
      (async () => {
        const creds = loadStravaCredentials();
        if (!creds) return { name: 'strava', result: { status: 'skip', message: 'Not configured' } as PingResult };
        try {
          await refreshAccessToken(creds);
          return { name: 'strava', result: { status: 'ok', message: 'Connected' } as PingResult };
        } catch (err) {
          return { name: 'strava', result: { status: 'fail', message: err instanceof Error ? err.message : String(err) } as PingResult };
        }
      })(),
      // Valhalla
      (async () => {
        const valhallaConfig = loadValhallaConfig();
        if (!valhallaConfig) return { name: 'valhalla', result: { status: 'skip', message: 'Not configured' } as PingResult };
        try {
          const statusUrl = `${valhallaConfig.url.replace(/\/$/, '')}/status`;
          const response = await fetch(statusUrl, { method: 'GET', headers: { 'Accept': 'application/json' } });
          if (!response.ok) throw new Error(`Valhalla returned status ${response.status}`);
          const data = await response.json() as { version?: string; available_actions?: string[] };
          if (!data.version || !data.available_actions) throw new Error('Invalid Valhalla response');
          return { name: 'valhalla', result: { status: 'ok', message: `Connected (v${data.version})` } as PingResult };
        } catch (err) {
          return { name: 'valhalla', result: { status: 'fail', message: err instanceof Error ? err.message : String(err) } as PingResult };
        }
      })(),
    ]);

    // Collect results
    for (const check of checks) {
      if (check.status === 'fulfilled') {
        results[check.value.name] = check.value.result;
      }
    }

    const allOk = Object.values(results).every(r => r.status === 'ok' || r.status === 'skip');
    const failCount = Object.values(results).filter(r => r.status === 'fail').length;
    const okCount = Object.values(results).filter(r => r.status === 'ok').length;
    const skipCount = Object.values(results).filter(r => r.status === 'skip').length;

    let summary: string;
    if (failCount === 0 && skipCount === 0) {
      summary = 'All services connected successfully';
    } else if (failCount === 0) {
      summary = `${okCount} connected, ${skipCount} not configured`;
    } else {
      summary = `${failCount} failed, ${okCount} connected, ${skipCount} not configured`;
    }

    return c.json({ summary, results });
  });

  return config;
}
