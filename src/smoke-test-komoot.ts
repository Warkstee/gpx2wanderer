#!/usr/bin/env node

/**
 * Smoke test for Komoot route listing
 *
 * This script lists all planned routes from Komoot.
 * Requires Komoot credentials to be configured first:
 *   node dist/index.js config komoot
 */

import { KomootProvider } from './providers/komoot/index.js';
import * as logger from './utils/logger.js';

async function main() {
  logger.info('=== Komoot Route Listing Smoke Test ===');
  logger.info('');

  const provider = new KomootProvider();

  try {
    // Authenticate using stored credentials
    logger.info('Authenticating with Komoot...');
    await provider.authenticate();
    logger.success('Authentication successful');
    logger.info('');

    // List planned routes
    logger.info('Fetching planned routes...');
    const routes = await provider.listRoutes();
    logger.success(`Found ${routes.length} planned routes`);
    logger.info('');

    if (routes.length === 0) {
      logger.warn('No planned routes found');
      return;
    }

    // Display routes in a table format
    logger.info('Planned Routes:');
    logger.info('─'.repeat(80));

    for (const route of routes) {
      const distanceKm = (route.distance / 1000).toFixed(2);
      const date = new Date(route.date).toLocaleDateString();

      console.log(`  ID: ${route.id}`);
      console.log(`  Name: ${route.name}`);
      console.log(`  Distance: ${distanceKm} km`);
      console.log(`  Elevation: ${route.elevationGain} m`);
      console.log(`  Activity: ${route.activityType}`);
      console.log(`  Date: ${date}`);
      console.log('─'.repeat(80));
    }

    logger.info('');
    logger.success('Smoke test complete');
  } catch (error) {
    logger.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
