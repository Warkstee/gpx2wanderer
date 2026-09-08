<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Input from '$lib/components/Input.svelte';
  import Button from '$lib/components/Button.svelte';
  import Toast from '$lib/components/Toast.svelte';
  import { post, get } from '$lib/api';
  import type { PageData } from './$types';

  export let data: PageData;

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

  // Wanderer Core credentials
  let wandererHost = data.wanderer.host || '';
  let wandererUsername = data.wanderer.username || '';
  let wandererPassword = '';
  let wandererSaving = false;
  let wandererMessage = '';
  let wandererMessageType: 'success' | 'error' = 'success';
  let wandererConfigured = data.wanderer.configured || false;

  // Komoot credentials
  let komootEmail = data.komoot.email || '';
  let komootPassword = '';
  let komootSaving = false;
  let komootMessage = '';
  let komootMessageType: 'success' | 'error' = 'success';
  let komootConfigured = data.komoot.configured || false;

  // Strava credentials
  let stravaClientId = data.strava.clientId || '';
  let stravaClientSecret = '';
  let stravaRefreshToken = '';
  let stravaSaving = false;
  let stravaMessage = '';
  let stravaMessageType: 'success' | 'error' = 'success';
  let stravaConfigured = data.strava.configured || false;

  // Valhalla configuration
  let valhallaUrl = data.valhalla.url || '';
  let valhallaSaving = false;
  let valhallaMessage = '';
  let valhallaMessageType: 'success' | 'error' = 'success';
  let valhallaConfigured = data.valhalla.configured || false;

  function isValidUrl(urlString: string): boolean {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  }

  async function saveWanderer() {
    if (!wandererHost || !wandererUsername || !wandererPassword) {
      wandererMessage = 'All fields are required';
      wandererMessageType = 'error';
      return;
    }

    if (!isValidUrl(wandererHost)) {
      wandererMessage = 'Please enter a valid URL (e.g., http://wanderer.local:3000)';
      wandererMessageType = 'error';
      return;
    }

    wandererSaving = true;
    wandererMessage = '';

    const result = await post('/api/config/wanderer', {
      host: wandererHost,
      username: wandererUsername,
      password: wandererPassword
    });

    wandererSaving = false;

    if (result.error) {
      wandererMessage = result.error.message || 'Failed to save credentials';
      wandererMessageType = 'error';
      showToast(wandererMessage, 'error');
    } else {
      wandererMessage = 'Credentials verified and saved successfully';
      wandererMessageType = 'success';
      wandererPassword = '';
      wandererConfigured = true;
      showToast(wandererMessage, 'success');
    }
  }

  async function saveKomoot() {
    if (!komootEmail || !komootPassword) {
      komootMessage = 'Email and password are required';
      komootMessageType = 'error';
      return;
    }

    komootSaving = true;
    komootMessage = '';

    const result = await post('/api/config/komoot', {
      email: komootEmail,
      password: komootPassword
    });

    komootSaving = false;

    if (result.error) {
      komootMessage = result.error.message || 'Failed to save credentials';
      komootMessageType = 'error';
      showToast(komootMessage, 'error');
    } else {
      komootMessage = 'Credentials verified and saved successfully';
      komootMessageType = 'success';
      komootPassword = '';
      komootConfigured = true;
      showToast(komootMessage, 'success');
    }
  }

  async function saveStrava() {
    if (!stravaClientId || !stravaClientSecret || !stravaRefreshToken) {
      stravaMessage = 'All fields are required';
      stravaMessageType = 'error';
      return;
    }

    stravaSaving = true;
    stravaMessage = '';

    const result = await post('/api/config/strava', {
      clientId: stravaClientId,
      clientSecret: stravaClientSecret,
      refreshToken: stravaRefreshToken
    });

    stravaSaving = false;

    if (result.error) {
      stravaMessage = result.error.message || 'Failed to save credentials';
      stravaMessageType = 'error';
      showToast(stravaMessage, 'error');
    } else {
      stravaMessage = 'Credentials verified and saved successfully';
      stravaMessageType = 'success';
      stravaClientSecret = '';
      stravaRefreshToken = '';
      stravaConfigured = true;
      showToast(stravaMessage, 'success');
    }
  }

  async function saveValhalla() {
    if (!valhallaUrl) {
      valhallaMessage = 'URL is required';
      valhallaMessageType = 'error';
      return;
    }

    if (!isValidUrl(valhallaUrl)) {
      valhallaMessage = 'Please enter a valid URL (e.g., http://valhalla.local:8002)';
      valhallaMessageType = 'error';
      return;
    }

    valhallaSaving = true;
    valhallaMessage = '';

    const result = await post('/api/config/valhalla', {
      url: valhallaUrl
    });

    valhallaSaving = false;

    if (result.error) {
      valhallaMessage = result.error.message || 'Failed to save configuration';
      valhallaMessageType = 'error';
      showToast(valhallaMessage, 'error');
    } else {
      valhallaMessage = 'Configuration verified and saved successfully';
      valhallaMessageType = 'success';
      valhallaConfigured = true;
      showToast(valhallaMessage, 'success');
    }
  }

  // Ping All state
  let pinging = false;

  async function pingAll() {
    pinging = true;

    try {
      const result = await post<{ summary: string; results: Record<string, { status: string; message: string }> }>('/api/config/ping-all');

      if (result.error) {
        showToast(result.error.message || 'Ping failed', 'error');
      } else if (result.data) {
        const { summary, results } = result.data;
        const hasFailures = Object.values(results).some(r => r.status === 'fail');

        // Show summary toast
        showToast(summary, hasFailures ? 'warning' : 'success');

        // Show individual toasts for failures
        for (const [service, pingResult] of Object.entries(results)) {
          if (pingResult.status === 'fail') {
            const label = service.charAt(0).toUpperCase() + service.slice(1);
            showToast(`${label}: ${pingResult.message}`, 'error');
          }
        }
      }
    } catch {
      showToast('Failed to ping services', 'error');
    } finally {
      pinging = false;
    }
  }

  function getStatusForService(configured: boolean, type: string): { status: 'success' | 'warning' | 'error' | 'info' | 'neutral', label: string } {
    if (!configured) {
      return { status: 'warning', label: 'Not Configured' };
    }
    
    if (type === 'wanderer') {
      return { status: 'success', label: 'Local Node' };
    } else if (type === 'komoot') {
      return { status: 'success', label: 'Authorized' };
    } else if (type === 'strava') {
      return { status: 'success', label: 'Authorized' };
    } else if (type === 'valhalla') {
      return { status: 'success', label: 'Connected' };
    }
    
    return { status: 'neutral', label: 'Unknown' };
  }
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
      <Button variant="secondary" size="sm" loading={pinging} on:click={pingAll}>
        <svg class="w-4 h-4 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
        </svg>
        Ping All Nodes
      </Button>
    </div>
  </div>

  <div class="flex flex-col w-full pb-8 space-y-8">
    <!-- Wanderer Core Configuration-->
    <Card 
      title="Wanderer Core" 
      status={getStatusForService(wandererConfigured, 'wanderer').status}
      statusLabel={getStatusForService(wandererConfigured, 'wanderer').label}
    >
      <div class="space-y-4">
        <Input 
          label="Wanderer Host URL" 
          bind:value={wandererHost} 
          placeholder="http://wanderer.local:3000"
          icon="🌐" 
        />
        <Input 
          label="Username" 
          bind:value={wandererUsername} 
          placeholder="admin"
          icon="👤" 
        />
        <Input 
          label="Password" 
          type="password" 
          bind:value={wandererPassword} 
          placeholder={wandererConfigured ? '••••••••' : 'Enter password'}
          icon="🔒" 
          showToggle 
        />
        {#if wandererMessage}
          <div class="text-sm {wandererMessageType === 'success' ? 'text-emerald-400' : 'text-red-400'}">
            {wandererMessage}
          </div>
        {/if}
      </div>
      <div slot="actions">
        <Button 
          variant="primary" 
          size="sm"
          loading={wandererSaving}
          on:click={saveWanderer}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          Save
        </Button>
      </div>
    </Card>

    <!-- Komoot Configuration -->
    <Card 
      title="Komoot" 
      status={getStatusForService(komootConfigured, 'komoot').status}
      statusLabel={getStatusForService(komootConfigured, 'komoot').label}
    >
      <div class="space-y-4">
        <Input 
          label="Komoot Account / Email" 
          type="text" 
          bind:value={komootEmail} 
          placeholder="rider@example.com"
          icon="✉" 
        />
        <Input 
          label="Account Password" 
          type="password" 
          bind:value={komootPassword} 
          placeholder={komootConfigured ? '••••••••' : 'Enter password'}
          icon="🔒" 
          showToggle 
        />
        {#if komootMessage}
          <div class="text-sm {komootMessageType === 'success' ? 'text-emerald-400' : 'text-red-400'}">
            {komootMessage}
          </div>
        {/if}
      </div>
      <div slot="actions">
        <Button 
          variant="primary" 
          size="sm"
          loading={komootSaving}
          on:click={saveKomoot}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          Save
        </Button>
      </div>
    </Card>

    <!-- Strava Configuration -->
    <Card 
      title="Strava" 
      status={getStatusForService(stravaConfigured, 'strava').status}
      statusLabel={getStatusForService(stravaConfigured, 'strava').label}
    >
      <div class="space-y-4">
        <Input 
          label="Client ID" 
          bind:value={stravaClientId} 
          placeholder="12345"
          icon="🔑" 
        />
        <Input 
          label="Client Secret" 
          type="password" 
          bind:value={stravaClientSecret} 
          placeholder={stravaConfigured ? '••••••••' : 'Enter client secret'}
          icon="" 
          showToggle 
        />
        <Input 
          label="Refresh Token" 
          type="password" 
          bind:value={stravaRefreshToken} 
          placeholder={stravaConfigured ? '••••••••' : 'Enter refresh token'}
          icon="🔄" 
          showToggle 
        />
        {#if stravaMessage}
          <div class="text-sm {stravaMessageType === 'success' ? 'text-emerald-400' : 'text-red-400'}">
            {stravaMessage}
          </div>
        {/if}
      </div>
      <div slot="actions">
        <Button 
          variant="primary" 
          size="sm"
          loading={stravaSaving}
          on:click={saveStrava}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          Save
        </Button>
      </div>
    </Card>

    <!-- Valhalla Configuration -->
    <Card 
      title="Valhalla Routing Engine" 
      status={getStatusForService(valhallaConfigured, 'valhalla').status}
      statusLabel={getStatusForService(valhallaConfigured, 'valhalla').label}
    >
      <div class="space-y-4">
        <Input 
          label="Valhalla Endpoint URL" 
          bind:value={valhallaUrl} 
          placeholder="http://valhalla.local:8002"
          icon="🌐" 
        />
        {#if valhallaMessage}
          <div class="text-sm {valhallaMessageType === 'success' ? 'text-emerald-400' : 'text-red-400'}">
            {valhallaMessage}
          </div>
        {/if}
      </div>
      <div slot="actions">
        <Button 
          variant="primary" 
          size="sm"
          loading={valhallaSaving}
          on:click={saveValhalla}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          Save
        </Button>
      </div>
    </Card>
  </div>

  <!-- Toast notifications -->
  {#each toasts as toast (toast.id)}
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={() => removeToast(toast.id)}
    />
  {/each}
</div>
