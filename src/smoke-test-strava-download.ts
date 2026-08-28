#!/usr/bin/env tsx
/**
 * Smoke test for Strava route download functionality
 * 
 * This test:
 * 1. Authenticates with Strava using stored credentials
 * 2. Downloads a specific route by ID
 * 3. Displays the route metadata and track statistics
 * 
 * Usage:
 *   npm run smoke-test:strava-download <route-id>
 * 
 * Example:
 *   npm run smoke-test:strava-download 3391683196004765610
 */

import { StravaProvider } from './providers/strava/index.js';
import { serializeGPX } from './gpx/serializer.js';
import * as logger from './utils/logger.js';

async function main() {
  const routeId = process.argv[2];
  
  if (!routeId) {
    console.error('Usage: npm run smoke-test:strava-download <route-id>');
    process.exit(1);
  }

  logger.info('=== Strava Route Download Smoke Test ===');
  logger.info(`Route ID: ${routeId}`);
  logger.info('');

  const provider = new StravaProvider();

  try {
    // Authenticate
    logger.info('Authenticating with Strava...');
    await provider.authenticate();
    logger.success('Authentication successful');
    logger.info('');

    // Download route
    logger.info('Downloading route...');
    const gpxFile = await provider.downloadRoute(routeId);
    logger.success('Route downloaded successfully');
    logger.info('');

    // Display metadata
    logger.info('Route Metadata:');
    logger.info(`  Name: ${gpxFile.metadata?.name || 'Unnamed'}`);
    logger.info(`  Time: ${gpxFile.metadata?.time || 'Unknown'}`);
    logger.info(`  Tracks: ${gpxFile.tracks.length}`);
    logger.info('');

    // Display track statistics
    if (gpxFile.tracks.length > 0) {
      const track = gpxFile.tracks[0];
      logger.info('Track Statistics:');
      logger.info(`  Name: ${track.name || 'Unnamed'}`);
      logger.info(`  Type: ${track.type || 'Unknown'}`);
      logger.info(`  Segments: ${track.segments.length}`);
      
      if (track.segments.length > 0) {
        const segment = track.segments[0];
        logger.info(`  Points in segment: ${segment.points.length}`);
        
        if (segment.points.length > 0) {
          const firstPoint = segment.points[0];
          const lastPoint = segment.points[segment.points.length - 1];
          logger.info(`  Start: ${firstPoint.lat.toFixed(6)}, ${firstPoint.lng.toFixed(6)}`);
          logger.info(`  End: ${lastPoint.lat.toFixed(6)}, ${lastPoint.lng.toFixed(6)}`);
          
          // Calculate approximate distance
          let totalDistance = 0;
          for (let i = 1; i < segment.points.length; i++) {
            const prev = segment.points[i - 1];
            const curr = segment.points[i];
            totalDistance += haversineDistance(
              prev.lat, prev.lng,
              curr.lat, curr.lng
            );
          }
          logger.info(`  Approximate distance: ${(totalDistance / 1000).toFixed(2)} km`);
        }
      }
    }
    logger.info('');

    // Serialize to GPX XML
    logger.info('Serializing to GPX XML...');
    const gpxXml = serializeGPX(gpxFile);
    logger.success(`GPX XML generated (${gpxXml.length} bytes)`);
    logger.info('');

    // Show first few lines of GPX
    const lines = gpxXml.split('\n');
    logger.info('GPX Preview (first 10 lines):');
    lines.slice(0, 10).forEach(line => logger.info(`  ${line}`));
    logger.info('  ...');
    logger.info('');

    logger.success('=== Smoke test completed successfully ===');
  } catch (error) {
    logger.error('Smoke test failed:');
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Calculate distance between two GPS points using Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

main();
