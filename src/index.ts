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
import { loadValhallaConfig, hasValhallaConfig, saveValhallaConfig } from './wanderer/credentials.js';
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
  .argument('<service>', 'Service to configure (valhalla)')
  .argument('<url>', 'URL for the service')
  .action((service: string, url: string) => {
    try {
      if (service === 'valhalla') {
        saveValhallaConfig({ url });
        console.log(chalk.green('✓ Valhalla configuration saved (encrypted)'));
        console.log(chalk.gray(`  Stored in: ~/.gpx2wanderer/.env`));
      } else {
        console.error(chalk.red(`Error: Unknown service "${service}". Available services: valhalla`));
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
  .action(async (gpxFile: string, options: any) => {
    try {
      console.log(chalk.blue('gpx2wanderer v0.1.0'));
      console.log(chalk.gray(`Processing: ${gpxFile}`));
      
      // Set verbose mode
      logger.setVerbose(options.verbose);
      
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
      
      // Step 5: Build multi-segment track from waypoints
      logger.info('Building multi-segment track...');
      const segments = buildMultiSegmentTrack(result.waypoints, allPoints);
      logger.info(`Created ${segments.length} segment(s) from ${result.waypoints.length} waypoints`);
      
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
