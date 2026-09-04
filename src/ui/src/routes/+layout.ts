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
