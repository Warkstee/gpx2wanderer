/**
 * Unit tests for the category mapping module
 */

import { mapSportToCategory, mapSportToActivityType } from '../../wanderer/category-mapping.js';

describe('Category Mapping', () => {
  describe('mapSportToCategory', () => {
    it('should map string-format sport codes', () => {
      expect(mapSportToCategory('komoot', 'hike')).toEqual({ category: 'Hiking' });
      expect(mapSportToCategory('komoot', 'nordicwalking')).toEqual({ category: 'Walking' });
    });

    it('should map object-format sport codes with subcategory', () => {
      expect(mapSportToCategory('komoot', 'mtb_easy')).toEqual({ category: 'Biking', subcategory: 'Gravel' });
      expect(mapSportToCategory('komoot', 'racebike')).toEqual({ category: 'Biking', subcategory: 'Road' });
    });

    it('should return null for unknown sport codes', () => {
      expect(mapSportToCategory('komoot', 'unknown_sport')).toBeNull();
    });

    it('should map Strava numeric sport codes', () => {
      expect(mapSportToCategory('strava', '1')).toEqual({ category: 'Biking', subcategory: 'Road' });
      expect(mapSportToCategory('strava', '2')).toEqual({ category: 'Running', subcategory: 'Road' });
      expect(mapSportToCategory('strava', '3')).toEqual({ category: 'Hiking' });
      expect(mapSportToCategory('strava', '4')).toEqual({ category: 'Walking' });
      expect(mapSportToCategory('strava', '6')).toEqual({ category: 'Biking', subcategory: 'Gravel' });
    });
  });

  describe('mapSportToActivityType', () => {
    it('should return category name for simple mappings', () => {
      expect(mapSportToActivityType('komoot', 'hike')).toBe('Hiking');
    });

    it('should return "Category (Subcategory)" for object mappings', () => {
      expect(mapSportToActivityType('komoot', 'mtb_easy')).toBe('Biking (Gravel)');
    });

    it('should return original sport code for unknown mappings', () => {
      expect(mapSportToActivityType('komoot', 'unknown_sport')).toBe('unknown_sport');
    });

    it('should map Strava numeric codes to activity types', () => {
      expect(mapSportToActivityType('strava', '1')).toBe('Biking (Road)');
      expect(mapSportToActivityType('strava', '3')).toBe('Hiking');
    });
  });
});
