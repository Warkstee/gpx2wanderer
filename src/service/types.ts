/**
 * Service layer types
 * 
 * Shared types for the service layer used by both CLI and API.
 */

import type { GPXFile, GPXPoint } from '../gpx/types.js';
import type { RouteMetadata } from '../providers/types.js';

/**
 * Options for the GPX processing pipeline.
 */
export interface PipelineOptions {
  /** Douglas-Peucker simplification epsilon in meters (default: 30) */
  epsilon?: number;
  /** Maximum divergence tolerance in meters (default: 50) */
  tolerance?: number;
  /** Maximum Valhalla validation iterations (default: 10) */
  maxIterations?: number;
  /** Valhalla costing model: 'bike' or 'hike' (default: 'bike') */
  costing?: string;
  /** Enable post-processing waypoint simplification (default: false) */
  postSimplify?: boolean;
  /** Turn angle threshold for anchor point detection in degrees (default: 150) */
  turnThreshold?: number;
}

/**
 * Result of the GPX processing pipeline.
 */
export interface PipelineResult {
  /** Processed GPX file with waypoints */
  gpx: GPXFile;
  /** Serialized GPX XML content */
  gpxXml: string;
  /** Track name */
  trackName: string;
  /** Number of waypoints generated */
  waypointCount: number;
  /** Number of iterations performed */
  iterations: number;
  /** Maximum divergence in meters */
  maxDivergence: number;
  /** Whether the algorithm converged */
  converged: boolean;
}

/**
 * Wanderer session (authenticated).
 */
export interface WandererSession {
  host: string;
  cookie: string;
}

/**
 * Options for uploading to Wanderer.
 */
export interface WandererSyncOptions {
  /** Wanderer session */
  session: WandererSession;
  /** GPX XML content to upload */
  gpxXml: string;
  /** Track name */
  trackName: string;
  /** Track type (for difficulty mapping) */
  trackType?: string;
  /** Provider name (e.g., 'komoot', 'strava') */
  provider?: string;
  /** Route metadata from provider */
  routeMetadata?: RouteMetadata;
  /** Source identifier for optimistic update (e.g., 'komoot-12345') */
  sourceId?: string;
}

/**
 * Result of uploading to Wanderer.
 */
export interface WandererSyncResult {
  /** Trail ID in Wanderer */
  trailId: string;
  /** Trail name */
  trailName: string;
  /** Whether this was a new trail (vs. update) */
  isNew: boolean;
  /** Wanderer URL for the trail */
  url: string;
  /** Distance in meters (if available) */
  distance?: number;
  /** Elevation gain in meters (if available) */
  elevationGain?: number;
}
