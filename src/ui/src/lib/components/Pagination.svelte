<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  /**
   * Reusable pagination component.
   * 
   * Supports two modes:
   * - totalPages mode: When total page count is known (e.g., unified routes endpoint)
   * - hasMore mode: When using offset-based pagination with unknown total (e.g., logs endpoint)
   * 
   * Uses 1-based page numbering for the public API (currentPage starts at 1).
   */

  /** Current page (1-based) */
  export let currentPage: number = 1;
  
  /** Total number of pages. Set to 0 or -1 when unknown (use hasMore instead). */
  export let totalPages: number = 0;
  
  /** Whether there are more pages after the current one. Used when totalPages is unknown. */
  export let hasMore: boolean = false;
  
  /** Maximum number of page buttons to show (excluding Previous/Next). Odd numbers look best. */
  export let maxPageButtons: number = 5;

  const dispatch = createEventDispatcher<{ pageChange: number }>();

  /** Whether we know the total page count */
  $: hasTotalPages = totalPages > 0;
  
  /** Whether Previous should be disabled */
  $: prevDisabled = currentPage <= 1;
  
  /** Whether Next should be disabled */
  $: nextDisabled = hasTotalPages ? currentPage >= totalPages : !hasMore;

  /**
   * Calculate which page numbers to show in the pagination bar.
   * Shows a window of pages around the current page, with ellipsis gaps.
   */
  $: pageNumbers = (() => {
    if (!hasTotalPages) return [];
    
    const pages: (number | 'ellipsis')[] = [];
    const total = totalPages;
    const current = currentPage;
    const max = maxPageButtons;

    if (total <= max) {
      // All pages fit
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate window around current page
      const windowStart = Math.max(2, current - Math.floor(max / 2));
      const windowEnd = Math.min(total - 1, windowStart + max - 3);
      
      // Adjust windowStart if we hit the end
      const adjustedWindowStart = Math.max(2, windowEnd - max + 3);

      if (adjustedWindowStart > 2) {
        pages.push('ellipsis');
      }

      for (let i = adjustedWindowStart; i <= windowEnd; i++) {
        pages.push(i);
      }

      if (windowEnd < total - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  })();

  function goToPage(page: number) {
    if (page < 1) return;
    if (hasTotalPages && page > totalPages) return;
    currentPage = page;
    dispatch('pageChange', currentPage);
  }

  function previousPage() {
    if (!prevDisabled) {
      goToPage(currentPage - 1);
    }
  }

  function nextPage() {
    if (!nextDisabled) {
      goToPage(currentPage + 1);
    }
  }
</script>

{#if hasTotalPages ? totalPages > 1 : true}
  <div class="flex items-center justify-between mt-4 px-2">
    {#if hasTotalPages}
      <div class="text-sm text-on-surface-variant font-mono">
        Page <span class="text-white font-semibold">{currentPage}</span> of <span class="text-white font-semibold">{totalPages}</span>
      </div>
    {:else}
      <div class="text-sm text-on-surface-variant font-mono">
        Page <span class="text-white font-semibold">{currentPage}</span>
      </div>
    {/if}
    
    <div class="flex items-center gap-1">
      <!-- Previous button -->
      <button
        on:click={previousPage}
        disabled={prevDisabled}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container-high text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        Previous
      </button>

      <!-- Page number buttons (only when totalPages is known) -->
      {#if hasTotalPages}
        {#each pageNumbers as pageNum}
          {#if pageNum === 'ellipsis'}
            <span class="px-1 text-on-surface-variant/60 font-mono text-xs">…</span>
          {:else}
            <button
              on:click={() => goToPage(pageNum)}
              class="w-7 h-7 flex items-center justify-center rounded font-mono text-xs transition-colors cursor-pointer"
              class:bg-primary={pageNum === currentPage}
              class:text-on-primary={pageNum === currentPage}
              class:font-bold={pageNum === currentPage}
              class:shadow-sm={pageNum === currentPage}
              class:hover:bg-surface-container-high={pageNum !== currentPage}
              class:text-slate-300={pageNum !== currentPage}
            >
              {pageNum}
            </button>
          {/if}
        {/each}
      {/if}

      <!-- Next button -->
      <button
        on:click={nextPage}
        disabled={nextDisabled}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-low border border-outline-variant hover:bg-surface-container-high text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    </div>
  </div>
{/if}
