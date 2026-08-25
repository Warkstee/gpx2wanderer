/**
 * Wanderer category mapping — maps provider sport codes to Wanderer categories.
 * 
 * Loads the mapping from config/mapping.json at runtime, allowing users to
 * customize the mapping without modifying source code.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Cached mapping configuration (loaded once on first access).
 */
let cachedConfig: MappingConfig | null = null;

/**
 * Load the category mapping from config/mapping.json.
 * 
 * The config file is located at the project root in config/mapping.json.
 * This function caches the result to avoid repeated file reads.
 * 
 * @returns The mapping configuration
 * @throws Error if the config file cannot be loaded or parsed
 */
function loadMappingConfig(): MappingConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  // Resolve path relative to this file: src/wanderer/ -> ../../config/mapping.json
  const configPath = resolve(__dirname, '..', '..', 'config', 'mapping.json');

  try {
    const content = readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(content) as MappingConfig;
    return cachedConfig;
  } catch (err) {
    throw new Error(
      `Failed to load category mapping from ${configPath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Map a provider sport code to Wanderer category and optional subcategory.
 * 
 * @param sport - Provider sport code (e.g., "mtb_easy", "racebike", "hike")
 * @returns Object with category and optional subcategory, or null if not found
 */
export function mapSportToCategory(sport: string): { category: string; subcategory?: string } | null {
  const config = loadMappingConfig();
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
 * @param sport - Provider sport code
 * @returns Display string (e.g., "Biking (MTB)", "Hiking"), or the original sport if not found
 */
export function mapSportToActivityType(sport: string): string {
  const result = mapSportToCategory(sport);

  if (!result) {
    return sport;
  }

  if (result.subcategory) {
    return `${result.category} (${result.subcategory})`;
  }

  return result.category;
}
