#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import { serializeGPX } from './gpx/serializer.js';
import { writeGpxFile, generateOutputFilename } from './output/writer.js';
import { saveValhallaConfig } from './providers/auth/credentials.js';
import { promptForWandererCredentials } from './wanderer/prompts.js';
import { cleanupOrphanedTags } from './wanderer/api.js';
import { promptForKomootCredentials } from './providers/komoot/prompts.js';
import { KomootProvider } from './providers/komoot/index.js';
import { promptForStravaCredentials } from './providers/strava/prompts.js';
import { StravaProvider } from './providers/strava/index.js';
import * as logger from './utils/logger.js';
import { processGPX } from './service/pipeline.js';
import { resolveWandererAuthWithPrompt } from './service/auth.js';
import { syncToWanderer } from './service/wanderer-sync.js';

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
  .argument('<service>', 'Service to configure (valhalla, wanderer, komoot, strava)')
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
      } else if (service === 'komoot') {
        // Interactive prompt for Komoot credentials
        const creds = await promptForKomootCredentials();
        if (creds) {
          console.log(chalk.green('✓ Komoot credentials saved (encrypted)'));
          console.log(chalk.gray(`  Stored in: ~/.gpx2wanderer/.env`));
        } else {
          console.error(chalk.red('Error: Failed to configure Komoot credentials'));
          process.exit(1);
        }
      } else if (service === 'strava') {
        // Interactive prompt for Strava credentials
        const creds = await promptForStravaCredentials();
        if (creds) {
          console.log(chalk.green('✓ Strava credentials saved (encrypted)'));
          console.log(chalk.gray(`  Stored in: ~/.gpx2wanderer/.env`));
        } else {
          console.error(chalk.red('Error: Failed to configure Strava credentials'));
          process.exit(1);
        }
      } else {
        console.error(chalk.red(`Error: Unknown service "${service}". Available services: valhalla, wanderer, komoot, strava`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Cleanup command for orphaned tags
program
  .command('cleanup-tags')
  .description('Delete tags that are not assigned to any trail')
  .action(async () => {
    try {
      const session = await resolveWandererAuthWithPrompt(promptForWandererCredentials);
      if (!session) {
        logger.error('Wanderer authentication is required. Exiting.');
        process.exit(1);
      }

      logger.info('Scanning for orphaned tags...');
      const result = await cleanupOrphanedTags(session.host, session.cookie);

      logger.info(`Total tags: ${result.totalTags}`);
      logger.info(`Tags in use: ${result.usedTags}`);
      logger.info(`Orphaned tags deleted: ${result.deletedTags}`);
      console.log(chalk.green('\n✓ Tag cleanup complete!'));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .argument('[gpx-file]', 'Path to GPX file to process')
  .option('-v, --verbose', 'Enable verbose output for debugging', false)
  .option('-e, --epsilon <meters>', 'Douglas-Peucker simplification epsilon in meters', '30')
  .option('-t, --tolerance <meters>', 'Maximum divergence tolerance in meters', '50')
  .option('-i, --max-iterations <count>', 'Maximum Valhalla validation iterations', '10')
  .option('-c, --costing <model>', 'Valhalla costing model (bike or hike)', 'bike')
  .option('-o, --output <path>', 'Output GPX file path (default: temp directory)')
  .option('--post-simplify', 'Enable post-processing waypoint simplification', false)
  .option('--turn-threshold <degrees>', 'Turn angle threshold for anchor point detection', '150')
  .option('--upload', 'Upload output GPX to Wanderer after processing', false)
  .option('--source-id <id>', 'Source identifier for optimistic update (e.g., komoot tour ID)')
  .option('--komoot <route-id>', 'Download route from Komoot by tour ID')
  .option('--strava <route-id>', 'Download route from Strava by route ID')
  .action(async (gpxFile: string | undefined, options: any) => {
    try {
      console.log(chalk.blue('gpx2wanderer v0.1.0'));
      
      // Set verbose mode
      logger.setVerbose(options.verbose);

      // --- Komoot route download (if --komoot is set) -------------------------
      if (options.komoot) {
        if (gpxFile) {
          console.error(chalk.red('Error: Cannot specify both a GPX file and --komoot option'));
          process.exit(1);
        }

        logger.info(`Downloading Komoot route ${options.komoot}...`);
        
        const komootProvider = new KomootProvider();
        await komootProvider.authenticate();
        
        const komootGpx = await komootProvider.downloadRoute(options.komoot);
        const komootGpxXml = serializeGPX(komootGpx);
        
        // Write to temp file so the rest of the pipeline can process it
        const tempDir = tmpdir();
        const komootTempFile = join(tempDir, `komoot-${options.komoot}.gpx`);
        writeFileSync(komootTempFile, komootGpxXml, 'utf-8');
        
        gpxFile = komootTempFile;
        logger.success(`Komoot route downloaded to ${komootTempFile}`);
        
        // Auto-set source-id if not provided
        if (!options.sourceId) {
          options.sourceId = `komoot-${options.komoot}`;
        }
        
        // Set provider for category mapping
        options.provider = 'komoot';
        
        // Fetch route metadata
        logger.debug('Fetching Komoot route metadata...');
        const komootMetadata = await komootProvider.getRouteMetadata(options.komoot);
        options.routeMetadata = komootMetadata;
      }

      // --- Strava route download (if --strava is set) -------------------------
      if (options.strava) {
        if (gpxFile) {
          console.error(chalk.red('Error: Cannot specify both a GPX file and --strava option'));
          process.exit(1);
        }

        logger.info(`Downloading Strava route ${options.strava}...`);
        
        const stravaProvider = new StravaProvider();
        await stravaProvider.authenticate();
        
        const stravaGpx = await stravaProvider.downloadRoute(options.strava);
        const stravaGpxXml = serializeGPX(stravaGpx);
        
        // Write to temp file so the rest of the pipeline can process it
        const tempDir = tmpdir();
        const stravaTempFile = join(tempDir, `strava-${options.strava}.gpx`);
        writeFileSync(stravaTempFile, stravaGpxXml, 'utf-8');
        
        gpxFile = stravaTempFile;
        logger.success(`Strava route downloaded to ${stravaTempFile}`);
        
        // Auto-set source-id if not provided
        if (!options.sourceId) {
          options.sourceId = `strava-${options.strava}`;
        }
        
        // Set provider for category mapping
        options.provider = 'strava';
        
        // Fetch route metadata
        logger.debug('Fetching Strava route metadata...');
        const stravaMetadata = await stravaProvider.getRouteMetadata(options.strava);
        options.routeMetadata = stravaMetadata;
      }

      // Validate that we have a GPX file to process
      if (!gpxFile) {
        console.error(chalk.red('Error: GPX file is required. Provide a file path or use --komoot <route-id> or --strava <route-id>'));
        process.exit(1);
      }

      console.log(chalk.gray(`Processing: ${gpxFile}`));
      
      // --- Wanderer Authentication (only when --upload is set) -----------------
      let wandererSession: { host: string; cookie: string } | null = null;
      if (options.upload) {
        wandererSession = await resolveWandererAuthWithPrompt(promptForWandererCredentials);
        if (!wandererSession) {
          logger.error('Wanderer authentication is required for upload. Exiting.');
          process.exit(1);
        }
        logger.debug(`Wanderer authentication successful — session ready for ${wandererSession.host}`);
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
      
      // Step 2: Process GPX through pipeline
      const pipelineResult = await processGPX(gpxContent, {
        epsilon: parseFloat(options.epsilon),
        tolerance: parseFloat(options.tolerance),
        maxIterations: parseInt(options.maxIterations),
        costing: options.costing,
        postSimplify: options.postSimplify,
        turnThreshold: parseFloat(options.turnThreshold),
      });
      
      const { gpxXml, trackName } = pipelineResult;
      
      // Step 3: Determine output path
      let outputPath: string;
      if (options.output) {
        outputPath = resolve(options.output);
      } else {
        // Default: write to temp directory with generated filename
        const tempDir = tmpdir();
        const filename = generateOutputFilename(trackName);
        outputPath = join(tempDir, filename);
      }
      
      // Step 4: Write output file
      logger.info('Writing output file...');
      writeGpxFile(gpxXml, outputPath);
      
      logger.success(`Output written to: ${outputPath}`);

      // --- Upload to Wanderer (if --upload is set) ----------------------------
      if (options.upload && wandererSession) {
        const syncResult = await syncToWanderer({
          session: wandererSession,
          gpxXml,
          trackName,
          trackType: options.routeMetadata?.sport,
          provider: options.provider,
          routeMetadata: options.routeMetadata,
          sourceId: options.sourceId,
        });
        
        logger.info(`Trail ID: ${syncResult.trailId}`);
        logger.info(`URL: ${syncResult.url}`);
      }

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
