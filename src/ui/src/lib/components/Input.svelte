<script lang="ts">
  export let type: 'text' | 'password' = 'text';
  export let label: string = '';
  export let value: string = '';
  export let placeholder: string = '';
  export let icon: string = '';
  export let showToggle: boolean = false;
  
  let visible = type !== 'password';
  
  function toggleVisibility() {
    visible = !visible;
  }
</script>

<div>
  {#if label}
    <label class="block font-mono text-[11px] uppercase tracking-wider text-on-surface-variant mb-1.5">
      {label}
    </label>
  {/if}
  <div class="relative flex items-center">
    {#if icon}
      <span class="absolute left-3.5 text-outline text-[18px]">{icon}</span>
    {/if}
    {#if type === 'password' && !visible}
      <input
        type="password"
        bind:value
        {placeholder}
        class="w-full h-11 bg-surface border border-outline-variant text-white rounded-lg font-mono text-sm focus:outline-none focus:border-primary transition-colors"
        class:pl-11={icon}
        class:pl-4={!icon}
        class:pr-11={showToggle}
        class:pr-4={!showToggle}
        style="font-variant-ligatures: none;"
      />
    {:else}
      <input
        type="text"
        bind:value
        {placeholder}
        class="w-full h-11 bg-surface border border-outline-variant text-white rounded-lg font-mono text-sm focus:outline-none focus:border-primary transition-colors"
        class:pl-11={icon}
        class:pl-4={!icon}
        class:pr-11={showToggle}
        class:pr-4={!showToggle}
        style="font-variant-ligatures: none;"
      />
    {/if}
    {#if showToggle}
      <button 
        type="button"
        on:click={toggleVisibility}
        class="absolute right-2 p-2 rounded text-outline hover:text-white transition-colors"
        title="Toggle visibility"
      >
        {#if visible}
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
        {:else}
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
          </svg>
        {/if}
      </button>
    {/if}
  </div>
</div>
