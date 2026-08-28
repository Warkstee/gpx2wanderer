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
import { loadValhallaConfig, hasValhallaConfig, saveValhallaConfig, loadWandererCredentials, saveWandererCookie, type WandererCredentials } from './providers/auth/credentials.js';
import { promptForWandererCredentials } from './wanderer/prompts.js';
import { login as wandererLogin, validateCookie, uploadTrail, updateTrail, DuplicateTrailError, findTrailBySourceTag, createTag, deleteTag, listTags, cleanupOrphanedTags } from './wanderer/api.js';
import { promptForKomootCredentials } from './providers/komoot/prompts.js';
import { KomootProvider } from './providers/komoot/index.js';
import { mapSportToCategory } from './wanderer/category-mapping.js';
import * as logger from './utils/logger.js';
import type { GPXFile, GPXTrack, GPXPoint } from './gpx/types.js';
import { writeFileSync } from 'fs';

// Load environment variables (for backward compatibility)
dotenv.config();

/**
 * Map GPX track type to Wanderer difficulty.
 * 
 * Derives difficulty from the track type string (e.g., "mtb_easy" → "easy").
 * Falls back to "moderate" for unrecognized types.
 */
function mapTypeToDifficulty(trackType?: string): string | undefined {
  if (!trackType) return undefined;

  const type = trackType.toLowerCase();

  // Explicit easy types
  if (type.includes('easy') || type === 'walking' || type === 'walk') {
    return 'easy';
  }

  // Explicit difficult types
  if (type.includes('difficult') || type.includes('extreme') || type === 'mtb' || type === 'enduro') {
    return 'difficult';
  }

  // Moderate types (default for most activity types)
  if (type.includes('moderate') || type === 'hike' || type === 'hiking' || type === 'bike' || type === 'cycling') {
    return 'moderate';
  }

  // For known sport codes that don't have an explicit difficulty hint, default to moderate
  return 'moderate';
}

/**
 * Resolve Wanderer authentication:
 * 1. Load stored credentials
 * 2. Validate cached cookie or re-authenticate
 * 3. Prompt user if credentials are missing or invalid (when promptOnFailure is true)
 * 
 * Returns the authenticated session (host + cookie) or null if authentication
 * is skipped or fails.
 */
async function resolveWandererAuth(promptOnFailure: boolean = false): Promise<{ host: string; cookie: string } | null> {
  // Load stored Wanderer credentials
  let wandererCreds = loadWandererCredentials();
  
  if (!wandererCreds) {
    logger.debug('No stored Wanderer credentials found');
    if (promptOnFailure) {
      wandererCreds = await promptForWandererCredentials();
      if (!wandererCreds) return null;
      // promptForWandererCredentials already logs in and saves the cookie
      return { host: wandererCreds.host, cookie: wandererCreds.cookie! };
    }
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
        if (promptOnFailure) {
          wandererCreds = await promptForWandererCredentials('\nStored Wanderer credentials are no longer valid. Please log in again.\n');
          if (!wandererCreds) return null;
          return { host: wandererCreds.host, cookie: wandererCreds.cookie! };
        }
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
      if (promptOnFailure) {
        wandererCreds = await promptForWandererCredentials('\nWanderer login failed. Please check your credentials.\n');
        if (!wandererCreds) return null;
        return { host: wandererCreds.host, cookie: wandererCreds.cookie! };
      }
      return null;
    }
  }
  
  return { host: wandererCreds.host, cookie: cookie! };
}

const program = new Command();

program
  .name('gpx2wanderer')
  .description('Convert GPX tracks to Wanderer-compatible format with algorithmic waypoint generation')
  .version('0.1.0');

// Config command for managing credentials
program
  .command('config')
  .description('Manage configuration and credentials')
  .argument('<service>', 'Service to configure (valhalla, wanderer, komoot)')
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
      } else {
        console.error(chalk.red(`Error: Unknown service "${service}". Available services: valhalla, wanderer, komoot`));
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
      const session = await resolveWandererAuth(true);
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
      }

      // Validate that we have a GPX file to process
      if (!gpxFile) {
        console.error(chalk.red('Error: GPX file is required. Provide a file path or use --komoot <route-id>'));
        process.exit(1);
      }

      console.log(chalk.gray(`Processing: ${gpxFile}`));
      
      // --- Wanderer Authentication (only when --upload is set) -----------------
      let wandererSession: { host: string; cookie: string } | null = null;
      if (options.upload) {
        wandererSession = await resolveWandererAuth(true);
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
      
      logger.success(`Output written to: ${outputPath}`);

      // --- Upload to Wanderer (if --upload is set) ----------------------------
      if (options.upload && wandererSession) {
        logger.info('\nUploading to Wanderer...');

        // Read the serialized GPX for upload
        const uploadGpx = readFileSync(outputPath, 'utf-8');

        // Resolve category and difficulty metadata (needed for both upload and update)
        const categoryMapping = track.type ? mapSportToCategory(track.type) : null;
        const difficulty = mapTypeToDifficulty(track.type);

        let trailId: string = '';
        let trailName: string = '';
        let isNewTrail = true;
        let skipTagCreation = false;

        // Optimistic update flow if source-id is provided
        if (options.sourceId) {
          const sourceTag = `gpx2wanderer-${options.sourceId}`;
          logger.debug(`Checking for existing trail with tag: ${sourceTag}`);
          
          const existingTrailId = await findTrailBySourceTag(
            wandererSession.host,
            wandererSession.cookie,
            sourceTag
          );

          if (existingTrailId) {
            logger.info(`Found existing trail ID: ${existingTrailId}`);
            
            // Try to update the existing trail
            try {
              logger.info('Attempting to update existing trail...');
              await updateTrail(
                wandererSession.host,
                wandererSession.cookie,
                existingTrailId,
                difficulty,
                categoryMapping?.category,
                categoryMapping?.subcategory,
                undefined, // tagIds - not needed, trail already has tag
                uploadGpx, // Update the GPX track data
              );
              
              trailId = existingTrailId;
              trailName = 'Existing trail';
              isNewTrail = false;
              skipTagCreation = true; // Trail already has tag from previous upload
              
              logger.success('Trail updated successfully');
              logger.info(`  Trail ID: ${trailId}`);
              logger.info(`  URL: ${wandererSession.host}/trail/${trailId}`);
            } catch (updateErr) {
              // Update failed - trail was likely deleted
              logger.warn(`Update failed: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`);
              logger.info('Trail may have been deleted. Cleaning up orphaned tag...');
              
              // Find and delete the orphaned tag
              const tags = await listTags(wandererSession.host, wandererSession.cookie);
              const orphanedTag = tags.find(t => t.name === sourceTag);
              if (orphanedTag) {
                await deleteTag(wandererSession.host, wandererSession.cookie, orphanedTag.id);
                logger.success('Orphaned tag deleted');
              }
              
              // Fall through to upload as new
              trailId = '';
              trailName = '';
            }
          }
        }

        // Upload as new if no existing trail or update failed
        if (!trailId) {
          try {
            const trail = await uploadTrail(
              wandererSession.host,
              wandererSession.cookie,
              uploadGpx,
              trackName,
            );

            trailId = trail.id;
            trailName = trail.name;

            logger.success('Trail uploaded successfully!');
            logger.info(`  Trail ID: ${trail.id}`);
            logger.info(`  Name: ${trail.name}`);
            if (trail.distance) {
              logger.info(`  Distance: ${(trail.distance / 1000).toFixed(2)} km`);
            }
            if (trail.elevation_gain) {
              logger.info(`  Elevation gain: ${trail.elevation_gain.toFixed(0)} m`);
            }
            logger.info(`  URL: ${wandererSession.host}/trail/${trail.id}`);
          } catch (err) {
            // If it's a duplicate, update the existing trail instead
            if (err instanceof DuplicateTrailError) {
              logger.warn(`Duplicate trail detected: "${err.trailName}" (${err.trailId})`);
              logger.info('Updating existing trail instead...');
              trailId = err.trailId;
              trailName = err.trailName;
              isNewTrail = false;
              skipTagCreation = true; // Trail already exists with tag from previous upload
            } else {
              logger.error(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
              process.exit(1);
            }
          }
        }

        // Create source tag if source-id is provided and we have a trail ID
        let sourceTagId: string | undefined;
        if (options.sourceId && trailId && !skipTagCreation) {
          const sourceTag = `gpx2wanderer-${options.sourceId}`;
          logger.info(`Creating source tag: ${sourceTag}`);
          try {
            const tag = await createTag(wandererSession.host, wandererSession.cookie, sourceTag);
            sourceTagId = tag.id;
            logger.success('Source tag created');
          } catch (err) {
            logger.warn(`Failed to create source tag: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        // Update trail with category, difficulty, and tag metadata
        if (trailId && (categoryMapping || difficulty || sourceTagId)) {
          logger.info(`Updating trail metadata${isNewTrail ? '' : ' on existing trail'}...`);
          try {
            await updateTrail(
              wandererSession.host,
              wandererSession.cookie,
              trailId,
              difficulty,
              categoryMapping?.category,
              categoryMapping?.subcategory,
              sourceTagId ? [sourceTagId] : undefined,
              isNewTrail ? uploadGpx : undefined, // Only send GPX for new trails
            );
            if (categoryMapping) {
              logger.info(`  Category: ${categoryMapping.category}${categoryMapping.subcategory ? ` (${categoryMapping.subcategory})` : ''}`);
            }
            if (difficulty) {
              logger.info(`  Difficulty: ${difficulty}`);
            }
            if (sourceTagId) {
              logger.info(`  Tag: gpx2wanderer-${options.sourceId}`);
            }
            logger.success('Trail metadata updated');
            logger.info(`  URL: ${wandererSession.host}/trail/${trailId}`);
          } catch (err) {
            logger.error(`Metadata update failed: ${err instanceof Error ? err.message : String(err)}`);
            process.exit(1);
          }
        }
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
