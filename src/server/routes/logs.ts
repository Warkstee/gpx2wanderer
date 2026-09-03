/**
 * Logs API Routes
 * 
 * Provides endpoints for retrieving application logs.
 */

import { Hono } from 'hono';
import { getEntries } from '../../utils/log-buffer.js';

/**
 * Create logs routes
 */
export function createLogsRoutes(): Hono {
  const logs = new Hono();

  /**
   * GET /api/logs
   * 
   * Retrieve recent log entries from the in-memory buffer.
   * 
   * Query parameters:
   * - limit: Maximum number of entries to return (default: 100, max: 500)
   * - level: Filter by log level (info, success, warn, error, debug)
   * 
   * Returns:
   * - Array of log entries in reverse chronological order (newest first)
   * - Each entry contains: timestamp, level, message
   */
  logs.get('/', (c) => {
    const limitParam = c.req.query('limit');
    const level = c.req.query('level');

    // Parse limit parameter
    let limit = 100;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = parsed;
      }
    }

    // Validate level parameter
    const validLevels = ['info', 'success', 'warn', 'error', 'debug'];
    if (level && !validLevels.includes(level)) {
      return c.json({
        error: 'Invalid level parameter',
        message: `Level must be one of: ${validLevels.join(', ')}`
      }, 400);
    }

    // Get entries from buffer
    const entries = getEntries(limit, level);

    return c.json(entries);
  });

  return logs;
}
