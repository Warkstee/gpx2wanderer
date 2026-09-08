/**
 * Server-side layout data loading for authentication.
 * 
 * This load function runs before the layout renders, enabling:
 * - Authentication checks: verifies user session before rendering protected routes
 * - Server-side execution: runs on the server for security and performance
 * - Type safety: SvelteKit auto-generates types for layout data
 * - Data passing: makes user data available to all child routes via the layout
 * 
 */
import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { get } from '$lib/api';

export const load: LayoutLoad = async ({ url }) => {
  // Skip auth check on login page
  if (url.pathname === '/login') {
    return { user: null };
  }

  // Check session status
  const result = await get<{ authenticated: boolean; user: { username: string; loggedInAt: string } }>('/api/auth/me');

  if (result.error || !result.data?.authenticated) {
    // Not authenticated - redirect to login
    redirect(302, '/login');
  }

  return { user: result.data.user };
};
