<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'destructive' | 'ghost' = 'primary';
  export let size: 'sm' | 'md' = 'md';
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled: boolean = false;
  export let loading: boolean = false;
  
  let baseClasses = 'font-medium rounded transition-all duration-150 flex items-center justify-center gap-2 active:scale-95';
  
  let variantClasses = '';
  if (variant === 'primary') {
    variantClasses = 'bg-primary text-on-primary hover:bg-primary-container shadow-lg shadow-primary/10';
  } else if (variant === 'secondary') {
    variantClasses = 'bg-surface-container border border-outline-variant text-white hover:bg-surface-container-high hover:border-secondary';
  } else if (variant === 'destructive') {
    variantClasses = 'bg-surface-container-high border border-red-500 text-red-400 hover:bg-red-500 hover:text-white';
  } else if (variant === 'ghost') {
    variantClasses = 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-white';
  }
  
  let sizeClasses = '';
  if (size === 'sm') {
    sizeClasses = 'px-3 py-1.5 text-xs';
  } else {
    sizeClasses = 'px-4 py-2.5 text-sm';
  }
</script>

<button
  {type}
  {disabled}
  class="{baseClasses} {variantClasses} {sizeClasses}"
  class:opacity-50={disabled || loading}
  class:cursor-not-allowed={disabled}
  on:click
>
  {#if loading}
    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  {/if}
  <slot />
</button>
