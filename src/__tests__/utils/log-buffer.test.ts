/**
 * Tests for log buffer functionality
 */

import { addEntry, getEntries, clear } from '../../utils/log-buffer.js';

describe('Log Buffer', () => {
  beforeEach(() => {
    clear();
  });

  describe('addEntry', () => {
    it('should add entries to the buffer', () => {
      addEntry({ timestamp: '2026-09-03T10:00:00.000Z', level: 'info', message: 'Test message' });
      
      const entries = getEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual({
        timestamp: '2026-09-03T10:00:00.000Z',
        level: 'info',
        message: 'Test message'
      });
    });

    it('should handle multiple entries', () => {
      addEntry({ timestamp: '2026-09-03T10:00:00.000Z', level: 'info', message: 'First' });
      addEntry({ timestamp: '2026-09-03T10:00:01.000Z', level: 'warn', message: 'Second' });
      addEntry({ timestamp: '2026-09-03T10:00:02.000Z', level: 'error', message: 'Third' });
      
      const entries = getEntries();
      expect(entries).toHaveLength(3);
      // Should be in reverse order (newest first)
      expect(entries[0].message).toBe('Third');
      expect(entries[1].message).toBe('Second');
      expect(entries[2].message).toBe('First');
    });
  });

  describe('getEntries', () => {
    it('should return entries in reverse chronological order', () => {
      addEntry({ timestamp: '2026-09-03T10:00:00.000Z', level: 'info', message: 'First' });
      addEntry({ timestamp: '2026-09-03T10:00:01.000Z', level: 'info', message: 'Second' });
      addEntry({ timestamp: '2026-09-03T10:00:02.000Z', level: 'info', message: 'Third' });
      
      const entries = getEntries();
      expect(entries[0].message).toBe('Third');
      expect(entries[1].message).toBe('Second');
      expect(entries[2].message).toBe('First');
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        addEntry({ timestamp: `2026-09-03T10:00:${i.toString().padStart(2, '0')}.000Z`, level: 'info', message: `Message ${i}` });
      }
      
      const entries = getEntries(5);
      expect(entries).toHaveLength(5);
      expect(entries[0].message).toBe('Message 9');
    });

    it('should filter by level', () => {
      addEntry({ timestamp: '2026-09-03T10:00:00.000Z', level: 'info', message: 'Info message' });
      addEntry({ timestamp: '2026-09-03T10:00:01.000Z', level: 'error', message: 'Error message' });
      addEntry({ timestamp: '2026-09-03T10:00:02.000Z', level: 'info', message: 'Another info' });
      
      const entries = getEntries(100, 'info');
      expect(entries).toHaveLength(2);
      expect(entries[0].level).toBe('info');
      expect(entries[1].level).toBe('info');
    });

    it('should handle empty buffer', () => {
      const entries = getEntries();
      expect(entries).toHaveLength(0);
    });

    it('should clamp limit to valid range', () => {
      for (let i = 0; i < 10; i++) {
        addEntry({ timestamp: `2026-09-03T10:00:${i.toString().padStart(2, '0')}.000Z`, level: 'info', message: `Message ${i}` });
      }
      
      // Limit too small
      const entries1 = getEntries(0);
      expect(entries1).toHaveLength(1);
      
      // Limit too large
      const entries2 = getEntries(1000);
      expect(entries2).toHaveLength(10);
    });
  });

  describe('ring buffer behavior', () => {
    it('should overwrite oldest entries when buffer is full', () => {
      // Add 501 entries (buffer size is 500)
      for (let i = 0; i < 501; i++) {
        addEntry({ timestamp: `2026-09-03T10:00:${(i % 60).toString().padStart(2, '0')}.000Z`, level: 'info', message: `Message ${i}` });
      }
      
      const entries = getEntries(500);
      expect(entries).toHaveLength(500);
      // Most recent should be message 500
      expect(entries[0].message).toBe('Message 500');
      // Oldest should be message 1 (message 0 was overwritten)
      expect(entries[499].message).toBe('Message 1');
    });

    it('should maintain correct order after wrapping', () => {
      // Add 600 entries to force wrapping
      for (let i = 0; i < 600; i++) {
        addEntry({ timestamp: `2026-09-03T10:00:${(i % 60).toString().padStart(2, '0')}.000Z`, level: 'info', message: `Message ${i}` });
      }
      
      const entries = getEntries(10);
      // Should get the 10 most recent in reverse order
      expect(entries[0].message).toBe('Message 599');
      expect(entries[9].message).toBe('Message 590');
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      addEntry({ timestamp: '2026-09-03T10:00:00.000Z', level: 'info', message: 'Test' });
      addEntry({ timestamp: '2026-09-03T10:00:01.000Z', level: 'info', message: 'Test 2' });
      
      clear();
      
      const entries = getEntries();
      expect(entries).toHaveLength(0);
    });
  });
});
