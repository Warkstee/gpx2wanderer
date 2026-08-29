/**
 * Maintenance Routes
 * 
 * Handles maintenance/management endpoints like tag cleanup.
 */

import { Hono } from 'hono';
import { cleanupOrphanedTags } from '../../wanderer/api.js';
import { resolveWandererAuth } from '../../service/auth.js';
import type { Env } from '../app.js';
import * as logger from '../../utils/logger.js';

/**
 * Create maintenance routes.
 */
export function createMaintenanceRoutes(): Hono<Env> {
  const maintenance = new Hono<Env>();

  /**
   * POST /api/cleanup-tags
   * 
   * Delete tags that are not assigned to any trail.
   * Returns counts of total tags, used tags, and deleted tags.
   */
  maintenance.post('/cleanup-tags', async (c) => {
    try {
      // Authenticate with Wanderer
      const session = await resolveWandererAuth();
      if (!session) {
        return c.json({
          error: 'Service Unavailable',
          message: 'Wanderer credentials not configured or invalid'
        }, 503);
      }

      logger.info('Scanning for orphaned tags...');
      const result = await cleanupOrphanedTags(session.host, session.cookie);

      logger.info(`Total tags: ${result.totalTags}`);
      logger.info(`Tags in use: ${result.usedTags}`);
      logger.info(`Orphaned tags deleted: ${result.deletedTags}`);

      return c.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to cleanup tags: ${message}`);

      return c.json({
        error: 'Bad Gateway',
        message: `Failed to cleanup tags: ${message}`
      }, 502);
    }
  });

  return maintenance;
}
