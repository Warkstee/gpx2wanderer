<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open: boolean = false;
  export let title: string = 'Confirm Action';
  export let message: string = '';
  export let confirmLabel: string = 'Confirm';
  export let cancelLabel: string = 'Cancel';
  export let variant: 'warning' | 'danger' | 'info' = 'warning';

  const dispatch = createEventDispatcher<{ confirm: void; cancel: void }>();

  function handleConfirm() {
    dispatch('confirm');
    open = false;
  }

  function handleCancel() {
    dispatch('cancel');
    open = false;
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
  >
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <button
      type="button"
      class="absolute inset-0 cursor-default"
      tabindex="-1"
      aria-label="Close dialog"
      on:click={handleCancel}
    ></button>
    <div
      class="relative bg-surface-container border border-outline-variant rounded-lg shadow-xl max-w-md w-full animate-scale-in"
    >
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            {#if variant === 'warning'}
              <div class="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <svg class="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            {:else if variant === 'danger'}
              <div class="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            {:else}
              <div class="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                <svg class="w-6 h-6 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            {/if}
          </div>
          <div class="flex-1">
            <h3 id="dialog-title" class="text-lg font-semibold text-white mb-2">{title}</h3>
            <p class="text-sm text-on-surface-variant leading-relaxed">{message}</p>
          </div>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 p-4 border-t border-outline-variant bg-surface-container-low">
        <button
          class="px-4 py-2 text-sm font-body-md text-on-surface-variant hover:text-on-surface transition-colors"
          on:click={handleCancel}
        >
          {cancelLabel}
        </button>
        <button
          class="px-4 py-2 text-sm font-body-md font-medium rounded border transition-colors {variant === 'warning'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            : variant === 'danger'
              ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'}"
          on:click={handleConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes scale-in {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }

  .animate-scale-in {
    animation: scale-in 0.2s ease-out;
  }
</style>
