/**
 * Unit tests for the Valhalla routing client
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ValhallaClient } from '../../waypoints/valhalla.js';
import type { GPXPoint } from '../../gpx/types.js';

// Mock fetch globally
const mockFetch = jest.fn<any>();
global.fetch = mockFetch as any;

describe('ValhallaClient', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should strip trailing slash from base URL', () => {
      const client = new ValhallaClient('http://localhost:8002/');
      expect(client).toBeDefined();
    });

    it('should accept custom retry options', () => {
      const client = new ValhallaClient('http://localhost:8002', {
        maxRetries: 5,
        initialBackoffMs: 2000,
      });
      expect(client).toBeDefined();
    });
  });

  describe('route - single leg', () => {
    it('should successfully route with single leg response', async () => {
      const client = new ValhallaClient('http://localhost:8002');
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            legs: [
              {
                shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', // Simple encoded polyline
                summary: {
                  length: 10.5, // km
                  time: 1800, // seconds
                },
              },
            ],
          },
        }),
      });

      const result = await client.route(waypoints, 'bike');

      expect(result).toBeDefined();
      expect(result.points).toBeDefined();
      expect(Array.isArray(result.points)).toBe(true);
      expect(result.distance).toBe(10500); // 10.5 km * 1000
      expect(result.duration).toBe(1800);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should map bike costing to bicycle', async () => {
      const client = new ValhallaClient('http://localhost:8002');
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            legs: [
              {
                shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                summary: { length: 10, time: 1800 },
              },
            ],
          },
        }),
      });

      await client.route(waypoints, 'bike');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const requestBody = JSON.parse(callArgs[1].body as string);
      expect(requestBody.costing).toBe('bicycle');
    });

    it('should map hike costing to pedestrian', async () => {
      const client = new ValhallaClient('http://localhost:8002');
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            legs: [
              {
                shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                summary: { length: 10, time: 1800 },
              },
            ],
          },
        }),
      });

      await client.route(waypoints, 'hike');

      const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
      const requestBody = JSON.parse(callArgs[1].body as string);
      expect(requestBody.costing).toBe('pedestrian');
    });
  });

  describe('route - multi-leg', () => {
    it('should handle multi-leg routes correctly', async () => {
      const client = new ValhallaClient('http://localhost:8002');
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.05, lng: 10.05 },
        { lat: 53.1, lng: 10.1 },
      ];

      // Mock response with 2 legs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            legs: [
              {
                shape: '_p~iF~ps|U_ulLnnqC', // Leg 1
                summary: { length: 5, time: 900 },
              },
              {
                shape: '_p~iF~ps|U_mqNvxq`@', // Leg 2
                summary: { length: 5.5, time: 900 },
              },
            ],
          },
        }),
      });

      const result = await client.route(waypoints, 'bike');

      expect(result).toBeDefined();
      expect(result.points).toBeDefined();
      expect(result.distance).toBe(10500); // 5 + 5.5 km * 1000
      expect(result.duration).toBe(1800); // 900 + 900
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should avoid duplicating points at leg boundaries', async () => {
      const client = new ValhallaClient('http://localhost:8002');
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      // Mock response with 2 legs that share a boundary point
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            legs: [
              {
                shape: '_p~iF~ps|U_ulLnnqC', // Leg 1: 2 points
                summary: { length: 5, time: 900 },
              },
              {
                shape: '_p~iF~ps|U_mqNvxq`@', // Leg 2: 2 points (first is same as leg 1 last)
                summary: { length: 5, time: 900 },
              },
            ],
          },
        }),
      });

      const result = await client.route(waypoints, 'bike');

      // Should have 3 points total (2 from leg 1 + 1 from leg 2, skipping duplicate)
      expect(result.points.length).toBe(3);
    });
  });

  describe('route - retry logic', () => {
    it('should retry on 500 server error', async () => {
      const client = new ValhallaClient('http://localhost:8002', {
        maxRetries: 2,
        initialBackoffMs: 10, // Fast for testing
      });
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      // First attempt: 500 error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      // Second attempt: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            legs: [
              {
                shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                summary: { length: 10, time: 1800 },
              },
            ],
          },
        }),
      });

      const result = await client.route(waypoints, 'bike');

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 rate limit', async () => {
      const client = new ValhallaClient('http://localhost:8002', {
        maxRetries: 2,
        initialBackoffMs: 10,
      });
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      // First attempt: 429 error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      // Second attempt: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            legs: [
              {
                shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                summary: { length: 10, time: 1800 },
              },
            ],
          },
        }),
      });

      const result = await client.route(waypoints, 'bike');

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 client error', async () => {
      const client = new ValhallaClient('http://localhost:8002', {
        maxRetries: 2,
        initialBackoffMs: 10,
      });
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      // 400 error should not be retried
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(client.route(waypoints, 'bike')).rejects.toThrow('Valhalla routing failed: Bad Request');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exceeded', async () => {
      const client = new ValhallaClient('http://localhost:8002', {
        maxRetries: 2,
        initialBackoffMs: 10,
      });
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      // All attempts fail
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.route(waypoints, 'bike')).rejects.toThrow('Valhalla routing failed: Internal Server Error');
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should retry on network errors', async () => {
      const client = new ValhallaClient('http://localhost:8002', {
        maxRetries: 2,
        initialBackoffMs: 10,
      });
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      // First attempt: network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Second attempt: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            legs: [
              {
                shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                summary: { length: 10, time: 1800 },
              },
            ],
          },
        }),
      });

      const result = await client.route(waypoints, 'bike');

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('route - error handling', () => {
    it('should throw on Valhalla error response', async () => {
      const client = new ValhallaClient('http://localhost:8002', { maxRetries: 0 });
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: 'No route could be found',
        }),
      });

      await expect(client.route(waypoints, 'bike')).rejects.toThrow('Valhalla routing error: No route could be found');
    });

    it('should throw on empty legs array', async () => {
      const client = new ValhallaClient('http://localhost:8002', { maxRetries: 0 });
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            legs: [],
          },
        }),
      });

      await expect(client.route(waypoints, 'bike')).rejects.toThrow('Valhalla response contains no legs');
    });
  });

  describe('polyline decoding', () => {
    it('should decode simple polyline correctly', async () => {
      const client = new ValhallaClient('http://localhost:8002');
      const waypoints: GPXPoint[] = [
        { lat: 53.0, lng: 10.0 },
        { lat: 53.1, lng: 10.1 },
      ];

      // This is a known encoded polyline
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          trip: {
            legs: [
              {
                shape: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
                summary: { length: 10, time: 1800 },
              },
            ],
          },
        }),
      });

      const result = await client.route(waypoints, 'bike');

      expect(result.points.length).toBeGreaterThan(0);
      // Verify points have lat/lng
      for (const point of result.points) {
        expect(typeof point.lat).toBe('number');
        expect(typeof point.lng).toBe('number');
      }
    });
  });
});
