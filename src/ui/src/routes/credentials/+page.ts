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
