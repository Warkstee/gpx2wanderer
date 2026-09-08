/**
 * Server-side data loading for the credentials page.
 * 
 * This load function runs on the server before the page is rendered,
 * fetching all configuration data in parallel. This approach provides:
 * - Better performance: data loads during SSR, reducing client-side wait time
 * - Improved UX: page renders immediately with data available, no loading spinner needed
 * - Type safety: SvelteKit generates types for the returned data
 */
import type { PageLoad } from './$types';
import { get } from '$lib/api';

export const load: PageLoad = async () => {
  // Load all credentials in parallel
  const [wanderer, komoot, strava, valhalla] = await Promise.all([
    get('/api/config/wanderer'),
    get('/api/config/komoot'),
    get('/api/config/strava'),
    get('/api/config/valhalla')
  ]);

  return {
    wanderer: wanderer.data || { configured: false },
    komoot: komoot.data || { configured: false },
    strava: strava.data || { configured: false },
    valhalla: valhalla.data || { configured: false }
  };
};
