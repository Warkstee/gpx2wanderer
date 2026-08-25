/**
 * GPX file parser
 */

import { XMLParser } from 'fast-xml-parser';
import type { GPXFile, GPXPoint, GPXTrack, GPXTrackSegment, GPXWaypoint } from './types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

/**
 * Parse GPX XML string into structured data
 */
export function parseGPX(xmlContent: string): GPXFile {
  const parsed = parser.parse(xmlContent);
  const gpx = parsed.gpx;

  if (!gpx) {
    throw new Error('Invalid GPX file: missing <gpx> root element');
  }

  const result: GPXFile = {
    version: gpx['@_version'],
    creator: gpx['@_creator'],
    tracks: [],
  };

  // Parse metadata
  if (gpx.metadata) {
    result.metadata = {
      name: gpx.metadata.name,
      desc: gpx.metadata.desc,
      time: gpx.metadata.time,
    };
  }

  // Parse waypoints
  if (gpx.wpt) {
    const wpts = Array.isArray(gpx.wpt) ? gpx.wpt : [gpx.wpt];
    result.waypoints = wpts.map(parseWaypoint);
  }

  // Parse tracks
  if (gpx.trk) {
    const trks = Array.isArray(gpx.trk) ? gpx.trk : [gpx.trk];
    result.tracks = trks.map(parseTrack);
  }

  return result;
}

function parseTrack(trk: any): GPXTrack {
  const track: GPXTrack = {
    name: trk.name,
    type: trk.type,
    comment: trk.cmt,
    description: trk.desc,
    time: trk.time,
    segments: [],
  };

  if (trk.trkseg) {
    const segs = Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg];
    track.segments = segs.map(parseSegment);
  }

  return track;
}

function parseSegment(seg: any): GPXTrackSegment {
  const segment: GPXTrackSegment = {
    points: [],
  };

  if (seg.trkpt) {
    const pts = Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt];
    segment.points = pts.map(parsePoint);
  }

  return segment;
}

function parsePoint(pt: any): GPXPoint {
  const point: GPXPoint = {
    lat: parseFloat(pt['@_lat']),
    lng: parseFloat(pt['@_lon']),
  };

  if (pt.ele !== undefined) {
    point.ele = parseFloat(pt.ele);
  }

  if (pt.time !== undefined) {
    point.time = pt.time;
  }

  return point;
}

function parseWaypoint(wpt: any): GPXWaypoint {
  const waypoint: GPXWaypoint = {
    lat: parseFloat(wpt['@_lat']),
    lng: parseFloat(wpt['@_lon']),
  };

  if (wpt.ele !== undefined) {
    waypoint.ele = parseFloat(wpt.ele);
  }

  if (wpt.name !== undefined) {
    waypoint.name = wpt.name;
  }

  if (wpt.sym !== undefined) {
    waypoint.sym = wpt.sym;
  }

  return waypoint;
}
