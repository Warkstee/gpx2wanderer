/**
 * Authentication Routes
 * 
 * Handles login, logout, and session status endpoints.
 */

import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { createSession, deleteSession, validateAdminCredentials, type Env } from '../app.js';
import * as logger from '../../utils/logger.js';

/**
 * Create authentication routes.
 */
export function createAuthRoutes(): Hono<Env> {
  const auth = new Hono<Env>();

  /**
   * POST /api/auth/login
   * 
   * Authenticate with username/password and receive a session cookie.
   */
  auth.post('/login', async (c) => {
    try {
      const body = await c.req.json();
      const { username, password } = body;

      if (!username || !password) {
        return c.json({ error: 'Bad Request', message: 'Username and password are required' }, 400);
      }

      // Validate credentials
      if (!validateAdminCredentials(username, password)) {
        logger.warn(`Failed login attempt for user: ${username}`);
        return c.json({ error: 'Unauthorized', message: 'Invalid credentials' }, 401);
      }

      // Create session
      const sessionToken = createSession(username);
      
      // Set session cookie (httpOnly for security, secure in production)
      setCookie(c, 'session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });

      logger.info(`User ${username} logged in successfully`);
      
      return c.json({
        message: 'Login successful',
        user: { username },
      });
    } catch (err) {
      logger.error(`Login error: ${err instanceof Error ? err.message : String(err)}`);
      return c.json({ error: 'Internal Server Error', message: 'Login failed' }, 500);
    }
  });

  /**
   * POST /api/auth/logout
   * 
   * Invalidate the current session.
   */
  auth.post('/logout', async (c) => {
    try {
      const session = c.get('session');
      
      if (session) {
        deleteSession(session.token);
        logger.info(`User ${session.username} logged out`);
      }

      // Delete session cookie
      deleteCookie(c, 'session', { path: '/' });

      return c.json({ message: 'Logout successful' });
    } catch (err) {
      logger.error(`Logout error: ${err instanceof Error ? err.message : String(err)}`);
      return c.json({ error: 'Internal Server Error', message: 'Logout failed' }, 500);
    }
  });

  /**
   * GET /api/auth/me
   * 
   * Get current session status and user info.
   */
  auth.get('/me', async (c) => {
    try {
      const session = c.get('session');
      
      return c.json({
        authenticated: true,
        user: {
          username: session.username,
          loggedInAt: session.createdAt.toISOString(),
        },
      });
    } catch (err) {
      logger.error(`Session check error: ${err instanceof Error ? err.message : String(err)}`);
      return c.json({ error: 'Internal Server Error', message: 'Failed to check session' }, 500);
    }
  });

  return auth;
}
