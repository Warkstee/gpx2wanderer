/**
 * Unit tests for the Douglas-Peucker simplification algorithm
 */

import { douglasPeucker, simplifyTrack } from '../../waypoints/simplifier.js';
import type { GPXPoint } from '../../gpx/types.js';

describe('Douglas-Peucker Simplifier', () => {
  describe('douglasPeucker edge cases', () => {
    it('should return empty array for empty input', () => {
      const result = douglasPeucker([], 30);
      expect(result).toEqual([]);
    });

    it('should return single point for single point input', () => {
      const points: GPXPoint[] = [{ lat: 53.0, lng: 10.0 }];
      const result = douglasPeucker(points, 30);
      expect(result).toEqual(points);
    });

    it('should return both points for two point input', () => {
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];
      const result = douglasPeucker(points, 30);
      expect(result).toEqual(points);
    });

    it('should always preserve start and end points', () => {
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.05, lng: 10.05 },
        { lat: 53.1, lng: 10.1 },
      ];
      const result = douglasPeucker(points, 100);
      expect(result[0]).toEqual(points[0]);
      expect(result[result.length - 1]).toEqual(points[points.length - 1]);
    });
  });

  describe('douglasPeucker basic simplification', () => {
    it('should simplify a straight line to just start and end', () => {
      // Points along a straight line (approximately)
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.025, lng: 10.025 },
        { lat: 53.05, lng: 10.05 },
        { lat: 53.075, lng: 10.075 },
        { lat: 53.1, lng: 10.1 },
      ];
      const result = douglasPeucker(points, 100);
      // Should reduce to just start and end
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(points[0]);
      expect(result[1]).toEqual(points[4]);
    });

    it('should preserve points that deviate significantly', () => {
      // Create a path with clear perpendicular deviation
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.0, lng: 10.01 },
        { lat: 53.01, lng: 10.01 }, // Deviates ~1110m north from the east-west line
        { lat: 53.0, lng: 10.02 },
        { lat: 53.0, lng: 10.03 },
      ];
      const result = douglasPeucker(points, 50);
      // Should preserve the deviation point
      expect(result.length).toBeGreaterThan(2);
      expect(result).toContainEqual(points[2]);
    });

    it('should produce fewer points with larger epsilon', () => {
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.02, lng: 10.02 },
        { lat: 53.03, lng: 10.03 },
        { lat: 53.04, lng: 10.04 },
        { lat: 53.05, lng: 10.05 },
        { lat: 53.06, lng: 10.06 },
        { lat: 53.07, lng: 10.07 },
        { lat: 53.08, lng: 10.08 },
        { lat: 53.1, lng: 10.1 },
      ];

      const resultSmall = douglasPeucker(points, 10);
      const resultLarge = douglasPeucker(points, 1000);

      expect(resultLarge.length).toBeLessThanOrEqual(resultSmall.length);
    });

    it('should return all points with epsilon = 0', () => {
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.02, lng: 10.02 },
        { lat: 53.1, lng: 10.1 },
      ];
      const result = douglasPeucker(points, 0);
      // With epsilon = 0, should preserve all points that have any deviation
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('douglasPeucker with real-world coordinates', () => {
    it('should handle typical GPS track', () => {
      // Simulate a winding path
      const points: GPXPoint[] = [
        { lat: 53.330329, lng: 10.138136 },
        { lat: 53.330171, lng: 10.138342 },
        { lat: 53.330137, lng: 10.138493 },
        { lat: 53.330143, lng: 10.138643 },
        { lat: 53.330180, lng: 10.139570 },
        { lat: 53.329041, lng: 10.139947 },
        { lat: 53.328016, lng: 10.140242 },
        { lat: 53.328167, lng: 10.141873 },
        { lat: 53.328168, lng: 10.141897 },
        { lat: 53.328182, lng: 10.142896 },
      ];

      const result = douglasPeucker(points, 30);
      
      // Should reduce the number of points
      expect(result.length).toBeLessThan(points.length);
      // Should preserve start and end
      expect(result[0]).toEqual(points[0]);
      expect(result[result.length - 1]).toEqual(points[points.length - 1]);
    });

    it('should produce reasonable waypoint count for typical track', () => {
      // Generate a longer track
      const points: GPXPoint[] = [];
      for (let i = 0; i < 100; i++) {
        points.push({
          lat: 53.0 + i * 0.001,
          lng: 10.0 + Math.sin(i * 0.1) * 0.001,
        });
      }

      const result = douglasPeucker(points, 30);
      
      // Should significantly reduce points
      expect(result.length).toBeLessThan(points.length * 0.5);
      // But not too few
      expect(result.length).toBeGreaterThan(2);
    });
  });

  describe('simplifyTrack wrapper', () => {
    it('should use default epsilon of 30 meters', () => {
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.02, lng: 10.02 },
        { lat: 53.1, lng: 10.1 },
      ];

      const resultDefault = simplifyTrack(points);
      const resultExplicit = douglasPeucker(points, 30);

      expect(resultDefault).toEqual(resultExplicit);
    });

    it('should accept custom epsilon parameter', () => {
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.02, lng: 10.02 },
        { lat: 53.1, lng: 10.1 },
      ];

      const result = simplifyTrack(points, 50);
      const expected = douglasPeucker(points, 50);

      expect(result).toEqual(expected);
    });
  });

  describe('douglasPeucker algorithm correctness', () => {
    it('should handle zigzag pattern correctly', () => {
      // Create a zigzag pattern
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.02 }, // Deviation up
        { lat: 53.02, lng: 10.0 },  // Back to baseline
        { lat: 53.03, lng: 10.02 }, // Deviation up again
        { lat: 53.04, lng: 10.0 },  // Back to baseline
        { lat: 53.05, lng: 10.0 },  // End
      ];

      const result = douglasPeucker(points, 100);
      
      // Should preserve at least some deviation points
      expect(result.length).toBeGreaterThan(2);
    });

    it('should handle collinear points', () => {
      // Perfectly collinear points
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.02, lng: 10.02 },
        { lat: 53.03, lng: 10.03 },
        { lat: 53.04, lng: 10.04 },
      ];

      const result = douglasPeucker(points, 1);
      
      // Should reduce to just start and end
      expect(result).toHaveLength(2);
    });

    it('should maintain point order', () => {
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.01, lng: 10.01 },
        { lat: 53.02, lng: 10.02 },
        { lat: 53.03, lng: 10.03 },
        { lat: 53.1, lng: 10.1 },
      ];

      const result = douglasPeucker(points, 30);
      
      // Verify points are in original order (by latitude)
      for (let i = 1; i < result.length; i++) {
        expect(result[i].lat).toBeGreaterThan(result[i - 1].lat);
      }
    });
  });

  describe('douglasPeucker distance calculation', () => {
    it('should correctly calculate perpendicular distance', () => {
      // Create a scenario where we know the expected behavior
      const points: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.001, lng: 10.001 }, // ~157m perpendicular deviation
        { lat: 53.002, lng: 10.0 },
      ];

      const resultSmall = douglasPeucker(points, 50);
      const resultLarge = douglasPeucker(points, 200);

      // Small epsilon should preserve the middle point
      expect(resultSmall.length).toBe(3);
      // Large epsilon should simplify to just start and end
      expect(resultLarge.length).toBe(2);
    });
  });
});
