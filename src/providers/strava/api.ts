/**
 * Strava API client
 *
 * Handles OAuth2 token refresh and API requests to the Strava v3 REST API.
 * Access tokens are obtained transparently via refresh tokens and cached
 * in memory for the session. The refresh token is persisted (rotated) on
 * each successful refresh.
 */

import type { DetailedAthlete, TokenResponse, RouteSummary, Route } from './types.js';
import { loadStravaCredentials, saveStravaCredentials, type StravaCredentials } from '../auth/credentials.js';
import * as logger from '../../utils/logger.js';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_OAUTH_BASE = 'https://www.strava.com/api/v3/oauth';

/** Delay in milliseconds between paginated requests to avoid rate limiting */
const PAGINATION_DELAY_MS = 250;

/**
 * Result of a successful token refresh.
 */
export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Refresh an expired (or soon-to-expire) access token using the stored
 * refresh token. Persists the new refresh token to the encrypted credential
 * store (Strava rotates refresh tokens on every refresh).
 *
 * @param credentials - Current stored credentials (clientId, clientSecret, refreshToken)
 * @returns New token response with access_token, refresh_token, and expires_at
 * @throws Error if the refresh request fails
 */
export async function refreshAccessToken(credentials: StravaCredentials): Promise<TokenResponse> {
  const url = `${STRAVA_OAUTH_BASE}/token`;

  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (err) {
    throw new Error(`Network error during token refresh: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (response.status === 401) {
    throw new Error('Token refresh failed — refresh token is invalid or revoked');
  }
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${errorBody}`);
  }

  let data: TokenResponse;
  try {
    data = await response.json() as TokenResponse;
  } catch (err) {
    throw new Error(`Invalid JSON response from token refresh: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!data.access_token || !data.refresh_token) {
    throw new Error('Token refresh response did not contain tokens');
  }

  // Persist the rotated refresh token
  saveStravaCredentials({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    refreshToken: data.refresh_token,
  });

  return data;
}

/**
 * Strava API client for making authenticated requests.
 *
 * Manages an in-memory access token that is transparently refreshed when
 * expired. The refresh token is persisted on each refresh (Strava rotates
 * refresh tokens).
 */
export class StravaClient {
  private accessToken: string | null = null;
  private expiresAt: number = 0;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private refreshToken: string,
  ) {}

  /**
   * Create a StravaClient from stored credentials.
   * Loads credentials from the encrypted store and returns a client instance.
   *
   * @returns A new StravaClient, or null if no stored credentials exist
   */
  static fromStoredCredentials(): StravaClient | null {
    const creds = loadStravaCredentials();
    if (!creds) return null;

    return new StravaClient(creds.clientId, creds.clientSecret, creds.refreshToken);
  }

  /**
   * Ensure we have a valid access token, refreshing if necessary.
   *
   * Strava recommends refreshing tokens that expire in less than 1 hour.
   * We use a 2-hour buffer to be safe.
   *
   * @returns A valid access token
   * @throws Error if token refresh fails
   */
  private async ensureAccessToken(): Promise<string> {
    const TWO_HOURS_SECONDS = 7200;
    const now = Math.floor(Date.now() / 1000);

    if (this.accessToken && this.expiresAt - now > TWO_HOURS_SECONDS) {
      return this.accessToken;
    }

    logger.debug('Access token expired or missing — refreshing...');
    const tokenResponse = await refreshAccessToken({
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      refreshToken: this.refreshToken,
    });

    this.accessToken = tokenResponse.access_token;
    this.expiresAt = tokenResponse.expires_at;
    this.refreshToken = tokenResponse.refresh_token;

    logger.debug(`Token refreshed — expires at ${new Date(tokenResponse.expires_at * 1000).toISOString()}`);
    return this.accessToken;
  }

  /**
   * Build request headers with Bearer authentication.
   */
  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.ensureAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
  }

  /**
   * Make an authenticated GET request to the Strava API.
   *
   * If the request returns 401, the access token is refreshed and the
   * request is retried once.
   *
   * @param path - API path (e.g., "/athlete" or "/athletes/123/routes")
   * @param params - Optional query parameters
   * @returns Parsed JSON response
   * @throws Error if request fails after retry
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${STRAVA_API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers = await this.getHeaders();

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });
    } catch (err) {
      throw new Error(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // On 401, refresh token and retry once
    if (response.status === 401) {
      logger.debug('Got 401 — forcing token refresh and retrying...');
      this.accessToken = null;
      this.expiresAt = 0;

      const retryHeaders = await this.getHeaders();
      try {
        response = await fetch(url.toString(), {
          method: 'GET',
          headers: retryHeaders,
        });
      } catch (err) {
        throw new Error(`Network error on retry: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (response.status === 404) {
      throw new Error('Resource not found or access denied');
    }
    if (response.status === 429) {
      throw new Error('Rate limited by Strava API — please wait and try again');
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Strava request failed (${response.status}): ${body}`);
    }

    try {
      return await response.json() as T;
    } catch (err) {
      throw new Error(`Invalid JSON response from Strava: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Validate that the credentials are working by fetching the authenticated athlete.
   *
   * @returns The authenticated athlete's profile, or null if authentication fails
   */
  async validate(): Promise<DetailedAthlete | null> {
    try {
      return await this.get<DetailedAthlete>('/athlete');
    } catch {
      return null;
    }
  }

  /**
   * Get the authenticated athlete's profile.
   *
   * @returns Detailed athlete information including the athlete ID
   */
  async getAthlete(): Promise<DetailedAthlete> {
    return this.get<DetailedAthlete>('/athlete');
  }

  /**
   * Fetch a paginated list of the athlete's routes.
   *
   * @param athleteId - The athlete's ID
   * @param page - Page number (1-based)
   * @param perPage - Number of routes per page (max 200)
   * @returns Array of route summaries
   */
  async listRoutes(athleteId: number, page: number = 1, perPage: number = 30): Promise<RouteSummary[]> {
    return this.get<RouteSummary[]>(
      `/athletes/${athleteId}/routes`,
      { page: String(page), per_page: String(perPage) },
    );
  }

  /**
   * Fetch all routes with automatic pagination.
   * Includes a small delay between requests to avoid rate limiting.
   *
   * @param athleteId - The athlete's ID
   * @param perPage - Number of routes per page (default: 30)
   * @returns Array of all routes
   */
  async listAllRoutes(athleteId: number, perPage: number = 30): Promise<RouteSummary[]> {
    const allRoutes: RouteSummary[] = [];
    let page = 1;

    logger.debug(`Fetching routes for athlete ${athleteId}...`);

    while (true) {
      logger.debug(`Fetching routes page ${page}...`);
      const routes = await this.listRoutes(athleteId, page, perPage);

      if (routes.length === 0) {
        break;
      }

      allRoutes.push(...routes);
      logger.debug(`Found ${routes.length} routes on page ${page}`);

      // If we got fewer than perPage, we've reached the last page
      if (routes.length < perPage) {
        break;
      }

      page++;

      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, PAGINATION_DELAY_MS));
    }

    return allRoutes;
  }

  /**
   * Get detailed route information including metadata.
   *
   * @param routeId - The route ID (use string to avoid precision loss)
   * @returns Detailed route information
   */
  async getRouteDetails(routeId: string): Promise<Route> {
    return this.get<Route>(`/routes/${routeId}`);
  }

  /**
   * Download a route as GPX XML.
   *
   * @param routeId - The route ID to download (use string to avoid precision loss)
   * @returns GPX XML string
   */
  async exportRouteGpx(routeId: string): Promise<string> {
    const url = `${STRAVA_API_BASE}/routes/${routeId}/export_gpx`;
    const headers = await this.getHeaders();

    let response: Response;
    try {
      response = await fetch(url, { method: 'GET', headers });
    } catch (err) {
      throw new Error(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // On 401, refresh token and retry once
    if (response.status === 401) {
      logger.debug('Got 401 on GPX export — forcing token refresh and retrying...');
      this.accessToken = null;
      this.expiresAt = 0;

      const retryHeaders = await this.getHeaders();
      try {
        response = await fetch(url, { method: 'GET', headers: retryHeaders });
      } catch (err) {
        throw new Error(`Network error on retry: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (response.status === 404) {
      throw new Error(`Route ${routeId} not found or access denied`);
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GPX export failed (${response.status}): ${body}`);
    }

    return response.text();
  }

  /**
   * Check if an error indicates an authentication failure (401).
   */
  static isAuthError(error: unknown): boolean {
    if (error instanceof Error && error.message.includes('(401)')) {
      return true;
    }
    return false;
  }
}
