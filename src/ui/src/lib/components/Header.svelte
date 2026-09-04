<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { post } from '$lib/api';
  
  const navItems = [
    { href: '/dashboard', label: 'Routes' },
    { href: '/credentials', label: 'Credentials' },
    { href: '/logs', label: 'Logs' }
  ];

  async function handleLogout() {
    await post('/api/auth/logout');
    goto('/login');
  }
</script>

<header class="h-16 border-b border-outline-variant/60 bg-surface/90 backdrop-blur-md flex items-center justify-between shrink-0 sticky top-0 z-50 px-16">
  <div class="flex items-center gap-8">
    <a href="/" class="flex items-center gap-2.5 group">
      <div class="w-7 h-7 flex items-center justify-center shrink-0">
        <svg fill="#10B981" height="26px" stroke="#10B981" viewBox="0 0 188.111 188.111" width="26px">
          <g>
            <path d="M122.735,55.676L53.951,82.395c-2.797,1.086-4.677,3.736-4.78,6.735c-0.103,2.999,1.592,5.771,4.309,7.045l26.172,12.286 l12.291,26.172c1.239,2.638,3.888,4.312,6.788,4.312c0.086,0,0.172-0.001,0.258-0.004c2.999-0.103,5.647-1.983,6.734-4.78 l26.719-68.778c1.076-2.771,0.414-5.917-1.688-8.019C128.651,55.262,125.503,54.6,122.735,55.676z M98.079,112.413l-6.001-12.778 c-0.744-1.584-2.018-2.858-3.602-3.601l-12.773-5.996l36.59-14.213L98.079,112.413z"></path>
            <path d="M94.052,0C42.192,0.001,0.001,42.194,0.001,94.055c0,51.862,42.191,94.056,94.052,94.056 c51.864-0.001,94.058-42.194,94.058-94.056C188.111,42.193,145.916,0,94.052,0z M94.052,173.111 c-43.589-0.001-79.052-35.465-79.052-79.057c0-43.59,35.462-79.054,79.052-79.055c43.593,0,79.058,35.464,79.058,79.056 C173.111,137.646,137.645,173.11,94.052,173.111z"></path>
          </g>
        </svg>
      </div>
      <div class="flex items-center">
        <span class="font-medium text-white tracking-tight text-base">Wanderer</span>
        <span class="text-emerald-400 font-medium ml-1.5 text-sm tracking-normal">// Route Sync</span>
      </div>
    </a>
    <nav class="hidden md:flex items-center gap-1.5">
      {#each navItems as item}
        <a 
          href={item.href}
          class="px-3 py-1.5 text-[13px] rounded transition-colors {$page.url.pathname === item.href ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-white'}"
        >
          {item.label}
        </a>
      {/each}
    </nav>
  </div>
  <div class="flex items-center gap-3">
    <div class="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center text-on-surface-variant hover:text-white hover:border-outline transition-colors cursor-pointer" title="User profile">
      <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
    </div>
    <button
      on:click={handleLogout}
      aria-label="Sign Out"
      class="text-on-surface-variant hover:text-red-400 transition-colors flex items-center justify-center p-1"
      title="Sign Out"
    >
      <svg class="w-[20px] h-[20px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
      </svg>
    </button>
  </div>
</header>
