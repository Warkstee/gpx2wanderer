/**
 * GPX data structures
 */

export interface GPXPoint {
  lat: number;
  lng: number;
  ele?: number;
  time?: string;
}

export interface GPXTrackSegment {
  points: GPXPoint[];
}

export interface GPXTrack {
  name?: string;
  type?: string;
  comment?: string;
  description?: string;
  time?: string;
  segments: GPXTrackSegment[];
}

export interface GPXWaypoint {
  lat: number;
  lng: number;
  ele?: number;
  name?: string;
  sym?: string;
}

export interface GPXFile {
  version?: string;
  creator?: string;
  metadata?: {
    name?: string;
    desc?: string;
    time?: string;
  };
  waypoints?: GPXWaypoint[];
  tracks: GPXTrack[];
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
