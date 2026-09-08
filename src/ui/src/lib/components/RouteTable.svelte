<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { UnifiedRoute } from '../../../../server/routes/routes.js';
  import Badge from './Badge.svelte';

  export let routes: UnifiedRoute[] = [];
  export let loading: boolean = false;
  export let syncingRouteId: string | null = null;

  const dispatch = createEventDispatcher<{ sync: { route: UnifiedRoute } }>();

  function formatDistance(meters: number): string {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  function formatElevation(meters: number): string {
    return `${Math.round(meters)} m ↗`;
  }

  function getProviderUrl(route: UnifiedRoute): string {
    if (route.provider === 'strava') {
      return `https://www.strava.com/routes/${route.id}`;
    }
    return `https://www.komoot.com/tour/${route.id}`;
  }

  function handleSyncClick(route: UnifiedRoute) {
    dispatch('sync', { route });
  }
</script>

<div class="bg-surface-container border border-outline-variant rounded shadow-sm overflow-hidden">
  {#if loading}
    <div class="p-8 space-y-3">
      {#each Array(8) as _, i}
        <div class="flex items-center gap-4 animate-pulse">
          <div class="h-4 w-32 bg-surface-container-high rounded"></div>
          <div class="h-5 w-14 bg-surface-container-high rounded-full"></div>
          <div class="h-4 flex-1 bg-surface-container-high rounded"></div>
        </div>
      {/each}
    </div>
  {:else if routes.length === 0}
    <div class="text-center py-16 text-on-surface-variant">
      <svg class="w-12 h-12 mx-auto mb-4 text-on-surface-variant/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      <p class="text-sm mb-1">No routes found</p>
      <p class="text-xs text-on-surface-variant/60">Routes from your connected providers will appear here.</p>
    </div>
  {:else}
    <div class="overflow-x-auto w-full">
      <table class="w-full text-left font-body-md text-body-md border-collapse">
        <thead class="bg-surface-container-lowest text-on-surface-variant border-b border-outline-variant">
          <tr>
            <th class="text-left px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant/60" scope="col">ROUTE</th>
            <th class="text-right px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant/60 w-64" scope="col">DETAILS & METRICS</th>
            <th class="text-left px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant/60 w-16" scope="col">SOURCE</th>
            <th class="text-left px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant/60 w-32" scope="col">SYNC STATUS</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant/50 text-on-surface">
          {#each routes as route, i}
            <tr class="hover:bg-surface-container-high/60 transition-colors {i % 2 === 1 ? 'bg-surface-container-low/40' : ''}">
              <td class="py-2 px-4">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-white">{route.name}</span>
                  <a
                    href={getProviderUrl(route)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-slate-500 hover:text-emerald-400 transition-colors"
                    title="View on {route.provider === 'strava' ? 'Strava' : 'Komoot'}"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                  </a>
                </div>
              </td>
              <td class="py-2 px-4 whitespace-nowrap text-right w-64">
                <div class="inline-flex items-center gap-2">
                  <span class="text-xs font-mono text-emerald-400 font-semibold">{formatDistance(route.distance)}</span>
                  <span class="text-slate-600">·</span>
                  <span class="text-xs font-mono text-slate-400">{formatElevation(route.elevationGain)}</span>
                  <span class="text-slate-600">·</span>
                  <span class="text-xs font-mono px-2 py-0.5 rounded bg-surface-container-highest/60 text-slate-300 border border-outline-variant/50">{route.activityType}</span>
                </div>
              </td>
              <td class="py-2 px-4 whitespace-nowrap w-16">
                <Badge
                  variant={route.provider === 'strava' ? 'warning' : 'info'}
                  label={route.provider === 'strava' ? 'Strava' : 'Komoot'}
                  pulsing={false}
                />
              </td>
              <td class="py-2 px-4 whitespace-nowrap w-32">
                {#if syncingRouteId === route.id}
                  <Badge variant="info" label="Syncing" loading={true} />
                {:else if route.syncStatus === 'synced'}
                  <Badge variant="success" label="Synced" clickable={true} on:click={() => handleSyncClick(route)} />
                {:else}
                  <Badge variant="neutral" label="Not Synced" clickable={true} on:click={() => handleSyncClick(route)} />
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
