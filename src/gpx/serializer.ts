/**
 * GPX XML serializer — converts GPX structures to GPX 1.1 XML format.
 * 
 * Generates valid GPX 1.1 XML with proper namespace declarations and
 * element structure. Uses manual string templating for full control over
 * formatting and attribute ordering.
 */

import type { GPXFile, GPXTrack, GPXTrackSegment, GPXPoint, GPXWaypoint } from './types.js';

/**
 * Escape special XML characters in a string.
 * 
 * @param str - The string to escape
 * @returns XML-safe string with &, <, >, ", and ' escaped
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Serialize a GPX point to XML.
 * 
 * @param point - The GPX point to serialize
 * @param indent - Indentation level (number of spaces)
 * @returns XML string for the <trkpt> element
 */
function serializePoint(point: GPXPoint, indent: number): string {
  const spaces = ' '.repeat(indent);
  const lines: string[] = [];
  
  // Opening tag with lat/lng attributes
  lines.push(`${spaces}<trkpt lat="${point.lat}" lon="${point.lng}">`);
  
  // Elevation
  if (point.ele !== undefined) {
    lines.push(`${spaces}  <ele>${point.ele}</ele>`);
  }
  
  // Timestamp (if present)
  if (point.time) {
    lines.push(`${spaces}  <time>${point.time}</time>`);
  }
  
  // Closing tag
  lines.push(`${spaces}</trkpt>`);
  
  return lines.join('\n');
}

/**
 * Serialize a GPX segment to XML.
 * 
 * @param segment - The GPX segment to serialize
 * @param indent - Indentation level (number of spaces)
 * @returns XML string for the <trkseg> element
 */
function serializeSegment(segment: GPXTrackSegment, indent: number): string {
  const spaces = ' '.repeat(indent);
  const lines: string[] = [];
  
  // Opening tag
  lines.push(`${spaces}<trkseg>`);
  
  // All points in the segment
  for (const point of segment.points) {
    lines.push(serializePoint(point, indent + 2));
  }
  
  // Closing tag
  lines.push(`${spaces}</trkseg>`);
  
  return lines.join('\n');
}

/**
 * Serialize a GPX track to XML.
 * 
 * @param track - The GPX track to serialize
 * @returns XML string for the <trk> element
 */
function serializeTrack(track: GPXTrack): string {
  const lines: string[] = [];
  
  // Opening tag
  lines.push('  <trk>');
  
  // Track name (if present)
  if (track.name) {
    lines.push(`    <name>${escapeXml(track.name)}</name>`);
  }
  
  // Track comment
  if (track.comment) {
    lines.push(`    <cmt>${escapeXml(track.comment)}</cmt>`);
  }
  
  // Track description
  if (track.description) {
    lines.push(`    <desc>${escapeXml(track.description)}</desc>`);
  }
  
  // Track type (sport/activity)
  if (track.type) {
    lines.push(`    <type>${escapeXml(track.type)}</type>`);
  }
  
  // Track time (ISO 8601 timestamp)
  if (track.time) {
    lines.push(`    <time>${track.time}</time>`);
  }
  
  // All segments in the track
  for (const segment of track.segments) {
    lines.push(serializeSegment(segment, 4));
  }
  
  // Closing tag
  lines.push('  </trk>');
  
  return lines.join('\n');
}

/**
 * Serialize a waypoint to XML.
 * 
 * @param waypoint - The GPX waypoint to serialize
 * @param indent - Indentation level (number of spaces)
 * @returns XML string for the <wpt> element
 */
function serializeWaypoint(waypoint: GPXWaypoint, indent: number): string {
  const spaces = ' '.repeat(indent);
  const lines: string[] = [];
  
  // Opening tag with lat/lng attributes
  lines.push(`${spaces}<wpt lat="${waypoint.lat}" lon="${waypoint.lng}">`);
  
  // Elevation
  if (waypoint.ele !== undefined) {
    lines.push(`${spaces}  <ele>${waypoint.ele}</ele>`);
  }
  
  // Name
  if (waypoint.name) {
    lines.push(`${spaces}  <name>${escapeXml(waypoint.name)}</name>`);
  }
  
  // Symbol
  if (waypoint.sym) {
    lines.push(`${spaces}  <sym>${escapeXml(waypoint.sym)}</sym>`);
  }
  
  // Closing tag
  lines.push(`${spaces}</wpt>`);
  
  return lines.join('\n');
}

/**
 * Serialize a complete GPX document to XML.
 * 
 * Generates a valid GPX 1.1 document with proper XML declaration,
 * namespace declarations, and the track structure.
 * 
 * @param gpx - The GPX file to serialize
 * @returns Complete GPX XML document as a string
 */
export function serializeGPX(gpx: GPXFile): string {
  const lines: string[] = [];
  
  // XML declaration
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  
  // GPX root element with namespace declarations
  lines.push(`<gpx version="${gpx.version || '1.1'}" creator="${gpx.creator || 'gpx2wanderer'}"`);
  lines.push('     xmlns="http://www.topografix.com/GPX/1/1"');
  lines.push('     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  lines.push('     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">');
  
  // Metadata (if present)
  if (gpx.metadata) {
    lines.push('  <metadata>');
    if (gpx.metadata.name) {
      lines.push(`    <name>${escapeXml(gpx.metadata.name)}</name>`);
    }
    if (gpx.metadata.desc) {
      lines.push(`    <desc>${escapeXml(gpx.metadata.desc)}</desc>`);
    }
    if (gpx.metadata.time) {
      lines.push(`    <time>${gpx.metadata.time}</time>`);
    }
    lines.push('  </metadata>');
  }
  
  // Waypoints (if present)
  if (gpx.waypoints && gpx.waypoints.length > 0) {
    for (const waypoint of gpx.waypoints) {
      lines.push(serializeWaypoint(waypoint, 2));
    }
  }
  
  // Tracks
  for (const track of gpx.tracks) {
    lines.push(serializeTrack(track));
  }
  
  // Closing tag
  lines.push('</gpx>');
  
  return lines.join('\n');
}
