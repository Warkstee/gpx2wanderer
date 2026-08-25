/**
 * Unit tests for the GPX serializer
 */

import { serializeGPX } from '../../gpx/serializer.js';
import { parseGPX } from '../../gpx/parser.js';
import type { GPXFile, GPXTrack, GPXTrackSegment, GPXPoint } from '../../gpx/types.js';

describe('GPX Serializer', () => {
  describe('serializeGPX basic structure', () => {
    it('should produce valid XML declaration', () => {
      const gpx: GPXFile = {
        version: '1.1',
        creator: 'test',
        tracks: [],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });

    it('should include GPX root element with namespaces', () => {
      const gpx: GPXFile = {
        version: '1.1',
        creator: 'test',
        tracks: [],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<gpx version="1.1" creator="test"');
      expect(xml).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
      expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    });

    it('should use default values when not provided', () => {
      const gpx: GPXFile = {
        tracks: [],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('version="1.1"');
      expect(xml).toContain('creator="gpx2wanderer"');
    });

    it('should close GPX root element', () => {
      const gpx: GPXFile = {
        tracks: [],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('</gpx>');
    });
  });

  describe('serializeGPX with metadata', () => {
    it('should serialize metadata name', () => {
      const gpx: GPXFile = {
        metadata: {
          name: 'Test Track',
        },
        tracks: [],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<metadata>');
      expect(xml).toContain('<name>Test Track</name>');
      expect(xml).toContain('</metadata>');
    });

    it('should serialize metadata description', () => {
      const gpx: GPXFile = {
        metadata: {
          desc: 'A test description',
        },
        tracks: [],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<desc>A test description</desc>');
    });

    it('should serialize metadata time', () => {
      const gpx: GPXFile = {
        metadata: {
          time: '2026-08-25T12:00:00Z',
        },
        tracks: [],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<time>2026-08-25T12:00:00Z</time>');
    });
  });

  describe('serializeGPX with tracks', () => {
    it('should serialize track name', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'My Track',
            segments: [],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<trk>');
      expect(xml).toContain('<name>My Track</name>');
      expect(xml).toContain('</trk>');
    });

    it('should serialize track type', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            type: 'mtb_easy',
            segments: [],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<type>mtb_easy</type>');
    });

    it('should serialize track comment', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            comment: 'Easy ride',
            segments: [],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<cmt>Easy ride</cmt>');
    });

    it('should serialize track description', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            description: 'A nice trail',
            segments: [],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<desc>A nice trail</desc>');
    });

    it('should serialize track time', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            time: '2026-08-25T12:00:00Z',
            segments: [],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<time>2026-08-25T12:00:00Z</time>');
    });
  });

  describe('serializeGPX with track segments and points', () => {
    it('should serialize track segment', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            segments: [
              {
                points: [
                  { lat: 53.0, lng: 10.0 },
                ],
              },
            ],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<trkseg>');
      expect(xml).toContain('</trkseg>');
    });

    it('should serialize track point with lat/lng attributes', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            segments: [
              {
                points: [
                  { lat: 53.330329, lng: 10.138136 },
                ],
              },
            ],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<trkpt lat="53.330329" lon="10.138136">');
      expect(xml).toContain('</trkpt>');
    });

    it('should serialize track point elevation', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            segments: [
              {
                points: [
                  { lat: 53.0, lng: 10.0, ele: 100.5 },
                ],
              },
            ],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<ele>100.5</ele>');
    });

    it('should serialize track point time', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            segments: [
              {
                points: [
                  { lat: 53.0, lng: 10.0, time: '2026-08-25T12:00:00Z' },
                ],
              },
            ],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<time>2026-08-25T12:00:00Z</time>');
    });

    it('should serialize multiple points in a segment', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            segments: [
              {
                points: [
                  { lat: 53.0, lng: 10.0 },
                  { lat: 53.1, lng: 10.1 },
                  { lat: 53.2, lng: 10.2 },
                ],
              },
            ],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      const trkptMatches = xml.match(/<trkpt/g);
      expect(trkptMatches).toHaveLength(3);
    });

    it('should serialize multiple segments', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            segments: [
              {
                points: [{ lat: 53.0, lng: 10.0 }],
              },
              {
                points: [{ lat: 54.0, lng: 11.0 }],
              },
            ],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      const trksegMatches = xml.match(/<trkseg>/g);
      expect(trksegMatches).toHaveLength(2);
    });
  });

  describe('serializeGPX XML escaping', () => {
    it('should escape ampersands in track name', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Track & Trail',
            segments: [],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<name>Track &amp; Trail</name>');
    });

    it('should escape less-than and greater-than', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Track <test>',
            segments: [],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<name>Track &lt;test&gt;</name>');
    });

    it('should escape quotes', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Track "quoted"',
            segments: [],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<name>Track &quot;quoted&quot;</name>');
    });
  });

  describe('serializeGPX roundtrip', () => {
    it('should preserve data through parse → serialize → parse cycle', () => {
      const original: GPXFile = {
        version: '1.1',
        creator: 'test',
        metadata: {
          name: 'Test Track',
          desc: 'A test',
          time: '2026-08-25T12:00:00Z',
        },
        tracks: [
          {
            name: 'Track 1',
            type: 'mtb_easy',
            comment: 'Easy',
            description: 'Nice trail',
            time: '2026-08-25T12:00:00Z',
            segments: [
              {
                points: [
                  { lat: 53.330329, lng: 10.138136, ele: 30.5, time: '2026-08-25T12:00:00Z' },
                  { lat: 53.330171, lng: 10.138342, ele: 31.0, time: '2026-08-25T12:00:05Z' },
                ],
              },
            ],
          },
        ],
      };

      const xml = serializeGPX(original);
      const parsed = parseGPX(xml);

      expect(parsed.version).toBe(original.version);
      expect(parsed.creator).toBe(original.creator);
      expect(parsed.metadata?.name).toBe(original.metadata?.name);
      expect(parsed.metadata?.desc).toBe(original.metadata?.desc);
      expect(parsed.tracks[0].name).toBe(original.tracks[0].name);
      expect(parsed.tracks[0].type).toBe(original.tracks[0].type);
      expect(parsed.tracks[0].segments[0].points).toHaveLength(2);
      expect(parsed.tracks[0].segments[0].points[0].lat).toBeCloseTo(53.330329, 6);
      expect(parsed.tracks[0].segments[0].points[0].lng).toBeCloseTo(10.138136, 6);
      expect(parsed.tracks[0].segments[0].points[0].ele).toBe(30.5);
    });
  });

  describe('serializeGPX edge cases', () => {
    it('should handle empty track', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Empty Track',
            segments: [],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<trk>');
      expect(xml).toContain('<name>Empty Track</name>');
      expect(xml).toContain('</trk>');
    });

    it('should handle empty segment', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            name: 'Test',
            segments: [
              {
                points: [],
              },
            ],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<trkseg>');
      expect(xml).toContain('</trkseg>');
    });

    it('should handle track without optional fields', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            segments: [
              {
                points: [{ lat: 53.0, lng: 10.0 }],
              },
            ],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<trk>');
      expect(xml).not.toContain('<name>');
      expect(xml).not.toContain('<type>');
      expect(xml).not.toContain('<cmt>');
    });

    it('should handle point without optional fields', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            segments: [
              {
                points: [{ lat: 53.0, lng: 10.0 }],
              },
            ],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('<trkpt lat="53" lon="10">');
      expect(xml).not.toContain('<ele>');
      expect(xml).not.toContain('<time>');
    });
  });

  describe('serializeGPX coordinate precision', () => {
    it('should preserve high precision coordinates', () => {
      const gpx: GPXFile = {
        tracks: [
          {
            segments: [
              {
                points: [
                  { lat: 53.330329123, lng: 10.138136456, ele: 30.040923789 },
                ],
              },
            ],
          },
        ],
      };
      const xml = serializeGPX(gpx);
      expect(xml).toContain('lat="53.330329123"');
      expect(xml).toContain('lon="10.138136456"');
      expect(xml).toContain('<ele>30.040923789</ele>');
    });
  });
});
