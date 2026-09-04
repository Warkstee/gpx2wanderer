<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Badge from '$lib/components/Badge.svelte';
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

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
    <Card title="Connected Providers" status="success" statusLabel="2 active">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-on-surface-variant">Strava</span>
          <Badge variant="success" label="18 / 18 synced" />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-on-surface-variant">Komoot</span>
          <Badge variant="success" label="16 / 16 synced" />
        </div>
      </div>
    </Card>

    <Card title="Latest Activity" status="info" statusLabel="Live">
      <div class="space-y-2 text-sm">
        <div class="flex items-center gap-2">
          <span class="text-primary">✓</span>
          <span class="text-on-surface-variant">Payload push to Wanderer ok</span>
          <span class="text-on-surface-variant font-mono text-xs ml-auto">14:22:10</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sky-400"></span>
          <span class="text-on-surface-variant">Komoot webhook received</span>
          <span class="text-on-surface-variant font-mono text-xs ml-auto">14:21:48</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-primary">✓</span>
          <span class="text-on-surface-variant">Strava OAuth token refreshed</span>
          <span class="text-on-surface-variant font-mono text-xs ml-auto">13:58:02</span>
        </div>
      </div>
    </Card>
  </div>

  <Card>
    <div class="text-center py-12 text-on-surface-variant">
      <p class="text-lg mb-2">Route listing will be implemented in GPWA-38</p>
      <p class="text-sm">This placeholder shows the layout structure</p>
    </div>
  </Card>
</div>
