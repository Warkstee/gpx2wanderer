<script lang="ts">
  import { onMount } from 'svelte';
  import Card from '$lib/components/Card.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { get } from '$lib/api';

  interface LogEntry {
    timestamp: string;
    level: 'info' | 'success' | 'warn' | 'error' | 'debug';
    message: string;
  }

  interface PaginatedResponse {
    entries: LogEntry[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    levelCounts: {
      info: number;
      success: number;
      warn: number;
      error: number;
      debug: number;
    };
  }

  let entries: LogEntry[] = [];
  let loading = true;
  let lastUpdated: Date | null = null;

  // Pagination state
  const PAGE_SIZE = 100;
  let currentPage = 1; // 1-based for Pagination component
  let totalEntries = 0;
  let hasMore = false;
  let levelCounts = { info: 0, success: 0, warn: 0, error: 0, debug: 0 };

  // Filter state
  let searchQuery = '';
  let activeLevel: 'all' | 'info' | 'success' | 'warn' | 'error' | 'debug' = 'all';
  let sortOrder: 'newest' | 'oldest' = 'newest';

  const levels = ['all', 'info', 'success', 'warn', 'error', 'debug'] as const;

  async function fetchLogs() {
    loading = entries.length === 0;
    
    const params = new URLSearchParams({
      limit: PAGE_SIZE.toString(),
      offset: ((currentPage - 1) * PAGE_SIZE).toString() // Convert 1-based to 0-based for API
    });
    
    if (activeLevel !== 'all') {
      params.set('level', activeLevel);
    }
    
    const result = await get<PaginatedResponse>(`/api/logs?${params.toString()}`);
    if (result.data) {
      entries = result.data.entries;
      totalEntries = result.data.total;
      hasMore = result.data.hasMore;
      levelCounts = result.data.levelCounts;
      lastUpdated = new Date();
    }
    loading = false;
  }

  // Track previous filter state to detect changes
  let prevFilterState = '';
  
  // Refetch when filters change
  $: {
    const currentFilterState = `${activeLevel}-${searchQuery}`;
    if (currentFilterState !== prevFilterState) {
      prevFilterState = currentFilterState;
      currentPage = 1;
      fetchLogs();
    }
  }

  // Derived: filtered + sorted entries (client-side on current page)
  $: filteredEntries = (() => {
    let result = [...entries];

    // Filter by search query (client-side on current page)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.message.toLowerCase().includes(q));
    }

    // Sort
    if (sortOrder === 'oldest') {
      result.reverse();
    }

    return result;
  })();

  // Derived: stats (from server total)
  $: totalPages = Math.ceil(totalEntries / PAGE_SIZE);

  function formatTimestamp(ts: string): string {
    const d = new Date(ts);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  function formatLastUpdated(d: Date | null): string {
    if (!d) return '';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  function levelBadgeClasses(level: string): string {
    switch (level) {
      case 'info': return 'bg-sky-500/10 border-sky-500/30 text-sky-400';
      case 'success': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'warn': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'error': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'debug': return 'bg-surface-container-high border-outline-variant text-on-surface-variant';
      default: return 'bg-surface-container-high border-outline-variant text-on-surface-variant';
    }
  }

  function exportLogs() {
    const lines = filteredEntries.map(e => `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  onMount(fetchLogs);
</script>

<div class="mx-auto w-full px-8 flex-1 flex flex-col justify-start py-6 max-w-7xl">
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white mb-2 tracking-tight">System & Sync Logs</h1>
      <p class="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
        Event stream and synchronization logs across connected providers (Strava, Komoot, Local Node).
      </p>
    </div>
    <div class="shrink-0 flex items-center gap-3">
      {#if lastUpdated}
        <span class="text-xs text-on-surface-variant font-mono">
          Updated {formatLastUpdated(lastUpdated)}
        </span>
      {/if}
      <button
        on:click={fetchLogs}
        class="flex items-center gap-2 px-3 py-2 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container-high text-white text-xs font-medium transition-all active:scale-95"
        title="Refresh logs"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Refresh
      </button>
      <button
        on:click={exportLogs}
        disabled={filteredEntries.length === 0}
        class="flex items-center gap-2 px-3 py-2 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container-high text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        Export
      </button>
    </div>
  </div>

  <!-- Stat Cards -->
  <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
    <div class="bg-surface-container-low border border-outline-variant px-4 py-3 rounded-lg shadow-sm flex flex-col justify-between">
      <span class="font-mono text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Total</span>
      <div class="flex items-baseline justify-between mt-1">
        <span class="text-xl font-bold text-white">{totalEntries.toLocaleString()}</span>
      </div>
    </div>
    <div class="bg-surface-container-low border border-outline-variant px-4 py-3 rounded-lg shadow-sm flex flex-col justify-between">
      <span class="font-mono text-[11px] font-semibold uppercase tracking-wider text-sky-400">Info</span>
      <div class="flex items-baseline justify-between mt-1">
        <span class="text-xl font-bold text-sky-300">{levelCounts.info.toLocaleString()}</span>
      </div>
    </div>
    <div class="bg-surface-container-low border border-outline-variant px-4 py-3 rounded-lg shadow-sm flex flex-col justify-between">
      <span class="font-mono text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Success</span>
      <div class="flex items-baseline justify-between mt-1">
        <span class="text-xl font-bold text-emerald-300">{levelCounts.success.toLocaleString()}</span>
      </div>
    </div>
    <div class="bg-surface-container-low border border-outline-variant px-4 py-3 rounded-lg shadow-sm flex flex-col justify-between">
      <span class="font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-400">Warn</span>
      <div class="flex items-baseline justify-between mt-1">
        <span class="text-xl font-bold text-amber-300">{levelCounts.warn.toLocaleString()}</span>
      </div>
    </div>
    <div class="bg-surface-container-low border border-outline-variant px-4 py-3 rounded-lg shadow-sm flex flex-col justify-between">
      <span class="font-mono text-[11px] font-semibold uppercase tracking-wider text-red-400">Error</span>
      <div class="flex items-baseline justify-between mt-1">
        <span class="text-xl font-bold text-red-300">{levelCounts.error.toLocaleString()}</span>
      </div>
    </div>
    <div class="bg-surface-container-low border border-outline-variant px-4 py-3 rounded-lg shadow-sm flex flex-col justify-between">
      <span class="font-mono text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">Debug</span>
      <div class="flex items-baseline justify-between mt-1">
        <span class="text-xl font-bold text-white">{levelCounts.debug.toLocaleString()}</span>
      </div>
    </div>
  </div>

  <!-- Filter Bar -->
  <div class="bg-surface-container-low border border-outline-variant rounded-lg p-4 mb-6 space-y-3">
    <div class="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
      <!-- Search -->
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <input
          type="search"
          bind:value={searchQuery}
          placeholder="Search log messages..."
          class="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant text-white font-mono text-sm rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50 transition-all"
        />
      </div>

      <!-- Level pills + sort -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center bg-surface border border-outline-variant p-0.5 rounded">
          {#each levels as level}
            <button
              on:click={() => activeLevel = level}
              class="px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors rounded"
              class:bg-primary={activeLevel === level}
              class:text-on-primary={activeLevel === level}
              class:text-on-surface-variant={activeLevel !== level}
              class:hover:text-white={activeLevel !== level}
            >
              {level}
            </button>
          {/each}
        </div>

        <select
          bind:value={sortOrder}
          class="bg-surface text-on-surface-variant border border-outline-variant font-mono text-xs px-3 py-1.5 rounded focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>
    </div>

    <!-- Active filter summary -->
    <div class="flex items-center gap-2 text-on-surface-variant font-mono text-xs pt-2 border-t border-outline-variant/40">
      <span class="text-on-surface-variant/60">Active Filters:</span>
      <span class="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant text-on-surface-variant font-mono text-[11px]">
        Level: {activeLevel}
      </span>
      {#if searchQuery.trim()}
        <span class="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high border border-outline-variant text-on-surface-variant font-mono text-[11px]">
          Search: "{searchQuery.trim()}"
        </span>
      {/if}
      <span class="ml-auto text-on-surface-variant/60">
        {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
      </span>
    </div>
  </div>

  <!-- Log Table -->
  <div class="bg-surface-container-low border border-outline-variant rounded-lg shadow-sm overflow-hidden">
    {#if loading}
      <!-- Loading skeleton -->
      <div class="p-8 space-y-3">
        {#each Array(8) as _, i}
          <div class="flex items-center gap-4 animate-pulse">
            <div class="h-4 w-32 bg-surface-container-high rounded"></div>
            <div class="h-5 w-14 bg-surface-container-high rounded-full"></div>
            <div class="h-4 flex-1 bg-surface-container-high rounded"></div>
          </div>
        {/each}
      </div>
    {:else if filteredEntries.length === 0}
      <!-- Empty state -->
      <div class="text-center py-16 text-on-surface-variant">
        <svg class="w-12 h-12 mx-auto mb-4 text-on-surface-variant/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-sm mb-1">No log entries found</p>
        <p class="text-xs text-on-surface-variant/60">
          {entries.length === 0 ? 'Logs will appear here once the system generates events.' : 'Try adjusting your filters.'}
        </p>
      </div>
    {:else}
      <!-- Table -->
      <div class="overflow-y-auto max-h-[600px]">
        <table class="w-full">
          <thead class="sticky top-0 bg-surface-container-lowest border-b border-outline-variant z-10">
            <tr>
              <th class="text-left px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant/60 w-44">Timestamp</th>
              <th class="text-left px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant/60 w-24">Level</th>
              <th class="text-left px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant/60">Message</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredEntries as entry, i (entry.timestamp + i)}
              <tr class="border-b border-outline-variant/30 hover:bg-surface-container-high/60 transition-colors">
                <td class="px-4 py-2 font-mono text-xs text-on-surface-variant/70 whitespace-nowrap">
                  {formatTimestamp(entry.timestamp)}
                </td>
                <td class="px-4 py-2">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] font-medium border {levelBadgeClasses(entry.level)}">
                    {entry.level.toUpperCase()}
                  </span>
                </td>
                <td class="px-4 py-2 font-mono text-xs text-white/90 break-all">
                  {entry.message}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <!-- Pagination Controls -->
  <Pagination
    bind:currentPage
    {hasMore}
    on:pageChange={fetchLogs}
  />
</div>
