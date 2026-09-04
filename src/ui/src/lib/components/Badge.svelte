<script lang="ts">
  export let variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' = 'neutral';
  export let label: string = '';
  export let pulsing: boolean = false;
</script>

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
