/**
 * Logs API Routes
 * 
 * Provides endpoints for retrieving application logs.
 */

import { Hono } from 'hono';
import { getEntries, getTotalCount, getLevelCounts } from '../../utils/log-buffer.js';

/**
 * Create logs routes
 */
export function createLogsRoutes(): Hono {
  const logs = new Hono();

  /**
   * GET /api/logs
   * 
   * Retrieve log entries from the in-memory buffer with pagination.
   * 
   * Query parameters:
   * - limit: Maximum number of entries to return (default: 100, max: 500)
   * - offset: Number of entries to skip (default: 0)
   * - level: Filter by log level (info, success, warn, error, debug)
   * 
   * Returns:
   * - entries: Array of log entries in reverse chronological order (newest first)
   * - total: Total number of entries matching the filter
   * - limit: Applied limit
   * - offset: Applied offset
   * - hasMore: Whether there are more entries beyond this page
   */
  logs.get('/', (c) => {
    const limitParam = c.req.query('limit');
    const offsetParam = c.req.query('offset');
    const level = c.req.query('level');

    // Parse limit parameter
    let limit = 100;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = parsed;
      }
    }

    // Parse offset parameter
    let offset = 0;
    if (offsetParam) {
      const parsed = parseInt(offsetParam, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        offset = parsed;
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
    const entries = getEntries(limit, level, offset);
    const total = getTotalCount(level);
    const levelCounts = getLevelCounts();

    return c.json({
      entries,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      levelCounts
    });
  });

  return logs;
}
