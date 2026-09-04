<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  
  export let data;

  $: isAuthenticated = !!data?.user;
</script>

<div class="min-h-screen flex flex-col">
  {#if isAuthenticated}
    <Header {data} />
  {/if}
  <main class="flex-1">
    <slot />
  </main>
  <footer class="border-t border-outline-variant bg-surface-container-lowest py-4 px-8 text-xs text-on-surface-variant flex items-center justify-between shrink-0">
    <div class="flex items-center gap-2 font-mono text-label-sm uppercase">
      <span class="tracking-wider">Wanderer Route Sync</span>
      <span class="text-surface-bright">•</span>
      <span class="text-on-surface-variant">v0.1</span>
    </div>
  </footer>
</div>
