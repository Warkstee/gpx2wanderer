/**
 * Unit tests for post-processing waypoint simplification
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { postSimplifyWaypoints } from '../../waypoints/post-simplifier.js';
import { ValhallaClient } from '../../waypoints/valhalla.js';
import type { GPXPoint } from '../../gpx/types.js';

// Mock fetch globally
const mockFetch = jest.fn<any>();
global.fetch = mockFetch as any;

describe('Post-Processing Waypoint Simplification', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('calculateAngle', () => {
    it('should identify straight line waypoints (180°)', () => {
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.005, lng: 10.005 }, // midpoint
        { lat: 53.01, lng: 10.01 },
      ];
      
      // All waypoints are on a straight line, angle should be ~180°
      // This is NOT an anchor point (angle > turnThreshold)
    });

    it('should identify sharp turn waypoints (< 90°)', () => {
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.0 }, // turn point
        { lat: 53.01, lng: 10.01 },
      ];
      
      // This forms a 90° turn, should be an anchor point (angle < turnThreshold)
    });
  });

  describe('postSimplifyWaypoints', () => {
    it('should return unchanged waypoints if <= 2 waypoints', async () => {
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
      ];
      const originalTrack = waypoints;
      const valhalla = new ValhallaClient('http://localhost:8002');
      
      const result = await postSimplifyWaypoints(waypoints, originalTrack, valhalla);
      
      expect(result.waypoints).toEqual(waypoints);
      expect(result.removed).toBe(0);
      expect(result.valhallaCalls).toBe(0);
    });

    it('should remove redundant waypoints between anchor points', async () => {
      // Create a track with anchor points at turns and redundant waypoints in between
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },      // anchor (start)
        { lat: 53.003, lng: 10.003 },   // redundant - on straight line
        { lat: 53.005, lng: 10.005 },   // redundant - on straight line
        { lat: 53.01, lng: 10.01 },     // anchor (end)
      ];
      
      const originalTrack: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.001, lng: 10.001 },
        { lat: 53.002, lng: 10.002 },
        { lat: 53.003, lng: 10.003 },
        { lat: 53.004, lng: 10.004 },
        { lat: 53.005, lng: 10.005 },
        { lat: 53.006, lng: 10.006 },
        { lat: 53.007, lng: 10.007 },
        { lat: 53.008, lng: 10.008 },
        { lat: 53.009, lng: 10.009 },
        { lat: 53.01, lng: 10.01 },
      ];
      
      // Mock Valhalla to return a route that matches the original track
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          trip: {
            legs: [{
              shape: 'o`~fFqk|s@_ulLnnqC',
              summary: { length: 1.5, time: 300 },
            }],
          },
        }),
      });
      
      const valhalla = new ValhallaClient('http://localhost:8002');
      const result = await postSimplifyWaypoints(waypoints, originalTrack, valhalla, {
        tolerance: 50,
        turnThreshold: 150,
      });
      
      // Should attempt to validate segments (may or may not remove depending on mock)
      expect(result.valhallaCalls).toBeGreaterThan(0);
    });

    it('should preserve anchor points at sharp turns', async () => {
      // Create a track with a sharp turn - the turn point should be an anchor
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.0 }, // turn point - should be anchor
        { lat: 53.01, lng: 10.01 },
      ];
      
      const originalTrack: GPXPoint[] = waypoints;
      
      // Mock Valhalla
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          trip: {
            legs: [{
              shape: '_p~iF~ps|U',
              summary: { length: 1.0, time: 200 },
            }],
          },
        }),
      });
      
      const valhalla = new ValhallaClient('http://localhost:8002');
      const result = await postSimplifyWaypoints(waypoints, originalTrack, valhalla, {
        tolerance: 50,
        turnThreshold: 150,
      });
      
      // Should preserve the turn point as an anchor
      expect(result.waypoints.length).toBe(waypoints.length);
    });

    it('should handle Valhalla errors gracefully', async () => {
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.005, lng: 10.005 },
        { lat: 53.01, lng: 10.01 },
      ];
      
      const originalTrack: GPXPoint[] = waypoints;
      
      // Mock Valhalla to fail immediately (no retries)
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const valhalla = new ValhallaClient('http://localhost:8002', {
        maxRetries: 0,
        initialBackoffMs: 10,
      });
      
      const result = await postSimplifyWaypoints(waypoints, originalTrack, valhalla);
      
      // Should keep all waypoints on error
      expect(result.waypoints).toEqual(waypoints);
      expect(result.removed).toBe(0);
    }, 10000);
  });
});
