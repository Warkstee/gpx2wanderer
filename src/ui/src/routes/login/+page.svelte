<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Input from '$lib/components/Input.svelte';
  import Button from '$lib/components/Button.svelte';
</script>

<div class="h-full flex flex-col justify-between items-center min-h-screen antialiased bg-background text-on-surface p-4">
  <!-- Subtle Top Branding -->
  <header class="w-full max-w-5xl flex items-center justify-between py-6 px-4">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 flex items-center justify-center">
        <svg fill="#10B981" height="32px" stroke="#10B981" viewBox="0 0 188.111 188.111" width="32px">
          <g>
            <path d="M122.735,55.676L53.951,82.395c-2.797,1.086-4.677,3.736-4.78,6.735c-0.103,2.999,1.592,5.771,4.309,7.045l26.172,12.286 l12.291,26.172c1.239,2.638,3.888,4.312,6.788,4.312c0.086,0,0.172-0.001,0.258-0.004c2.999-0.103,5.647-1.983,6.734-4.78 l26.719-68.778c1.076-2.771,0.414-5.917-1.688-8.019C128.651,55.262,125.503,54.6,122.735,55.676z M98.079,112.413l-6.001-12.778 c-0.744-1.584-2.018-2.858-3.602-3.601l-12.773-5.996l36.59-14.213L98.079,112.413z"></path>
            <path d="M94.052,0C42.192,0.001,0.001,42.194,0.001,94.055c0,51.862,42.191,94.056,94.052,94.056 c51.864-0.001,94.058-42.194,94.058-94.056C188.111,42.193,145.916,0,94.052,0z M94.052,173.111 c-43.589-0.001-79.052-35.465-79.052-79.057c0-43.59,35.462-79.054,79.052-79.055c43.593,0,79.058,35.464,79.058,79.056 C173.111,137.646,137.645,173.11,94.052,173.111z"></path>
          </g>
        </svg>
      </div>
      <span class="text-sm font-semibold tracking-wide text-on-surface-variant">Wanderer <span class="text-primary font-normal">// Route Sync</span></span>
    </div>
    <div class="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
      <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
      <span>System Ready</span>
    </div>
  </header>

  <!-- Centralized Login Card -->
  <main class="w-full flex items-center justify-center my-auto">
    <div class="w-full max-w-[420px] bg-surface-container-low border border-outline-variant rounded-xl shadow-2xl p-8 relative overflow-hidden backdrop-blur-sm">
      <!-- Top Accent Line -->
      <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"></div>

      <!-- Modal Header -->
      <div class="flex flex-col items-center text-center mb-7">
        <div class="w-14 h-14 flex items-center justify-center mb-4">
          <svg fill="#10B981" height="56px" stroke="#10B981" viewBox="0 0 188.111 188.111" width="56px">
            <g>
              <path d="M122.735,55.676L53.951,82.395c-2.797,1.086-4.677,3.736-4.78,6.735c-0.103,2.999,1.592,5.771,4.309,7.045l26.172,12.286 l12.291,26.172c1.239,2.638,3.888,4.312,6.788,4.312c0.086,0,0.172-0.001,0.258-0.004c2.999-0.103,5.647-1.983,6.734-4.78 l26.719-68.778c1.076-2.771,0.414-5.917-1.688-8.019C128.651,55.262,125.503,54.6,122.735,55.676z M98.079,112.413l-6.001-12.778 c-0.744-1.584-2.018-2.858-3.602-3.601l-12.773-5.996l36.59-14.213L98.079,112.413z"></path>
              <path d="M94.052,0C42.192,0.001,0.001,42.194,0.001,94.055c0,51.862,42.191,94.056,94.052,94.056 c51.864-0.001,94.058-42.194,94.058-94.056C188.111,42.193,145.916,0,94.052,0z M94.052,173.111 c-43.589-0.001-79.052-35.465-79.052-79.057c0-43.59,35.462-79.054,79.052-79.055c43.593,0,79.058,35.464,79.058,79.056 C173.111,137.646,137.645,173.11,94.052,173.111z"></path>
            </g>
          </svg>
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-white">Sign In</h1>
        <p class="text-sm text-on-surface-variant mt-1.5">Enter your credentials to access the sync dashboard</p>
      </div>

      <!-- Login Form Placeholder -->
      <div class="text-center py-8 text-on-surface-variant">
        <p class="text-sm mb-4">Login implementation will be completed in GPWA-36</p>
        <p class="text-xs">This placeholder shows the layout structure</p>
      </div>
    </div>
  </main>

  <!-- Minimal Footer -->
  <footer class="w-full max-w-5xl py-4 px-4 flex items-center justify-between text-xs text-on-surface-variant border-t border-outline-variant/40">
    <div class="flex items-center gap-4">
      <span>Wanderer Route Sync • v0.1</span>
    </div>
    <div class="flex items-center gap-4">
      <span class="hover:text-on-surface transition-colors cursor-pointer">Documentation</span>
      <span class="hover:text-on-surface transition-colors cursor-pointer">Privacy</span>
    </div>
  </footer>
</div>
