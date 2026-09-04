<script lang="ts">
  export let title: string = '';
  export let subtitle: string = '';
  export let icon: string = '';
  export let status: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral';
  export let statusLabel: string = '';
</script>

<div class="bg-surface-container-low rounded-xl border border-outline-variant p-6 sm:p-7 shadow-sm transition-all duration-200 hover:border-surface-bright">
  {#if title}
    <div class="flex items-center justify-between pb-5 mb-5 border-b border-outline-variant/60">
      <div class="flex items-center gap-3">
        {#if icon}
          <div class="w-10 h-10 rounded-lg bg-surface border border-outline-variant/70 flex items-center justify-center text-primary shadow-sm">
            <span class="text-[22px]">{icon}</span>
          </div>
        {/if}
        <div class="flex items-center gap-3">
          <span class="text-base font-semibold text-white tracking-tight">{title}</span>
          {#if statusLabel}
            <span 
              class="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[11px] font-medium {status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : status === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : status === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : status === 'info' ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-surface-container-high border-outline-variant text-on-surface-variant'}"
            >
              {#if status === 'success'}
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              {:else if status === 'info'}
                <span class="w-1.5 h-1.5 rounded-full bg-sky-400 mr-1.5"></span>
              {/if}
              {statusLabel}
            </span>
          {/if}
        </div>
      </div>
      <slot name="actions" />
    </div>
  {/if}
  
  {#if subtitle}
    <p class="text-sm text-on-surface-variant mb-4">{subtitle}</p>
  {/if}
  
  <slot />
</div>
