<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral';
  export let label: string = '';
  export let pulsing: boolean = false;
  export let clickable: boolean = false;
  export let loading: boolean = false;

  const dispatch = createEventDispatcher<{ click: void }>();

  function handleClick() {
    if (clickable && !loading) {
      dispatch('click');
    }
  }
</script>

{#if clickable}
  <button
    type="button"
    class="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] font-medium border transition-all {variant === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50' : variant === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50' : variant === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50' : variant === 'info' ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20 hover:border-sky-500/50' : 'bg-surface-container-high border-outline-variant text-on-surface-variant hover:bg-surface-container-highest hover:border-outline'} {clickable ? 'cursor-pointer' : 'cursor-default'} {loading ? 'opacity-70 cursor-wait' : ''}"
    on:click={handleClick}
    disabled={loading}
  >
    {#if loading}
      <svg class="w-3 h-3 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    {:else if pulsing}
      <span 
        class="w-1.5 h-1.5 rounded-full mr-1.5 {variant === 'success' ? 'bg-emerald-400' : variant === 'warning' ? 'bg-amber-400' : variant === 'error' ? 'bg-red-400' : variant === 'info' ? 'bg-sky-400' : ''} {pulsing ? 'animate-pulse' : ''}"
      ></span>
    {/if}
    {label}
  </button>
{:else}
  <span 
    class="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] font-medium border {variant === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : variant === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : variant === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : variant === 'info' ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-surface-container-high border-outline-variant text-on-surface-variant'}"
  >
    {#if pulsing}
      <span 
        class="w-1.5 h-1.5 rounded-full mr-1.5 {variant === 'success' ? 'bg-emerald-400' : variant === 'warning' ? 'bg-amber-400' : variant === 'error' ? 'bg-red-400' : variant === 'info' ? 'bg-sky-400' : ''} {pulsing ? 'animate-pulse' : ''}"
      ></span>
    {/if}
    {label}
  </span>
{/if}
