#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import { parseGPX } from './gpx/parser.js';
import { generateWaypoints } from './waypoints/generator.js';
import { ValhallaClient } from './waypoints/valhalla.js';
import { serializeGPX } from './gpx/serializer.js';
import { writeGpxFile, generateOutputFilename } from './output/writer.js';
import { buildMultiSegmentTrack } from './waypoints/segment-builder.js';
import { postSimplifyWaypoints } from './waypoints/post-simplifier.js';
import { loadValhallaConfig, hasValhallaConfig, saveValhallaConfig, loadWandererCredentials, saveWandererCookie, type WandererCredentials } from './wanderer/credentials.js';
import { promptForWandererCredentials } from './wanderer/prompts.js';
import { login as wandererLogin, validateCookie } from './wanderer/api.js';
import * as logger from './utils/logger.js';
import type { GPXFile, GPXTrack, GPXPoint } from './gpx/types.js';

// Load environment variables (for backward compatibility)
dotenv.config();

const program = new Command();

program
  .name('gpx2wanderer')
  .description('Convert GPX tracks to Wanderer-compatible format with algorithmic waypoint generation')
  .version('0.1.0');

// Config command for managing credentials
program
  .command('config')
  .description('Manage configuration and credentials')
  .argument('<service>', 'Service to configure (valhalla, wanderer)')
  .argument('[url]', 'URL for the service (required for valhalla)')
  .action(async (service: string, url: string) => {
    try {
      if (service === 'valhalla') {
        if (!url) {
          console.error(chalk.red('Error: URL is required for Valhalla configuration'));
          console.error(chalk.gray('Usage: gpx2wanderer config valhalla <url>'));
          process.exit(1);
        }
        saveValhallaConfig({ url });
        console.log(chalk.green('✓ Valhalla configuration saved (encrypted)'));
        console.log(chalk.gray(`  Stored in: ~/.gpx2wanderer/.env`));
      } else if (service === 'wanderer') {
        // Interactive prompt for Wanderer credentials
        const creds = await promptForWandererCredentials();
        if (creds) {
          console.log(chalk.green('✓ Wanderer credentials saved (encrypted)'));
          console.log(chalk.gray(`  Stored in: ~/.gpx2wanderer/.env`));
        } else {
          console.error(chalk.red('Error: Failed to configure Wanderer credentials'));
          process.exit(1);
        }
      } else {
        console.error(chalk.red(`Error: Unknown service "${service}". Available services: valhalla, wanderer`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .argument('<gpx-file>', 'Path to GPX file to process')
  .option('-v, --verbose', 'Enable verbose output for debugging', false)
  .option('-e, --epsilon <meters>', 'Douglas-Peucker simplification epsilon in meters', '30')
  .option('-t, --tolerance <meters>', 'Maximum divergence tolerance in meters', '50')
  .option('-i, --max-iterations <count>', 'Maximum Valhalla validation iterations', '10')
  .option('-c, --costing <model>', 'Valhalla costing model (bike or hike)', 'bike')
  .option('-o, --output <path>', 'Output GPX file path (default: temp directory)')
  .option('--post-simplify', 'Enable post-processing waypoint simplification', false)
  .option('--turn-threshold <degrees>', 'Turn angle threshold for anchor point detection', '150')
  .action(async (gpxFile: string, options: any) => {
    try {
      console.log(chalk.blue('gpx2wanderer v0.1.0'));
      console.log(chalk.gray(`Processing: ${gpxFile}`));
      
      // Set verbose mode
      logger.setVerbose(options.verbose);
      
      // --- Wanderer Authentication (lazy, for future upload) -------------------
      // This resolves Wanderer credentials and validates/refreshes the session cookie.
      // The authenticated session will be available for upload functionality.
      let wandererSession: { host: string; cookie: string } | null = null;
      try {
        wandererSession = await resolveWandererAuth();
        if (wandererSession) {
          logger.debug(`Wanderer authentication successful — session ready for ${wandererSession.host}`);
        }
      } catch (err) {
        logger.debug(`Wanderer authentication skipped: ${err instanceof Error ? err.message : String(err)}`);
      }
      
      // Validate costing model
      const validCostings = ['bike', 'hike'];
      if (!validCostings.includes(options.costing)) {
        console.error(chalk.red(`Error: Invalid costing model "${options.costing}". Must be one of: ${validCostings.join(', ')}`));
        process.exit(1);
      }
      
      if (options.verbose) {
        console.log(chalk.gray('Verbose mode enabled'));
        console.log(chalk.gray(`Epsilon: ${options.epsilon}m`));
        console.log(chalk.gray(`Tolerance: ${options.tolerance}m`));
        console.log(chalk.gray(`Max iterations: ${options.maxIterations}`));
        console.log(chalk.gray(`Costing: ${options.costing}`));
      }

      // Step 1: Read GPX file
      logger.info('Reading GPX file...');
      const gpxContent = readFileSync(resolve(gpxFile), 'utf-8');
      
      // Step 2: Parse GPX
      logger.info('Parsing GPX content...');
      const gpxData = parseGPX(gpxContent);
      
      // Edge case: Check if GPX has tracks
      if (!gpxData.tracks || gpxData.tracks.length === 0) {
        logger.error('No tracks found in GPX file');
        process.exit(1);
      }
      
      logger.info(`Found ${gpxData.tracks.length} track(s)`);
      
      // For now, process only the first track
      const track = gpxData.tracks[0];
      const trackName = track.name || 'Unnamed Track';
      logger.info(`Processing track: ${trackName}`);
      
      // Extract all points from all segments
      const allPoints: GPXPoint[] = [];
      for (const segment of track.segments) {
        allPoints.push(...segment.points);
      }
      
      // Edge case: Check if track has enough points
      if (allPoints.length < 2) {
        logger.error(`Track has only ${allPoints.length} point(s). At least 2 points are required.`);
        process.exit(1);
      }
      
      logger.info(`Track contains ${allPoints.length} points`);
      
      // Step 3: Initialize Valhalla client
      // Try encrypted credentials first, fall back to plain text .env for backward compatibility
      let valhallaUrl: string;
      const valhallaConfig = loadValhallaConfig();
      
      if (valhallaConfig) {
        valhallaUrl = valhallaConfig.url;
        logger.debug('Using Valhalla configuration from encrypted credentials');
      } else if (process.env.VALHALLA_URL) {
        valhallaUrl = process.env.VALHALLA_URL;
        logger.warn('Using Valhalla URL from plain text .env file (deprecated)');
        logger.warn('Consider migrating to encrypted credentials: gpx2wanderer config valhalla');
      } else {
        logger.error('Valhalla not configured');
        logger.error('Please configure Valhalla using: gpx2wanderer config valhalla <url>');
        logger.error('Or set VALHALLA_URL in .env file (not recommended)');
        process.exit(1);
      }
      
      logger.info(`Using Valhalla at ${valhallaUrl}`);
      const valhalla = new ValhallaClient(valhallaUrl);
      
      // Step 4: Generate waypoints
      logger.info('Starting waypoint generation...');
      const result = await generateWaypoints(allPoints, valhalla, {
        epsilon: parseFloat(options.epsilon),
        tolerance: parseFloat(options.tolerance),
        maxIterations: parseInt(options.maxIterations),
        costing: options.costing,
      });
      
      logger.success(`Waypoint generation complete`);
      logger.info(`  Iterations: ${result.iterations}`);
      logger.info(`  Waypoints: ${result.waypoints.length}`);
      logger.info(`  Max divergence: ${result.maxDivergence.toFixed(1)}m`);
      logger.info(`  Converged: ${result.converged ? 'Yes' : 'No'}`);
      
      // Step 5: Post-processing simplification (optional)
      let finalWaypoints = result.waypoints;
      if (options.postSimplify) {
        logger.info('Starting post-processing simplification...');
        const postResult = await postSimplifyWaypoints(result.waypoints, allPoints, valhalla, {
          tolerance: parseFloat(options.tolerance),
          turnThreshold: parseFloat(options.turnThreshold),
          costing: options.costing,
        });
        finalWaypoints = postResult.waypoints;
        logger.info(`  Removed: ${postResult.removed} waypoints`);
        logger.info(`  Valhalla calls: ${postResult.valhallaCalls}`);
        logger.info(`  Final waypoints: ${finalWaypoints.length}`);
      }
      
      // Step 6: Build multi-segment track from waypoints
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
      
      // Step 7: Determine output path
      let outputPath: string;
      if (options.output) {
        outputPath = resolve(options.output);
      } else {
        // Default: write to temp directory with generated filename
        const tempDir = tmpdir();
        const filename = generateOutputFilename(trackName);
        outputPath = join(tempDir, filename);
      }
      
      // Step 8: Write output file
      logger.info('Writing output file...');
      writeGpxFile(gpxXml, outputPath);
      

/**
 * Resolve Wanderer authentication:
 * 1. Load stored credentials
 * 2. Validate cached cookie or re-authenticate
 * 3. Prompt user if credentials are missing or invalid
 * 
 * Returns the authenticated session (host + cookie) or null if authentication
 * is skipped or fails. This is used to prepare for future upload functionality.
 */
async function resolveWandererAuth(): Promise<{ host: string; cookie: string } | null> {
  // Load stored Wanderer credentials
  let wandererCreds = loadWandererCredentials();
  
  if (!wandererCreds) {
    logger.debug('No stored Wanderer credentials found');
    // Don't prompt here — upload is not yet implemented, so we just skip auth
    // When upload is implemented, this should prompt:
    // wandererCreds = await promptForWandererCredentials();
    // if (!wandererCreds) return null;
    return null;
  }
  
  logger.debug('Loaded stored Wanderer credentials');
  
  // Validate cached cookie or re-login
  let cookie = wandererCreds.cookie;
  
  if (cookie) {
    const isValid = await validateCookie(wandererCreds.host, cookie);
    
    if (!isValid) {
      logger.debug('Cached Wanderer cookie expired — re-authenticating...');
      try {
        const loginResult = await wandererLogin(wandererCreds.host, wandererCreds.username, wandererCreds.password);
        cookie = loginResult.cookie;
        saveWandererCookie(cookie);
        logger.debug('Wanderer cookie refreshed');
      } catch (err) {
        logger.debug(`Wanderer re-login failed: ${err instanceof Error ? err.message : String(err)}`);
        // Don't prompt for re-login here — just return null
        // When upload is implemented, this should prompt:
        // wandererCreds = await promptForWandererCredentials('\nStored Wanderer credentials are no longer valid. Please log in again.\n');
        // if (!wandererCreds) return null;
        // cookie = wandererCreds.cookie;
        return null;
      }
    } else {
      logger.debug('Cached Wanderer cookie is valid');
    }
  } else {
    // No cached cookie — login now
    logger.debug('No cached Wanderer cookie — authenticating...');
    try {
      const loginResult = await wandererLogin(wandererCreds.host, wandererCreds.username, wandererCreds.password);
      cookie = loginResult.cookie;
      saveWandererCookie(cookie);
      logger.debug('Wanderer login successful');
    } catch (err) {
      logger.debug(`Wanderer login failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }
  
  return { host: wandererCreds.host, cookie: cookie! };
}
      logger.success(`Output written to: ${outputPath}`);
      console.log(chalk.green('\n✓ Processing complete!'));
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      if (options.verbose && error instanceof Error && error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

program.parse();
