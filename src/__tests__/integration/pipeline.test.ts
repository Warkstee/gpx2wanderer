/**
 * Integration test for the end-to-end GPX processing pipeline
 * 
 * Tests the complete flow against a REAL Valhalla instance:
 * parse → simplify → generate waypoints → build multi-segment track → serialize → write
 * 
 * Requires:
 * - Valhalla instance running at the configured URL (from ~/.gpx2wanderer/.env)
 * - Test GPX file at src/__tests__/__data__/Wanderer-Test-Track-01.gpx
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { parseGPX } from '../../gpx/parser.js';
import { generateWaypoints } from '../../waypoints/generator.js';
import { ValhallaClient } from '../../waypoints/valhalla.js';
import { buildMultiSegmentTrack } from '../../waypoints/segment-builder.js';
import { serializeGPX } from '../../gpx/serializer.js';
import { loadValhallaConfig } from '../../wanderer/credentials.js';
import type { GPXFile, GPXTrack, GPXPoint } from '../../gpx/types.js';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test data path
const testGpxPath = resolve(__dirname, '../__data__/Wanderer-Test-Track-01.gpx');

/**
 * Helper: Run the full pipeline on a GPX file and return the output
 */
async function runPipeline(
  gpxContent: string,
  valhallaUrl: string,
  options: {
    epsilon?: number;
    tolerance?: number;
    maxIterations?: number;
    costing?: string;
  } = {}
) {
  const {
    epsilon = 30,
    tolerance = 50,
    maxIterations = 10,
    costing = 'bike',
  } = options;

  // Parse
  const gpxData = parseGPX(gpxContent);
  
  if (!gpxData.tracks || gpxData.tracks.length === 0) {
    throw new Error('No tracks found in GPX file');
  }
  
  const track = gpxData.tracks[0];
  
  // Extract all points
  const allPoints: GPXPoint[] = [];
  for (const segment of track.segments) {
    allPoints.push(...segment.points);
  }
  
  if (allPoints.length < 2) {
    throw new Error(`Track has only ${allPoints.length} point(s). At least 2 required.`);
  }
  
  // Generate waypoints
  const valhalla = new ValhallaClient(valhallaUrl);
  const result = await generateWaypoints(allPoints, valhalla, {
    epsilon,
    tolerance,
    maxIterations,
    costing,
  });
  
  // Build multi-segment track
  const segments = buildMultiSegmentTrack(result.waypoints, allPoints);
  
  // Serialize
  const outputGpx: GPXFile = {
    version: gpxData.version || '1.1',
    creator: 'gpx2wanderer',
    metadata: {
      name: gpxData.metadata?.name || track.name,
      desc: gpxData.metadata?.desc,
      time: gpxData.metadata?.time,
    },
    tracks: [{
      name: track.name,
      type: track.type,
      comment: track.comment,
      description: track.description,
      time: track.time,
      segments,
    }],
  };
  
  const gpxXml = serializeGPX(outputGpx);
  
  return {
    gpxData,
    track,
    allPoints,
    result,
    segments,
    gpxXml,
  };
}

describe('End-to-End Pipeline Integration (Real Valhalla)', () => {
  let valhallaUrl: string;
  let gpxContent: string;

  beforeAll(() => {
    // Load Valhalla URL from encrypted credentials
    const config = loadValhallaConfig();
    if (!config) {
      throw new Error(
        'Valhalla not configured. Run: node dist/index.js config valhalla <url>\n' +
        'This test requires a real Valhalla instance.'
      );
    }
    valhallaUrl = config.url;
    
    // Read test GPX file
    gpxContent = readFileSync(testGpxPath, 'utf-8');
  });

  it('should process a real GPX file through the complete pipeline', async () => {
    const { gpxData, track, allPoints, result, segments, gpxXml } = 
      await runPipeline(gpxContent, valhallaUrl);
    
    // Verify parsing
    expect(gpxData.tracks.length).toBeGreaterThan(0);
    expect(track.name).toBe('Wanderer-Test-Track');
    expect(allPoints.length).toBe(244);
    
    // Verify waypoint generation
    expect(result.waypoints.length).toBeGreaterThan(0);
    expect(result.iterations).toBeGreaterThan(0);
    expect(typeof result.maxDivergence).toBe('number');
    
    // Verify multi-segment track
    expect(segments.length).toBeGreaterThan(0);
    for (const segment of segments) {
      expect(segment.points.length).toBeGreaterThan(0);
    }
    
    // Verify serialization
    expect(gpxXml).toContain('<?xml version="1.0"');
    expect(gpxXml).toContain('<gpx');
    expect(gpxXml).toContain('</gpx>');
    expect(gpxXml).toContain('<trk>');
    expect(gpxXml).toContain('</trk>');
    
    // Count segments in XML
    const segmentMatches = gpxXml.match(/<trkseg>/g);
    expect(segmentMatches).toBeDefined();
    expect(segmentMatches!.length).toBe(segments.length);
  }, 30000); // 30 second timeout for real Valhalla calls

  it('should converge within tolerance for the test track', async () => {
    const { result } = await runPipeline(gpxContent, valhallaUrl, {
      epsilon: 30,
      tolerance: 50,
      maxIterations: 10,
      costing: 'bike',
    });
    
    // The test track should converge with reasonable parameters
    expect(result.converged).toBe(true);
    expect(result.maxDivergence).toBeLessThanOrEqual(50);
  }, 30000);

  it('should produce fewer waypoints than original points', async () => {
    const { allPoints, result } = await runPipeline(gpxContent, valhallaUrl);
    
    // Waypoints should be a simplification of the original track
    expect(result.waypoints.length).toBeLessThan(allPoints.length);
    expect(result.waypoints.length).toBeGreaterThan(1);
  }, 30000);

  it('should preserve track metadata through the pipeline', async () => {
    const { gpxData, track, gpxXml } = await runPipeline(gpxContent, valhallaUrl);
    
    expect(track.name).toBe('Wanderer-Test-Track');
    expect(track.type).toBe('mtb_easy');
    
    // Verify metadata is preserved in output
    expect(gpxXml).toContain('<name>Wanderer-Test-Track</name>');
    expect(gpxXml).toContain('<type>mtb_easy</type>');
  }, 30000);

  it('should write a valid GPX file to disk', async () => {
    const { gpxXml } = await runPipeline(gpxContent, valhallaUrl);
    
    // Write to temp file
    const outputPath = join(tmpdir(), 'gpx2wanderer-test-output.gpx');
    
    try {
      writeFileSync(outputPath, gpxXml, 'utf-8');
      
      // Verify file exists and is readable
      expect(existsSync(outputPath)).toBe(true);
      
      const writtenContent = readFileSync(outputPath, 'utf-8');
      expect(writtenContent).toBe(gpxXml);
      
      // Verify it's valid XML (basic check)
      expect(writtenContent).toContain('<?xml version="1.0"');
      expect(writtenContent).toContain('</gpx>');
    } finally {
      // Cleanup
      if (existsSync(outputPath)) {
        unlinkSync(outputPath);
      }
    }
  }, 30000);

  it('should handle different costing models', async () => {
    // Test with bike costing
    const bikeResult = await runPipeline(gpxContent, valhallaUrl, {
      costing: 'bike',
      maxIterations: 5,
    });
    
    expect(bikeResult.result.waypoints.length).toBeGreaterThan(0);
    
    // Test with hike costing
    const hikeResult = await runPipeline(gpxContent, valhallaUrl, {
      costing: 'hike',
      maxIterations: 5,
    });
    
    expect(hikeResult.result.waypoints.length).toBeGreaterThan(0);
    
    // Results may differ between costing models
    // (not asserting they're different, just that both work)
  }, 60000); // 60 second timeout for two Valhalla calls
});

describe('Edge cases (no Valhalla required)', () => {
  it('should handle empty tracks', () => {
    const emptyGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Empty Track</name>
    <trkseg>
    </trkseg>
  </trk>
</gpx>`;
    
    const gpxData = parseGPX(emptyGpx);
    expect(gpxData.tracks.length).toBe(1);
    
    const allPoints: GPXPoint[] = [];
    for (const segment of gpxData.tracks[0].segments) {
      allPoints.push(...segment.points);
    }
    
    expect(allPoints.length).toBe(0);
    
    // buildMultiSegmentTrack should handle empty input
    const segments = buildMultiSegmentTrack([], allPoints);
    expect(segments.length).toBe(1);
    expect(segments[0].points.length).toBe(0);
  });

  it('should handle single-point tracks', () => {
    const singlePointGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Single Point</name>
    <trkseg>
      <trkpt lat="53.0" lon="10.0">
        <ele>10</ele>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;
    
    const gpxData = parseGPX(singlePointGpx);
    const allPoints: GPXPoint[] = [];
    for (const segment of gpxData.tracks[0].segments) {
      allPoints.push(...segment.points);
    }
    
    expect(allPoints.length).toBe(1);
    
    const segments = buildMultiSegmentTrack([], allPoints);
    expect(segments.length).toBe(1);
    expect(segments[0].points.length).toBe(1);
  });

  it('should reject GPX files with no tracks', () => {
    const noTrackGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <metadata>
    <name>No Track</name>
  </metadata>
</gpx>`;
    
    const gpxData = parseGPX(noTrackGpx);
    expect(gpxData.tracks.length).toBe(0);
  });
});
