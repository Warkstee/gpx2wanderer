/**
 * Wanderer category mapping — maps provider sport codes to Wanderer categories.
 * 
 * Imports provider-specific mapping.json files at compile time,
 * allowing users to customize the mapping without modifying source code.
 */

import komootMapping from '../providers/komoot/mapping.json' with { type: 'json' };
import stravaMapping from '../providers/strava/mapping.json' with { type: 'json' };

/**
 * Category mapping entry — either a simple string or an object with category/subcategory.
 */
export type CategoryMapping = string | { category: string; subcategory?: string };

/**
 * Mapping configuration structure.
 */
interface MappingConfig {
  categoryMapping: Record<string, CategoryMapping>;
}

/**
 * Provider mapping configurations.
 */
const providerConfigs: Record<string, MappingConfig> = {
  komoot: komootMapping as MappingConfig,
  strava: stravaMapping as MappingConfig,
};

/**
 * Get the category mapping for a provider.
 * 
 * @param provider - Provider name (e.g., 'komoot', 'strava')
 * @returns The mapping configuration
 * @throws Error if the provider is not supported
 */
function getMappingConfig(provider: string): MappingConfig {
  const config = providerConfigs[provider];
  if (!config) {
    throw new Error(`Unsupported provider: ${provider}. Supported providers: ${Object.keys(providerConfigs).join(', ')}`);
  }
  return config;
}

/**
 * Map a provider sport code to Wanderer category and optional subcategory.
 * 
 * @param provider - Provider name (e.g., 'komoot', 'strava')
 * @param sport - Provider sport code (e.g., "mtb_easy", "racebike", "hike", "1", "2")
 * @returns Object with category and optional subcategory, or null if not found
 */
export function mapSportToCategory(provider: string, sport: string): { category: string; subcategory?: string } | null {
  const config = getMappingConfig(provider);
  const mapping = config.categoryMapping[sport];

  if (!mapping) {
    return null;
  }

  // Handle both simple string and object formats
  if (typeof mapping === 'string') {
    return { category: mapping };
  }

  return mapping;
}

/**
 * Map a provider sport code to a display-friendly activity type string.
 * 
 * For backward compatibility, this returns a single string.
 * If the mapping includes a subcategory, it's formatted as "Category (Subcategory)".
 * 
 * @param provider - Provider name (e.g., 'komoot', 'strava')
 * @param sport - Provider sport code
 * @returns Display string (e.g., "Biking (MTB)", "Hiking"), or the original sport if not found
 */
export function mapSportToActivityType(provider: string, sport: string): string {
  const result = mapSportToCategory(provider, sport);

  if (!result) {
    return sport;
  }

  if (result.subcategory) {
    return `${result.category} (${result.subcategory})`;
  }

  return result.category;
}
