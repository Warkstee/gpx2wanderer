/**
 * Unit tests for the route comparison engine
 */

import { describe, it, expect } from '@jest/globals';
import {
  haversineDistance,
  pointToSegmentDistance,
  findMaxDivergence,
} from '../../waypoints/comparison.js';
import type { GPXPoint } from '../../gpx/types.js';

describe('Route Comparison Engine', () => {
  describe('haversineDistance', () => {
    it('should return 0 for identical points', () => {
      const p: GPXPoint = { lat: 53.0, lng: 10.0 };
      expect(haversineDistance(p, p)).toBe(0);
    });

    it('should calculate distance between two points', () => {
      // Hamburg to Berlin is approximately 255 km
      const hamburg: GPXPoint = { lat: 53.5753, lng: 10.0153 };
      const berlin: GPXPoint = { lat: 52.52, lng: 13.405 };
      const distance = haversineDistance(hamburg, berlin);
      expect(distance).toBeGreaterThan(250000); // > 250 km
      expect(distance).toBeLessThan(260000); // < 260 km
    });

    it('should be symmetric', () => {
      const p1: GPXPoint = { lat: 53.0, lng: 10.0 };
      const p2: GPXPoint = { lat: 53.1, lng: 10.1 };
      expect(haversineDistance(p1, p2)).toBe(haversineDistance(p2, p1));
    });
  });

  describe('pointToSegmentDistance', () => {
    it('should return 0 for point on segment', () => {
      const start: GPXPoint = { lat: 53.0, lng: 10.0 };
      const end: GPXPoint = { lat: 53.1, lng: 10.1 };
      const mid: GPXPoint = { lat: 53.05, lng: 10.05 };
      const distance = pointToSegmentDistance(mid, start, end);
      expect(distance).toBeLessThan(1); // Within 1 meter
    });

    it('should calculate perpendicular distance', () => {
      const start: GPXPoint = { lat: 53.0, lng: 10.0 };
      const end: GPXPoint = { lat: 53.0, lng: 10.1 }; // Horizontal line
      const point: GPXPoint = { lat: 53.01, lng: 10.05 }; // 100m north
      const distance = pointToSegmentDistance(point, start, end);
      expect(distance).toBeGreaterThan(1000); // > 1 km
      expect(distance).toBeLessThan(1200); // < 1.2 km
    });

    it('should handle point beyond segment end', () => {
      const start: GPXPoint = { lat: 53.0, lng: 10.0 };
      const end: GPXPoint = { lat: 53.0, lng: 10.1 };
      const beyond: GPXPoint = { lat: 53.0, lng: 10.2 }; // Beyond end
      const distance = pointToSegmentDistance(beyond, start, end);
      // Should be distance to end point, not perpendicular
      const expectedDist = haversineDistance(beyond, end);
      expect(Math.abs(distance - expectedDist)).toBeLessThan(10); // Within 10m
    });

    it('should handle point before segment start', () => {
      const start: GPXPoint = { lat: 53.0, lng: 10.0 };
      const end: GPXPoint = { lat: 53.0, lng: 10.1 };
      const before: GPXPoint = { lat: 53.0, lng: 9.9 }; // Before start
      const distance = pointToSegmentDistance(before, start, end);
      // Should be distance to start point
      const expectedDist = haversineDistance(before, start);
      expect(Math.abs(distance - expectedDist)).toBeLessThan(10); // Within 10m
    });

    it('should handle zero-length segment', () => {
      const point: GPXPoint = { lat: 53.0, lng: 10.0 };
      const startEnd: GPXPoint = { lat: 53.1, lng: 10.1 };
      const distance = pointToSegmentDistance(point, startEnd, startEnd);
      const expectedDist = haversineDistance(point, startEnd);
      // pointToSegmentDistance uses flat-earth approximation, haversine uses
      // spherical formula — allow up to 1% difference for long distances
      expect(Math.abs(distance - expectedDist)).toBeLessThan(expectedDist * 0.01);
    });
  });

  describe('findMaxDivergence', () => {
    it('should return zero divergence for identical tracks', () => {
      const track: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.02, lng: 10.02 },
      ];
      const result = findMaxDivergence(track, track);
      expect(result.maxDistance).toBe(0);
      expect(result.divergenceProfile).toHaveLength(3);
      expect(result.divergenceProfile.every((d) => d === 0)).toBe(true);
    });

    it('should detect constant divergence for parallel tracks', () => {
      const track1: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.02, lng: 10.02 },
      ];
      // Offset by ~0.001 degrees lat (~111m)
      const track2: GPXPoint[] = track1.map((p) => ({
        lat: p.lat + 0.001,
        lng: p.lng,
      }));
      const result = findMaxDivergence(track1, track2);
      expect(result.maxDistance).toBeGreaterThan(100); // > 100m
      expect(result.maxDistance).toBeLessThan(120); // < 120m
    });

    it('should find maximum divergence at the point furthest from reference', () => {
      const original: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.05, lng: 10.05 }, // This point is far from reference
        { lat: 53.02, lng: 10.02 },
      ];
      const reference: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.02, lng: 10.02 },
      ];
      const result = findMaxDivergence(original, reference);
      expect(result.maxIndex).toBe(2); // Third point should have max divergence
      expect(result.maxPoint).toEqual(original[2]);
    });

    it('should handle empty original track', () => {
      const result = findMaxDivergence([], [{ lat: 53.0, lng: 10.0 }]);
      expect(result.maxDistance).toBe(0);
      expect(result.divergenceProfile).toHaveLength(0);
    });

    it('should handle single-point tracks', () => {
      const p1: GPXPoint = { lat: 53.0, lng: 10.0 };
      const p2: GPXPoint = { lat: 53.1, lng: 10.1 };
      const result = findMaxDivergence([p1], [p2]);
      expect(result.maxDistance).toBeGreaterThan(0);
      expect(result.maxIndex).toBe(0);
    });

    it('should use segment-based comparison for accuracy', () => {
      // Create a scenario where point-to-point would fail but segment-based works
      const original: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.005, lng: 10.005 }, // Midpoint, offset from reference segment
        { lat: 53.01, lng: 10.01 },
      ];
      const reference: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 }, // Direct segment, no intermediate point
      ];
      const result = findMaxDivergence(original, reference);
      // The midpoint should have some divergence from the direct segment
      expect(result.maxDistance).toBeGreaterThan(0);
      expect(result.divergenceProfile[1]).toBeGreaterThan(0);
    });

    it('should return divergence profile for all points', () => {
      const original: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.02, lng: 10.02 },
        { lat: 53.03, lng: 10.03 },
      ];
      const reference: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.03, lng: 10.03 },
      ];
      const result = findMaxDivergence(original, reference);
      expect(result.divergenceProfile).toHaveLength(4);
      // First and last points should have low divergence (they're in reference)
      expect(result.divergenceProfile[0]).toBeLessThan(10);
      expect(result.divergenceProfile[3]).toBeLessThan(10);
      // Middle points should have higher divergence
      expect(result.divergenceProfile[1]).toBeGreaterThan(0);
      expect(result.divergenceProfile[2]).toBeGreaterThan(0);
    });

    it('should handle zigzag pattern', () => {
      const zigzag: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.02 }, // Peak 1
        { lat: 53.02, lng: 10.0 },
        { lat: 53.03, lng: 10.02 }, // Peak 2
        { lat: 53.04, lng: 10.0 },
      ];
      const straight: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.04, lng: 10.0 },
      ];
      const result = findMaxDivergence(zigzag, straight);
      // Should detect divergence at the peaks
      expect(result.maxDistance).toBeGreaterThan(0);
      expect(result.divergenceProfile[1]).toBeGreaterThan(0);
      expect(result.divergenceProfile[3]).toBeGreaterThan(0);
    });

    it('should be asymmetric (original vs reference matters)', () => {
      const track1: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
      ];
      const track2: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.005, lng: 10.005 },
        { lat: 53.01, lng: 10.01 },
      ];
      const result1 = findMaxDivergence(track1, track2);
      const result2 = findMaxDivergence(track2, track1);
      // Results should differ because we're measuring different things
      // track1 vs track2: how far are track1 points from track2?
      // track2 vs track1: how far are track2 points from track1?
      expect(result1.maxDistance).not.toBe(result2.maxDistance);
    });
  });
});
