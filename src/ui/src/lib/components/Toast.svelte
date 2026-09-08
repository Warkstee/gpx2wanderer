<script lang="ts">
  import { onMount } from 'svelte';

  export let message: string = '';
  export let type: 'success' | 'error' | 'info' | 'warning' = 'info';
  export let duration: number = 4000;
  export let onClose: () => void = () => {};

  let visible = true;

  onMount(() => {
    if (duration > 0) {
      setTimeout(() => {
        visible = false;
        setTimeout(onClose, 300); // Wait for fade out animation
      }, duration);
    }
  });

  function handleClose() {
    visible = false;
    setTimeout(onClose, 300);
  }
</script>

{#if visible}
  <div
    class="fixed top-4 right-4 z-50 animate-slide-in max-w-md"
    role="alert"
  >
    <div
      class="flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm {type === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : type === 'error'
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : type === 'warning'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : 'bg-sky-500/10 border-sky-500/30 text-sky-400'}"
    >
      <div class="flex-shrink-0">
        {#if type === 'success'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        {:else if type === 'error'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        {:else if type === 'warning'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        {:else}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        {/if}
      </div>
      <div class="flex-1 text-sm font-body-md">{message}</div>
      <button
        class="flex-shrink-0 text-on-surface-variant hover:text-on-surface transition-colors"
        on:click={handleClose}
        aria-label="Close"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
{/if}

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
</style>
