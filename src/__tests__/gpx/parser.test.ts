/**
 * Unit tests for the GPX parser
 */

import { parseGPX } from '../../gpx/parser.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('GPX Parser', () => {
  describe('parseGPX with test file', () => {
    let gpxContent: string;

    beforeAll(() => {
      const gpxPath = resolve(__dirname, '../__data__/Wanderer-Test-Track-01.gpx');
      gpxContent = readFileSync(gpxPath, 'utf-8');
    });

    it('should parse the test GPX file successfully', () => {
      const result = parseGPX(gpxContent);
      expect(result).toBeDefined();
      expect(result.tracks).toBeDefined();
      expect(result.tracks.length).toBeGreaterThan(0);
    });

    it('should extract version and creator attributes', () => {
      const result = parseGPX(gpxContent);
      expect(result.version).toBe('1.1');
      expect(result.creator).toBe('https://www.komoot.de');
    });

    it('should parse metadata', () => {
      const result = parseGPX(gpxContent);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.name).toBe('Wanderer-Test-Track');
    });

    it('should parse track name and type', () => {
      const result = parseGPX(gpxContent);
      const track = result.tracks[0];
      expect(track.name).toBe('Wanderer-Test-Track');
      expect(track.type).toBe('mtb_easy');
    });

    it('should parse track segments', () => {
      const result = parseGPX(gpxContent);
      const track = result.tracks[0];
      expect(track.segments).toBeDefined();
      expect(track.segments.length).toBe(1);
    });

    it('should parse track points with coordinates', () => {
      const result = parseGPX(gpxContent);
      const points = result.tracks[0].segments[0].points;
      expect(points.length).toBeGreaterThan(0);
      
      // Check first point
      const firstPoint = points[0];
      expect(firstPoint.lat).toBeCloseTo(53.330329, 6);
      expect(firstPoint.lng).toBeCloseTo(10.138136, 6);
    });

    it('should parse elevation data', () => {
      const result = parseGPX(gpxContent);
      const points = result.tracks[0].segments[0].points;
      
      // Check that elevation is parsed
      expect(points[0].ele).toBeDefined();
      expect(points[0].ele).toBeCloseTo(30.040923, 6);
    });

    it('should parse timestamp data', () => {
      const result = parseGPX(gpxContent);
      const points = result.tracks[0].segments[0].points;
      
      // Check that time is parsed
      expect(points[0].time).toBeDefined();
      expect(points[0].time).toBe('2026-08-26T07:51:36.773Z');
    });

    it('should parse all track points', () => {
      const result = parseGPX(gpxContent);
      const points = result.tracks[0].segments[0].points;
      
      // The test file has 244 track points
      expect(points.length).toBe(244);
    });
  });

  describe('parseGPX with minimal GPX', () => {
    it('should parse minimal GPX with just tracks', () => {
      const minimalGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <trkseg>
      <trkpt lat="53.0" lon="10.0">
        <ele>100</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(minimalGpx);
      expect(result.version).toBe('1.1');
      expect(result.creator).toBe('test');
      expect(result.tracks.length).toBe(1);
      expect(result.tracks[0].segments.length).toBe(1);
      expect(result.tracks[0].segments[0].points.length).toBe(1);
      expect(result.tracks[0].segments[0].points[0].lat).toBe(53.0);
      expect(result.tracks[0].segments[0].points[0].lng).toBe(10.0);
      expect(result.tracks[0].segments[0].points[0].ele).toBe(100);
    });

    it('should handle GPX without metadata', () => {
      const gpxWithoutMetadata = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <trkseg>
      <trkpt lat="53.0" lon="10.0"/>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxWithoutMetadata);
      expect(result.metadata).toBeUndefined();
    });

    it('should handle track points without elevation or time', () => {
      const gpxMinimalPoints = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <trkseg>
      <trkpt lat="53.0" lon="10.0"/>
      <trkpt lat="53.1" lon="10.1"/>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxMinimalPoints);
      const points = result.tracks[0].segments[0].points;
      expect(points.length).toBe(2);
      expect(points[0].ele).toBeUndefined();
      expect(points[0].time).toBeUndefined();
    });
  });

  describe('parseGPX with multiple tracks', () => {
    it('should parse GPX with multiple tracks', () => {
      const multiTrackGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Track 1</name>
    <trkseg>
      <trkpt lat="53.0" lon="10.0"/>
    </trkseg>
  </trk>
  <trk>
    <name>Track 2</name>
    <trkseg>
      <trkpt lat="54.0" lon="11.0"/>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(multiTrackGpx);
      expect(result.tracks.length).toBe(2);
      expect(result.tracks[0].name).toBe('Track 1');
      expect(result.tracks[1].name).toBe('Track 2');
    });

    it('should parse GPX with multiple segments in one track', () => {
      const multiSegmentGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Multi-segment track</name>
    <trkseg>
      <trkpt lat="53.0" lon="10.0"/>
      <trkpt lat="53.1" lon="10.1"/>
    </trkseg>
    <trkseg>
      <trkpt lat="54.0" lon="11.0"/>
      <trkpt lat="54.1" lon="11.1"/>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(multiSegmentGpx);
      expect(result.tracks.length).toBe(1);
      expect(result.tracks[0].segments.length).toBe(2);
      expect(result.tracks[0].segments[0].points.length).toBe(2);
      expect(result.tracks[0].segments[1].points.length).toBe(2);
    });
  });

  describe('parseGPX with waypoints', () => {
    it('should parse GPX with waypoints', () => {
      const gpxWithWaypoints = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <wpt lat="53.0" lon="10.0">
    <ele>100</ele>
    <name>Waypoint 1</name>
    <sym>Flag</sym>
  </wpt>
  <wpt lat="54.0" lon="11.0">
    <ele>200</ele>
    <name>Waypoint 2</name>
  </wpt>
  <trk>
    <trkseg>
      <trkpt lat="53.5" lon="10.5"/>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(gpxWithWaypoints);
      expect(result.waypoints).toBeDefined();
      expect(result.waypoints?.length).toBe(2);
      expect(result.waypoints?.[0].lat).toBe(53.0);
      expect(result.waypoints?.[0].lng).toBe(10.0);
      expect(result.waypoints?.[0].ele).toBe(100);
      expect(result.waypoints?.[0].name).toBe('Waypoint 1');
      expect(result.waypoints?.[0].sym).toBe('Flag');
      expect(result.waypoints?.[1].name).toBe('Waypoint 2');
    });
  });

  describe('parseGPX error handling', () => {
    it('should throw error for invalid XML', () => {
      const invalidXml = 'not xml at all';
      expect(() => parseGPX(invalidXml)).toThrow();
    });

    it('should throw error for missing gpx root element', () => {
      const noGpxRoot = `<?xml version="1.0" encoding="UTF-8"?>
<notgpx>
  <trk>
    <trkseg>
      <trkpt lat="53.0" lon="10.0"/>
    </trkseg>
  </trk>
</notgpx>`;

      expect(() => parseGPX(noGpxRoot)).toThrow('Invalid GPX file: missing <gpx> root element');
    });

    it('should handle empty GPX file', () => {
      const emptyGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
</gpx>`;

      const result = parseGPX(emptyGpx);
      expect(result.tracks).toEqual([]);
      expect(result.waypoints).toBeUndefined();
    });
  });

  describe('parseGPX coordinate precision', () => {
    it('should preserve high precision coordinates', () => {
      const highPrecisionGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <trkseg>
      <trkpt lat="53.330329123" lon="10.138136456">
        <ele>30.040923789</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const result = parseGPX(highPrecisionGpx);
      const point = result.tracks[0].segments[0].points[0];
      expect(point.lat).toBeCloseTo(53.330329123, 9);
      expect(point.lng).toBeCloseTo(10.138136456, 9);
      expect(point.ele).toBeCloseTo(30.040923789, 9);
    });
  });
});
