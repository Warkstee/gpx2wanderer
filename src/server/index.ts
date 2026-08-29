/**
 * Hono Server Entry Point
 * 
 * Starts the Hono HTTP server on the configured port.
 */

import { serve } from '@hono/node-server';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import * as logger from '../utils/logger.js';

// Load environment variables
dotenv.config();

const port = parseInt(process.env.PORT || '6721', 10);
const host = process.env.HOST || '0.0.0.0';

// Validate required environment variables
if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
  logger.warn('ADMIN_USER and/or ADMIN_PASS environment variables not set.');
  logger.warn('Authentication will fail until these are configured.');
}

const app = createApp();

logger.info(`Starting gpx2wanderer API server on ${host}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
}, (info) => {
  logger.success(`Server listening on http://${info.address}:${info.port}`);
  logger.info(`Health check: http://${info.address}:${info.port}/api/health`);
});
