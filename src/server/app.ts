/**
 * Hono API Application
 * 
 * Main application setup with authentication middleware, error handling, and CORS.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { getCookie } from 'hono/cookie';
import * as loggerUtil from '../utils/logger.js';
import { createAuthRoutes } from './routes/auth.js';
import { createConfigRoutes } from './routes/config.js';
import { createKomootRoutes, createStravaRoutes } from './routes/providers.js';
import { createMaintenanceRoutes } from './routes/maintenance.js';
import { createLogsRoutes } from './routes/logs.js';

/**
 * Session store for authenticated users.
 * Maps session tokens to user data.
 */
export interface Session {
  token: string;
  username: string;
  createdAt: Date;
}

/**
 * Environment variables for Hono context.
 */
export type Env = {
  Variables: {
    session: Session;
  };
};

const sessions = new Map<string, Session>();

/**
 * Create and configure the Hono application.
 */
export function createApp(): Hono<Env> {
  const app = new Hono<Env>();

  // Middleware
  app.use('*', logger());
  app.use('*', prettyJSON());
  app.use('*', secureHeaders());
  
  // CORS configuration
  app.use('*', cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173', // SvelteKit dev server
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true,
    maxAge: 86400, // 24 hours
  }));

  // Health check endpoint (unauthenticated)
  app.get('/api/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
    });
  });

  // Auth middleware for all /api/* routes except /api/auth/login
  app.use('/api/*', async (c, next) => {
    // Skip auth for login endpoint
    if (c.req.path === '/api/auth/login') {
      await next();
      return;
    }

    const authHeader = c.req.header('Authorization');
    const sessionToken = authHeader?.replace('Bearer ', '') ||
                         getCookie(c, 'session');

    if (!sessionToken) {
      loggerUtil.debug('No session token provided');
      return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
    }

    const session = sessions.get(sessionToken);
    if (!session) {
      loggerUtil.debug('Invalid or expired session token');
      return c.json({ error: 'Unauthorized', message: 'Invalid or expired session' }, 401);
    }

    // Attach session to context for use in route handlers
    c.set('session', session);
    await next();
  });

  // Register auth routes (login is unauthenticated, logout and me require auth via middleware above)
  const authRoutes = createAuthRoutes();
  app.route('/api/auth', authRoutes);

  // Register config routes (all require authentication)
  const configRoutes = createConfigRoutes();
  app.route('/api/config', configRoutes);

  // Register provider routes (all require authentication)
  const komootRoutes = createKomootRoutes();
  app.route('/api/komoot', komootRoutes);

  const stravaRoutes = createStravaRoutes();
  app.route('/api/strava', stravaRoutes);

  // Register maintenance routes (all require authentication)
  const maintenanceRoutes = createMaintenanceRoutes();
  app.route('/api', maintenanceRoutes);

  // Register logs routes (all require authentication)
  const logsRoutes = createLogsRoutes();
  app.route('/api/logs', logsRoutes);

  // Global error handler
  app.onError((err, c) => {
    loggerUtil.error(`Unhandled error: ${err.message}`);
    if (err.stack) {
      loggerUtil.debug(err.stack);
    }

    return c.json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    }, 500);
  });

  // 404 handler
  app.notFound((c) => {
    return c.json({
      error: 'Not Found',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    }, 404);
  });

  return app;
}

/**
 * Create a new session for a user.
 * 
 * @param username - Username to create session for
 * @returns Session token
 */
export function createSession(username: string): string {
  const token = crypto.randomUUID();
  const session: Session = {
    token,
    username,
    createdAt: new Date(),
  };
  sessions.set(token, session);
  loggerUtil.debug(`Created session for user: ${username}`);
  return token;
}

/**
 * Validate admin credentials.
 * 
 * @param username - Username to validate
 * @param password - Password to validate
 * @returns true if credentials are valid
 */
export function validateAdminCredentials(username: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminUser || !adminPass) {
    loggerUtil.error('ADMIN_USER and ADMIN_PASS environment variables not set');
    return false;
  }

  return username === adminUser && password === adminPass;
}

/**
 * Delete a session (logout).
 * 
 * @param token - Session token to delete
 */
export function deleteSession(token: string): void {
  sessions.delete(token);
  loggerUtil.debug('Session deleted');
}

/**
 * Get session by token.
 * 
 * @param token - Session token
 * @returns Session or undefined
 */
export function getSession(token: string): Session | undefined {
  return sessions.get(token);
}
