<script lang="ts">
  export let searchQuery: string = '';
  export let provider: 'all' | 'komoot' | 'strava' = 'all';
  export let status: 'all' | 'synced' | 'not_synced' = 'all';
  export let sortBy: 'date' | 'distance' | 'elevation' | 'name' = 'date';
  export let totalRoutes: number = 0;
  export let filteredCount: number = 0;

  function clearFilters() {
    searchQuery = '';
    provider = 'all';
    status = 'all';
    sortBy = 'date';
  }

  function hasActiveFilters(): boolean {
    return provider !== 'all' || status !== 'all' || searchQuery.trim() !== '';
  }
</script>

<div class="bg-surface-container border border-outline-variant rounded shadow-sm p-4 space-y-3">
  <!-- Search and Filters Row -->
  <div class="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
    <!-- Search Field -->
    <div class="relative flex-1">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
      <input
        type="search"
        bind:value={searchQuery}
        placeholder="Search route by name, region, or distance tag..."
        class="w-full pl-10 pr-4 py-2 bg-surface-container-low text-white font-body-md text-body-md rounded border border-outline-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-500 transition-all"
      />
    </div>

    <!-- Filter Controls -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- Provider Selector -->
      <div class="flex items-center bg-surface-container-low border border-outline-variant p-0.5 rounded">
        <button
          type="button"
          class="px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors rounded"
          class:bg-primary={provider === 'all'}
          class:text-on-primary={provider === 'all'}
          class:text-on-surface-variant={provider !== 'all'}
          class:hover:text-white={provider !== 'all'}
          on:click={() => provider = 'all'}
        >
          All
        </button>
        <button
          type="button"
          class="px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors rounded"
          class:bg-primary={provider === 'strava'}
          class:text-on-primary={provider === 'strava'}
          class:text-on-surface-variant={provider !== 'strava'}
          class:hover:text-white={provider !== 'strava'}
          on:click={() => provider = 'strava'}
        >
          Strava
        </button>
        <button
          type="button"
          class="px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors rounded"
          class:bg-primary={provider === 'komoot'}
          class:text-on-primary={provider === 'komoot'}
          class:text-on-surface-variant={provider !== 'komoot'}
          class:hover:text-white={provider !== 'komoot'}
          on:click={() => provider = 'komoot'}
        >
          Komoot
        </button>
      </div>

      <!-- Status Filter -->
      <select
        bind:value={status}
        class="bg-surface-container-low text-slate-200 border border-outline-variant font-body-sm text-body-sm px-3 py-1.5 rounded focus:outline-none focus:border-primary cursor-pointer"
      >
        <option value="all">All Statuses</option>
        <option value="synced">Synced</option>
        <option value="not_synced">Not Synced</option>
      </select>

      <!-- Sort Select -->
      <select
        bind:value={sortBy}
        class="bg-surface-container-low text-slate-200 border border-outline-variant font-body-sm text-body-sm px-3 py-1.5 rounded focus:outline-none focus:border-primary cursor-pointer"
      >
        <option value="date">Sort: Date Modified</option>
        <option value="distance">Sort: Distance (km)</option>
        <option value="elevation">Sort: Elevation Gain</option>
        <option value="name">Sort: Name (A-Z)</option>
      </select>
    </div>
  </div>

  <!-- Active Filter Summary Strip -->
  <div class="flex items-center justify-between text-on-surface-variant font-mono text-xs pt-2 border-t border-outline-variant/40">
    <div class="flex items-center gap-2 flex-wrap">
      <span class="text-slate-400">Active Filters:</span>
      {#if provider !== 'all'}
        <span class="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant text-slate-300 font-mono text-[11px]">
          Provider: {provider === 'komoot' ? 'Komoot' : 'Strava'}
        </span>
      {/if}
      {#if status !== 'all'}
        <span class="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant text-slate-300 font-mono text-[11px]">
          Status: {status === 'synced' ? 'Synced' : 'Not Synced'}
        </span>
      {/if}
      {#if searchQuery.trim()}
        <span class="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant text-slate-300 font-mono text-[11px]">
          Search: "{searchQuery.trim()}"
        </span>
      {/if}
      {#if !hasActiveFilters()}
        <span class="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant text-slate-300 font-mono text-[11px]">
          None
        </span>
      {/if}
      {#if hasActiveFilters()}
        <button
          type="button"
          class="text-emerald-400 hover:text-emerald-300 hover:underline ml-2 cursor-pointer"
          on:click={clearFilters}
        >
          Clear all
        </button>
      {/if}
    </div>
    <div class="font-mono text-xs text-slate-400">
      Showing <span class="text-white font-semibold">{filteredCount}</span> of <span class="text-white font-semibold">{totalRoutes}</span> routes
    </div>
  </div>
</div>
