/**
 * Category mapping between providers and Wanderer
 */

export interface CategoryMapping {
  provider: string;
  providerCategory: string;
  wandererCategory: string;
}

/**
 * Default category mappings
 */
export const DEFAULT_MAPPINGS: CategoryMapping[] = [
  // Komoot categories
  { provider: 'komoot', providerCategory: 'hike', wandererCategory: 'hiking' },
  { provider: 'komoot', providerCategory: 'mtb', wandererCategory: 'mountain-biking' },
  { provider: 'komoot', providerCategory: 'mtb-easy', wandererCategory: 'mountain-biking' },
  { provider: 'komoot', providerCategory: 'mtb-advanced', wandererCategory: 'mountain-biking' },
  { provider: 'komoot', providerCategory: 'race_bike', wandererCategory: 'road-cycling' },
  { provider: 'komoot', providerCategory: 'touring_bike', wandererCategory: 'cycling-touring' },
  { provider: 'komoot', providerCategory: 'e_bike', wandererCategory: 'cycling-touring' },
  { provider: 'komoot', providerCategory: 'jog', wandererCategory: 'running' },
  { provider: 'komoot', providerCategory: 'alpine', wandererCategory: 'mountaineering' },

  // Strava categories
  { provider: 'strava', providerCategory: 'Run', wandererCategory: 'running' },
  { provider: 'strava', providerCategory: 'Ride', wandererCategory: 'road-cycling' },
  { provider: 'strava', providerCategory: 'Hike', wandererCategory: 'hiking' },
  { provider: 'strava', providerCategory: 'Walk', wandererCategory: 'hiking' },
  { provider: 'strava', providerCategory: 'Alpine', wandererCategory: 'mountaineering' },
  { provider: 'strava', providerCategory: 'BackcountrySki', wandererCategory: 'skiing' },
  { provider: 'strava', providerCategory: 'MountainBikeRide', wandererCategory: 'mountain-biking' },
];

/**
 * Map provider category to Wanderer category
 */
export function mapCategory(provider: string, providerCategory: string): string {
  const mapping = DEFAULT_MAPPINGS.find(
    (m) => m.provider === provider && m.providerCategory === providerCategory
  );

  return mapping?.wandererCategory || 'other';
}
