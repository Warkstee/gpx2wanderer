<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Input from '$lib/components/Input.svelte';
  import Button from '$lib/components/Button.svelte';
</script>

<div class="mx-auto w-full px-8 flex-1 flex flex-col justify-start py-6 max-w-3xl">
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
    <div>
      <h1 class="text-3xl font-bold text-white mb-2 tracking-tight">Credentials</h1>
      <p class="text-sm text-on-surface-variant max-w-3xl leading-relaxed">
        Manage authentication keys, API secrets, and connection parameters for synced outdoor routing platforms and self-hosted telemetry nodes.
      </p>
    </div>
    <div class="shrink-0 flex items-center">
      <Button variant="secondary" size="sm">
        <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
        </svg>
        Ping All Nodes
      </Button>
    </div>
  </div>

  <div class="flex flex-col w-full pb-8 space-y-8">
    <Card title="Wanderer Core" status="success" statusLabel="Local Node">
      <div class="space-y-4">
        <Input label="Valhalla Endpoint / Host URL" value="http://valhalla.local:8002" icon="🌐" />
        <Input label="Username" value="admin@wanderer.local" icon="👤" />
        <Input label="Password" type="password" value="••••••••••••" icon="🔒" showToggle />
      </div>
      <div slot="actions">
        <Button variant="primary" size="sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          Save
        </Button>
      </div>
    </Card>

    <Card title="Komoot" status="info" statusLabel="Authorized">
      <div class="space-y-4">
        <Input label="Komoot Account / Email" type="email" value="rider.alex@wanderer.cc" icon="✉" />
        <Input label="Account Password" type="password" value="••••••••••••" icon="🔒" showToggle />
      </div>
      <div slot="actions">
        <Button variant="primary" size="sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          Save
        </Button>
      </div>
    </Card>

    <Card title="Strava" status="success" statusLabel="OAuth Active">
      <div class="text-center py-8 text-on-surface-variant">
        <p class="text-sm">Strava configuration will be implemented in GPWA-37</p>
      </div>
      <div slot="actions">
        <Button variant="primary" size="sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          Save
        </Button>
      </div>
    </Card>
  </div>
</div>
