/**
 * GPX Processing Pipeline Service
 * 
 * Core processing logic extracted from CLI for reuse by both CLI and API.
 * Handles: parse → simplify → generate waypoints → serialize
 */

import { parseGPX } from '../gpx/parser.js';
import { serializeGPX } from '../gpx/serializer.js';
import type { GPXFile, GPXTrack, GPXPoint } from '../gpx/types.js';
import { generateWaypoints } from '../waypoints/generator.js';
import { ValhallaClient } from '../waypoints/valhalla.js';
import { buildMultiSegmentTrack } from '../waypoints/segment-builder.js';
import { postSimplifyWaypoints } from '../waypoints/post-simplifier.js';
import { loadValhallaConfig } from '../providers/auth/credentials.js';
import * as logger from '../utils/logger.js';
import type { PipelineOptions, PipelineResult } from './types.js';

/**
 * Process a GPX file through the waypoint generation pipeline.
 * 
 * @param gpxContent - Raw GPX XML content
 * @param options - Pipeline options
 * @returns Pipeline result with processed GPX and metadata
 * @throws Error if processing fails
 */
export async function processGPX(
  gpxContent: string,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const {
    epsilon = 30,
    tolerance = 50,
    maxIterations = 10,
    costing = 'bike',
    postSimplify = false,
    turnThreshold = 150,
  } = options;

  // Step 1: Parse GPX
  logger.info('Parsing GPX content...');
  const gpxData = parseGPX(gpxContent);
  
  // Validate tracks exist
  if (!gpxData.tracks || gpxData.tracks.length === 0) {
    throw new Error('No tracks found in GPX file');
  }
  
  logger.info(`Found ${gpxData.tracks.length} track(s)`);
  
  // Process only the first track
  const track = gpxData.tracks[0];
  const trackName = track.name || 'Unnamed Track';
  logger.info(`Processing track: ${trackName}`);
  
  // Extract all points from all segments
  const allPoints: GPXPoint[] = [];
  for (const segment of track.segments) {
    allPoints.push(...segment.points);
  }
  
  // Validate point count
  if (allPoints.length < 2) {
    throw new Error(`Track has only ${allPoints.length} point(s). At least 2 points are required.`);
  }
  
  logger.info(`Track contains ${allPoints.length} points`);
  
  // Step 2: Initialize Valhalla client
  const valhallaUrl = getValhallaUrl();
  logger.info(`Using Valhalla at ${valhallaUrl}`);
  const valhalla = new ValhallaClient(valhallaUrl);
  
  // Step 3: Generate waypoints
  logger.info('Starting waypoint generation...');
  const result = await generateWaypoints(allPoints, valhalla, {
    epsilon,
    tolerance,
    maxIterations,
    costing,
  });
  
  logger.success(`Waypoint generation complete`);
  logger.info(`  Iterations: ${result.iterations}`);
  logger.info(`  Waypoints: ${result.waypoints.length}`);
  logger.info(`  Max divergence: ${result.maxDivergence.toFixed(1)}m`);
  logger.info(`  Converged: ${result.converged ? 'Yes' : 'No'}`);
  
  // Step 4: Post-processing simplification (optional)
  let finalWaypoints = result.waypoints;
  if (postSimplify) {
    logger.info('Starting post-processing simplification...');
    const postResult = await postSimplifyWaypoints(result.waypoints, allPoints, valhalla, {
      tolerance,
      turnThreshold,
      costing,
    });
    finalWaypoints = postResult.waypoints;
    logger.info(`  Removed: ${postResult.removed} waypoints`);
    logger.info(`  Valhalla calls: ${postResult.valhallaCalls}`);
    logger.info(`  Final waypoints: ${finalWaypoints.length}`);
  }
  
  // Step 5: Build multi-segment track from waypoints
  logger.info('Building multi-segment track...');
  const segments = buildMultiSegmentTrack(finalWaypoints, allPoints);
  logger.info(`Created ${segments.length} segment(s) from ${finalWaypoints.length} waypoints`);
  
  const outputTrack: GPXTrack = {
    name: track.name,
    type: track.type,
    comment: track.comment,
    description: track.description,
    time: track.time,
    segments: segments,
  };
  
  const outputGpx: GPXFile = {
    version: gpxData.version || '1.1',
    creator: 'gpx2wanderer',
    metadata: {
      name: gpxData.metadata?.name || trackName,
      desc: gpxData.metadata?.desc,
      time: gpxData.metadata?.time,
    },
    tracks: [outputTrack],
  };
  
  // Step 6: Serialize to GPX XML
  logger.info('Serializing to GPX XML...');
  const gpxXml = serializeGPX(outputGpx);
  
  return {
    gpx: outputGpx,
    gpxXml,
    trackName,
    waypointCount: finalWaypoints.length,
    iterations: result.iterations,
    maxDivergence: result.maxDivergence,
    converged: result.converged,
  };
}

/**
 * Get Valhalla URL from config or environment.
 * 
 * @returns Valhalla URL
 * @throws Error if not configured
 */
export function getValhallaUrl(): string {
  const valhallaConfig = loadValhallaConfig();
  
  if (valhallaConfig) {
    logger.debug('Using Valhalla configuration from encrypted credentials');
    return valhallaConfig.url;
  }
  
  // Fallback to environment variable (deprecated)
  if (process.env.VALHALLA_URL) {
    logger.warn('Using Valhalla URL from plain text .env file (deprecated)');
    logger.warn('Consider migrating to encrypted credentials: gpx2wanderer config valhalla');
    return process.env.VALHALLA_URL;
  }
  
  throw new Error(
    'Valhalla not configured. ' +
    'Please configure using: gpx2wanderer config valhalla <url> ' +
    'or set VALHALLA_URL in .env file (not recommended)'
  );
}
