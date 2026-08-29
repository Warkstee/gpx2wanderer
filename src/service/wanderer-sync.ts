/**
 * Wanderer Sync Service
 * 
 * Handles uploading/updating trails in Wanderer.
 * Extracted from CLI for reuse by both CLI and API.
 */

import {
  uploadTrail,
  updateTrail,
  DuplicateTrailError,
  findTrailBySourceTag,
  createTag,
  deleteTag,
  listTags,
} from '../wanderer/api.js';
import { mapSportToCategory } from '../wanderer/category-mapping.js';
import * as logger from '../utils/logger.js';
import type { WandererSyncOptions, WandererSyncResult } from './types.js';

/**
 * Map GPX track type to Wanderer difficulty.
 * 
 * Derives difficulty from the track type string (e.g., "mtb_easy" → "easy").
 * Falls back to "moderate" for unrecognized types.
 */
export function mapTypeToDifficulty(trackType?: string): string | undefined {
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
 * Upload or update a trail in Wanderer.
 * 
 * Handles the full sync flow:
 * 1. If sourceId provided, check for existing trail with that tag
 * 2. If existing trail found, try to update it
 * 3. If update fails (trail deleted), clean up orphaned tag and upload as new
 * 4. If no existing trail, upload as new
 * 5. Handle duplicate trail errors by updating instead
 * 6. Create source tag if needed
 * 7. Update trail metadata (category, difficulty, tags)
 * 
 * @param options - Sync options
 * @returns Sync result with trail info
 * @throws Error if sync fails
 */
export async function syncToWanderer(
  options: WandererSyncOptions
): Promise<WandererSyncResult> {
  const { session, gpxXml, trackName, trackType, provider, routeMetadata, sourceId } = options;

  logger.info('Uploading to Wanderer...');

  // Resolve category and difficulty metadata
  const sportCode = routeMetadata?.sport || trackType;
  const categoryMapping = sportCode && provider ? mapSportToCategory(provider, sportCode) : null;
  const difficulty = mapTypeToDifficulty(trackType);
  const duration = routeMetadata?.duration;

  let trailId: string = '';
  let trailName: string = '';
  let isNewTrail = true;
  let skipTagCreation = false;

  // Optimistic update flow if source-id is provided
  if (sourceId) {
    const sourceTag = `gpx2wanderer-${sourceId}`;
    logger.debug(`Checking for existing trail with tag: ${sourceTag}`);
    
    const existingTrailId = await findTrailBySourceTag(
      session.host,
      session.cookie,
      sourceTag
    );

    if (existingTrailId) {
      logger.info(`Found existing trail ID: ${existingTrailId}`);
      
      // Try to update the existing trail
      try {
        logger.info('Attempting to update existing trail...');
        await updateTrail(
          session.host,
          session.cookie,
          existingTrailId,
          difficulty,
          categoryMapping?.category,
          categoryMapping?.subcategory,
          undefined, // tagIds - not needed, trail already has tag
          gpxXml, // Update the GPX track data
          duration,
        );
        
        trailId = existingTrailId;
        trailName = 'Existing trail';
        isNewTrail = false;
        skipTagCreation = true; // Trail already has tag from previous upload
        
        logger.success('Trail updated successfully');
        logger.info(`  Trail ID: ${trailId}`);
        logger.info(`  URL: ${session.host}/trail/${trailId}`);
      } catch (updateErr) {
        // Update failed - trail was likely deleted
        logger.warn(`Update failed: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`);
        logger.info('Trail may have been deleted. Cleaning up orphaned tag...');
        
        // Find and delete the orphaned tag
        const tags = await listTags(session.host, session.cookie);
        const orphanedTag = tags.find(t => t.name === sourceTag);
        if (orphanedTag) {
          await deleteTag(session.host, session.cookie, orphanedTag.id);
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
        session.host,
        session.cookie,
        gpxXml,
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
      logger.info(`  URL: ${session.host}/trail/${trail.id}`);
    } catch (err) {
      // If it's a duplicate, update the existing trail instead
      if (err instanceof DuplicateTrailError) {
        logger.warn(`Duplicate trail detected: "${err.trailName}" (${err.trailId})`);
        logger.info('Updating existing trail instead...');
        trailId = err.trailId;
        trailName = err.trailName;
        isNewTrail = false;
        skipTagCreation = true;
        
        // Update the duplicate trail with new GPX and metadata
        await updateTrail(
          session.host,
          session.cookie,
          trailId,
          difficulty,
          categoryMapping?.category,
          categoryMapping?.subcategory,
          undefined,
          gpxXml,
          duration,
        );
        
        logger.success('Trail updated successfully');
        logger.info(`  Trail ID: ${trailId}`);
        logger.info(`  URL: ${session.host}/trail/${trailId}`);
      } else {
        throw err;
      }
    }
  }

  // Create source tag if source-id is provided and we have a trail ID
  let sourceTagId: string | undefined;
  if (sourceId && trailId && !skipTagCreation) {
    const sourceTag = `gpx2wanderer-${sourceId}`;
    logger.info(`Creating source tag: ${sourceTag}`);
    try {
      const tag = await createTag(session.host, session.cookie, sourceTag);
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
        session.host,
        session.cookie,
        trailId,
        difficulty,
        categoryMapping?.category,
        categoryMapping?.subcategory,
        sourceTagId ? [sourceTagId] : undefined,
        isNewTrail ? gpxXml : undefined, // Only send GPX for new trails
        duration,
      );
      if (categoryMapping) {
        logger.info(`  Category: ${categoryMapping.category}${categoryMapping.subcategory ? ` (${categoryMapping.subcategory})` : ''}`);
      }
      if (difficulty) {
        logger.info(`  Difficulty: ${difficulty}`);
      }
      if (sourceTagId) {
        logger.info(`  Tag: gpx2wanderer-${sourceId}`);
      }
      logger.success('Trail metadata updated');
      logger.info(`  URL: ${session.host}/trail/${trailId}`);
    } catch (err) {
      logger.error(`Metadata update failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  return {
    trailId,
    trailName,
    isNew: isNewTrail,
    url: `${session.host}/trail/${trailId}`,
    distance: undefined, // Could fetch from trail if needed
    elevationGain: undefined,
  };
}
