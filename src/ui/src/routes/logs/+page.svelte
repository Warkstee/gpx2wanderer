<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
</script>

<div class="mx-auto w-full px-8 flex-1 flex flex-col justify-start py-6 max-w-7xl">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white mb-2 tracking-tight">System & Sync Logs</h1>
      <p class="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
        Live event stream and synchronization logs across connected providers (Strava, Komoot, Local Node).
      </p>
    </div>
    <div class="shrink-0 flex items-center">
      <button class="flex items-center gap-2 px-3.5 py-2 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container-high text-white text-xs font-medium transition-all shadow-sm active:scale-95">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
        </svg>
        Export
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card>
      <div class="text-sm text-on-surface-variant mb-1">TOTAL EVENTS</div>
      <div class="text-2xl font-bold text-white">2,481</div>
      <div class="text-xs text-on-surface-variant font-mono mt-1">last 24h</div>
    </Card>
    <Card>
      <div class="text-sm text-on-surface-variant mb-1">INFO & SUCCESS</div>
      <div class="text-2xl font-bold text-primary">2,410</div>
      <div class="text-xs text-primary font-mono mt-1">97.1%</div>
    </Card>
    <Card>
      <div class="text-sm text-on-surface-variant mb-1">WARNINGS</div>
      <div class="text-2xl font-bold text-amber-400">58</div>
      <div class="text-xs text-amber-400 font-mono mt-1">2.3%</div>
    </Card>
    <Card>
      <div class="text-sm text-on-surface-variant mb-1">ERRORS</div>
      <div class="text-2xl font-bold text-red-400">13</div>
      <div class="text-xs text-red-400 font-mono mt-1">0.5%</div>
    </Card>
  </div>

  <Card>
    <div class="text-center py-12 text-on-surface-variant">
      <p class="text-lg mb-2">Log stream will be implemented in GPWA-39</p>
      <p class="text-sm">This placeholder shows the layout structure</p>
    </div>
  </Card>
</div>
