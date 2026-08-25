/**
 * GPX file serializer
 */

import { XMLBuilder } from 'fast-xml-parser';
import type { GPXFile, GPXPoint, GPXTrack, GPXWaypoint } from './types.js';

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  format: true,
  indentBy: '  ',
});

/**
 * Serialize GPX data to XML string
 */
export function serializeGPX(gpx: GPXFile): string {
  const gpxObj: any = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    gpx: {
      '@_xmlns': 'http://www.topografix.com/GPX/1/1',
      '@_version': gpx.version || '1.1',
      '@_creator': gpx.creator || 'gpx2wanderer',
    },
  };

  // Add metadata
  if (gpx.metadata) {
    gpxObj.gpx.metadata = gpx.metadata;
  }

  // Add waypoints
  if (gpx.waypoints && gpx.waypoints.length > 0) {
    gpxObj.gpx.wpt = gpx.waypoints.map(serializeWaypoint);
  }

  // Add tracks
  if (gpx.tracks.length > 0) {
    gpxObj.gpx.trk = gpx.tracks.map(serializeTrack);
  }

  return builder.build(gpxObj);
}

function serializeTrack(track: GPXTrack): any {
  const trk: any = {};

  if (track.name) {
    trk.name = track.name;
  }

  if (track.segments.length > 0) {
    trk.trkseg = track.segments.map(serializeSegment);
  }

  return trk;
}

function serializeSegment(segment: { points: GPXPoint[] }): any {
  return {
    trkpt: segment.points.map(serializePoint),
  };
}

function serializePoint(point: GPXPoint): any {
  const pt: any = {
    '@_lat': point.lat.toString(),
    '@_lon': point.lon.toString(),
  };

  if (point.ele !== undefined) {
    pt.ele = point.ele.toString();
  }

  if (point.time !== undefined) {
    pt.time = point.time;
  }

  return pt;
}

function serializeWaypoint(waypoint: GPXWaypoint): any {
  const wpt: any = {
    '@_lat': waypoint.lat.toString(),
    '@_lon': waypoint.lon.toString(),
  };

  if (waypoint.ele !== undefined) {
    wpt.ele = waypoint.ele.toString();
  }

  if (waypoint.name !== undefined) {
    wpt.name = waypoint.name;
  }

  if (waypoint.sym !== undefined) {
    wpt.sym = waypoint.sym;
  }

  return wpt;
}
