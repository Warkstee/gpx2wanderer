/**
 * Unit tests for the output writer module
 */

import { generateOutputFilename, writeGpxFile } from '../../output/writer.js';
import { existsSync, unlinkSync, mkdirSync, rmdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Output Writer', () => {
  describe('generateOutputFilename', () => {
    it('should handle simple tour names', () => {
      expect(generateOutputFilename('Morning Ride')).toBe('Morning_Ride.gpx');
    });

    it('should replace invalid filename characters', () => {
      // 'Tour: <special>' → 'Tour__special_' → 'Tour_special_' → 'Tour_special' (trailing _ trimmed)
      expect(generateOutputFilename('Tour: <special>')).toBe('Tour_special.gpx');
    });

    it('should collapse multiple underscores', () => {
      expect(generateOutputFilename('Tour   with    spaces')).toBe('Tour_with_spaces.gpx');
    });

    it('should trim leading and trailing underscores', () => {
      expect(generateOutputFilename('  Tour  ')).toBe('Tour.gpx');
    });

    it('should handle empty strings', () => {
      expect(generateOutputFilename('')).toBe('.gpx');
    });

    it('should handle names with only invalid characters', () => {
      expect(generateOutputFilename(':::')).toBe('.gpx');
    });
  });

  describe('writeGpxFile', () => {
    const testDir = join(tmpdir(), 'gpx2wanderer-test');
    const testFile = join(testDir, 'test.gpx');

    beforeAll(() => {
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true });
      }
    });

    afterAll(() => {
      if (existsSync(testFile)) {
        unlinkSync(testFile);
      }
      if (existsSync(testDir)) {
        rmdirSync(testDir);
      }
    });

    it('should write content to file', () => {
      const content = '<?xml version="1.0"?><gpx></gpx>';
      writeGpxFile(content, testFile);
      expect(existsSync(testFile)).toBe(true);
    });

    it('should throw error for invalid path', () => {
      expect(() => {
        writeGpxFile('content', '/nonexistent/path/file.gpx');
      }).toThrow('Failed to write GPX file');
    });
  });
});
