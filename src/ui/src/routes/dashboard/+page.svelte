<script lang="ts">
  import { onMount } from 'svelte';
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import RouteTable from '$lib/components/RouteTable.svelte';
  import FilterToolbar from '$lib/components/FilterToolbar.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  import { get, post } from '$lib/api';
  import type { UnifiedRoute, UnifiedRoutesResponse } from '../../../../server/routes/routes.js';

  let routes: UnifiedRoute[] = [];
  let loading = true;
  let error: string | null = null;

  // Log entries for Latest Activity
  interface LogEntry {
    timestamp: string;
    level: 'info' | 'success' | 'warn' | 'error' | 'debug';
    message: string;
  }
  let latestLogs: LogEntry[] = [];

  // Filter state
  let searchQuery = '';
  let provider: 'all' | 'komoot' | 'strava' = 'all';
  let status: 'all' | 'synced' | 'not_synced' = 'all';
  let sortBy: 'date' | 'distance' | 'elevation' | 'name' = 'date';

  // Pagination state
  let currentPage = 1;
  const perPage = 20;

  // Sync state
  let syncingRouteId: string | null = null;
  let pendingSyncRoute: UnifiedRoute | null = null;
  let showConfirmDialog = false;

  // Toast state
  interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }
  let toasts: ToastMessage[] = [];
  let toastIdCounter = 0;

  function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    const id = toastIdCounter++;
    toasts = [...toasts, { id, message, type }];
  }

  function removeToast(id: number) {
    toasts = toasts.filter(t => t.id !== id);
  }

  async function fetchRoutes() {
    loading = true;
    error = null;
    
    const result = await get<UnifiedRoutesResponse>('/api/routes?page=1&perPage=1000');
    
    if (result.data) {
      routes = result.data.routes;
    } else if (result.error) {
      error = result.error.message;
    }
    
    loading = false;
  }

  async function fetchLatestLogs() {
    const result = await get<{ entries: LogEntry[] }>('/api/logs?limit=5&offset=0');
    if (result.data) {
      latestLogs = result.data.entries;
    }
  }

  // Filtered and sorted routes
  $: filteredRoutes = (() => {
    let result = [...routes];

    // Apply provider filter
    if (provider !== 'all') {
      result = result.filter(r => r.provider === provider);
    }

    // Apply status filter
    if (status !== 'all') {
      result = result.filter(r => r.syncStatus === status);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.activityType.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return b.distance - a.distance;
        case 'elevation':
          return b.elevationGain - a.elevationGain;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return result;
  })();

  // Paginated routes
  $: totalPages = Math.ceil(filteredRoutes.length / perPage);
  $: paginatedRoutes = filteredRoutes.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Reset to page 1 when filters change
  $: {
    currentPage = 1;
  }

  // Provider stats
  $: stravaTotal = routes.filter(r => r.provider === 'strava').length;
  $: stravaSynced = routes.filter(r => r.provider === 'strava' && r.syncStatus === 'synced').length;
  $: komootTotal = routes.filter(r => r.provider === 'komoot').length;
  $: komootSynced = routes.filter(r => r.provider === 'komoot' && r.syncStatus === 'synced').length;

  function handleSyncRequest(event: CustomEvent<{ route: UnifiedRoute }>) {
    const route = event.detail.route;
    
    if (route.syncStatus === 'synced') {
      // Show confirmation dialog for re-sync
      pendingSyncRoute = route;
      showConfirmDialog = true;
    } else {
      // Direct sync for not synced routes
      syncRoute(route);
    }
  }

  function handleConfirmSync() {
    if (pendingSyncRoute) {
      syncRoute(pendingSyncRoute);
      pendingSyncRoute = null;
    }
  }

  function handleCancelSync() {
    pendingSyncRoute = null;
  }

  async function syncRoute(route: UnifiedRoute) {
    syncingRouteId = route.id;
    
    try {
      const endpoint = route.provider === 'komoot' 
        ? `/api/komoot/routes/sync/${route.id}`
        : `/api/strava/routes/sync/${route.id}`;
      
      const result = await post(endpoint);
      
      if (result.data && result.data.success) {
        // Update route status in local cache
        routes = routes.map(r => 
          r.id === route.id 
            ? { ...r, syncStatus: 'synced' as const }
            : r
        );
        
        showToast(`Route "${route.name}" synced successfully`, 'success');
      } else {
        const errorMsg = result.error?.message || 'Unknown error occurred';
        showToast(`Failed to sync route: ${errorMsg}`, 'error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      showToast(`Failed to sync route: ${errorMsg}`, 'error');
    } finally {
      syncingRouteId = null;
    }
  }

  onMount(() => {
    fetchRoutes();
    fetchLatestLogs();
  });
</script>

<div class="mx-auto w-full px-8 flex-1 flex flex-col justify-start py-6 max-w-7xl">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white mb-2 tracking-tight">Routes</h1>
      <p class="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
        Manage and synchronize planned routes between Strava, Komoot, and your self-hosted Wanderer instance.
      </p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
    <Card title="Connected Providers">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="text-sm text-on-surface-variant">Strava</span>
          </div>
          {#if stravaTotal > 0}
            <Badge variant="success" label="{stravaSynced} / {stravaTotal} synced" />
          {:else}
            <Badge variant="warning" label="Not Active" />
          {/if}
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-sky-500"></span>
            <span class="text-sm text-on-surface-variant">Komoot</span>
          </div>
          {#if komootTotal > 0}
            <Badge variant="success" label="{komootSynced} / {komootTotal} synced" />
          {:else}
            <Badge variant="warning" label="Not Active" />
          {/if}
        </div>
      </div>
    </Card>

    <Card title="Latest Activity" status="info" statusLabel="Live">
      <div class="space-y-2 text-sm">
        {#each latestLogs as log}
          <div class="flex items-center gap-2">
            <span class="text-on-surface-variant truncate flex-1">{log.message}</span>
            <span class="text-on-surface-variant font-mono text-xs ml-auto whitespace-nowrap">
              {new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          </div>
        {/each}
        <div class="pt-2 border-t border-outline-variant/40">
          <a href="/logs" class="text-emerald-400 hover:text-emerald-300 text-xs font-mono transition-colors">
            Inspect logs →
          </a>
        </div>
      </div>
    </Card>
  </div>

  {#if error}
    <div class="bg-red-500/10 border border-red-500/30 rounded p-4 mb-6">
      <p class="text-red-400 text-sm">Error loading routes: {error}</p>
    </div>
  {/if}

  <!-- Filter Toolbar -->
  <FilterToolbar
    bind:searchQuery
    bind:provider
    bind:status
    bind:sortBy
    totalRoutes={routes.length}
    filteredCount={filteredRoutes.length}
  />

  <!-- Route Table -->
  <RouteTable 
    routes={paginatedRoutes} 
    {loading}
    {syncingRouteId}
    on:sync={handleSyncRequest}
  />

  <!-- Pagination -->
  {#if totalPages > 1}
    <Pagination
      bind:currentPage
      {totalPages}
    />
  {/if}

  <!-- Toast Notifications -->
  {#each toasts as toast (toast.id)}
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={() => removeToast(toast.id)}
    />
  {/each}

  <!-- Confirmation Dialog -->
  <ConfirmDialog
    bind:open={showConfirmDialog}
    title="Re-sync Route"
    message="This route is already synced to Wanderer. Re-syncing will overwrite any changes made in Wanderer. Do you want to continue?"
    confirmLabel="Re-sync"
    cancelLabel="Cancel"
    variant="warning"
    on:confirm={handleConfirmSync}
    on:cancel={handleCancelSync}
  />
</div>
