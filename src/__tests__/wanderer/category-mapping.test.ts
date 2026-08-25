/**
 * Unit tests for the category mapping module
 */

import { mapSportToCategory, mapSportToActivityType } from '../../wanderer/category-mapping.js';

describe('Category Mapping', () => {
  describe('mapSportToCategory', () => {
    it('should map string-format sport codes', () => {
      expect(mapSportToCategory('hike')).toEqual({ category: 'Hiking' });
      expect(mapSportToCategory('nordicwalking')).toEqual({ category: 'Walking' });
    });

    it('should map object-format sport codes with subcategory', () => {
      expect(mapSportToCategory('mtb_easy')).toEqual({ category: 'Biking', subcategory: 'Gravel' });
      expect(mapSportToCategory('racebike')).toEqual({ category: 'Biking', subcategory: 'Road' });
    });

    it('should return null for unknown sport codes', () => {
      expect(mapSportToCategory('unknown_sport')).toBeNull();
    });
  });

  describe('mapSportToActivityType', () => {
    it('should return category name for simple mappings', () => {
      expect(mapSportToActivityType('hike')).toBe('Hiking');
    });

    it('should return "Category (Subcategory)" for object mappings', () => {
      expect(mapSportToActivityType('mtb_easy')).toBe('Biking (Gravel)');
    });

    it('should return original sport code for unknown mappings', () => {
      expect(mapSportToActivityType('unknown_sport')).toBe('unknown_sport');
    });
  });
});
