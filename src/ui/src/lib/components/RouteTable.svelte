<script lang="ts">
  import type { UnifiedRoute } from '../../../server/routes/routes.js';

  export let routes: UnifiedRoute[] = [];
  export let loading: boolean = false;

  function formatDistance(meters: number): string {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  function formatElevation(meters: number): string {
    return `${Math.round(meters)} m ↗`;
  }

  function providerBadgeClasses(provider: string): string {
    if (provider === 'strava') {
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    }
    return 'bg-sky-500/10 text-sky-300 border-sky-500/20';
  }

  function providerDotColor(provider: string): string {
    if (provider === 'strava') {
      return 'bg-amber-400';
    }
    return 'bg-sky-400';
  }

  function syncStatusClasses(status: string): string {
    if (status === 'synced') {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
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
        <thead class="bg-surface-container-lowest text-on-surface-variant font-label-caps text-label-caps uppercase border-b border-outline-variant">
          <tr>
            <th class="py-space-sm px-space-md" scope="col">Route Details & Metrics</th>
            <th class="py-space-sm px-space-md" scope="col">Source</th>
            <th class="py-space-sm px-space-md" scope="col">Sync Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant/50 text-on-surface">
          {#each routes as route, i}
            <tr class="hover:bg-surface-container-high/60 transition-colors {i % 2 === 1 ? 'bg-surface-container-low/40' : ''}">
              <td class="py-space-sm px-space-md">
                <div class="flex flex-col">
                  <span class="font-title-md text-title-md text-white">{route.name}</span>
                  <div class="flex items-center gap-space-xs mt-0.5">
                    <span class="font-label-code text-label-code text-emerald-400 font-semibold">{formatDistance(route.distance)}</span>
                    <span class="text-slate-600">•</span>
                    <span class="font-label-code text-label-code text-slate-400">{formatElevation(route.elevationGain)}</span>
                    <span class="text-slate-600">•</span>
                    <span class="font-label-caps text-label-caps px-space-2xs py-0.5 rounded bg-surface-container-highest/60 text-slate-300 border border-outline-variant/50">{route.activityType}</span>
                  </div>
                </div>
              </td>
              <td class="py-space-sm px-space-md whitespace-nowrap">
                <span class="inline-flex items-center gap-space-2xs px-space-xs py-0.5 rounded font-label-caps text-label-caps {providerBadgeClasses(route.provider)} border font-semibold">
                  <span class="w-1.5 h-1.5 rounded-full {providerDotColor(route.provider)}"></span>
                  {route.provider === 'strava' ? 'Strava' : 'Komoot'}
                </span>
              </td>
              <td class="py-space-sm px-space-md whitespace-nowrap">
                {#if route.syncStatus === 'synced'}
                  <span class="inline-flex items-center gap-space-2xs font-label-caps text-label-caps px-space-xs py-0.5 rounded {syncStatusClasses(route.syncStatus)} border">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Synced
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-space-2xs font-label-caps text-label-caps px-space-xs py-0.5 rounded {syncStatusClasses(route.syncStatus)} border">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path>
                    </svg>
                    Not Synced
                  </span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
