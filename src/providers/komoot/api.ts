/**
 * Komoot API client
 *
 * Handles authentication and API requests to Komoot's unpublished REST API.
 * Based on the Wanderer plugin's komoot client implementation.
 */

import type { ToursResponse, TourSummary } from './types.js';
import * as logger from '../../utils/logger.js';

const KOMOOT_API_BASE = 'https://api.komoot.de';

/** Delay in milliseconds between paginated requests to avoid rate limiting */
const PAGINATION_DELAY_MS = 250;

/**
 * Response from the Komoot login endpoint.
 * The "password" field is actually an API token, not the user's real password.
 */
interface LoginResponse {
  username: string; // User ID for subsequent API calls
  password: string; // API token for authentication
  locale?: string;
}

/**
 * Result of a successful login.
 */
export interface LoginResult {
  userID: string;
  token: string;
  locale?: string;
}

/**
 * Build HTTP Basic Auth header value.
 */
function basicAuth(username: string, password: string): string {
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Authenticate with Komoot and obtain an API token.
 *
 * Makes a GET request to /v006/account/email/{email}/ with HTTP Basic Auth.
 * The response contains a long-lived API token (in the "password" field)
 * and the user's Komoot user ID.
 *
 * @param email - User's Komoot email address
 * @param password - User's Komoot password
 * @returns Login result with userID and API token
 * @throws Error if authentication fails
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const url = `${KOMOOT_API_BASE}/v006/account/email/${encodeURIComponent(email)}/`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': basicAuth(email, password),
        'Accept': 'application/hal+json',
      },
    });
  } catch (err) {
    throw new Error(`Network error during login: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (response.status === 401) {
    throw new Error('Login failed — invalid email or password');
  }
  if (response.status === 429) {
    throw new Error('Rate limited by Komoot API — please wait and try again');
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Komoot login failed (${response.status}): ${body}`);
  }

  let data: LoginResponse;
  try {
    data = await response.json() as LoginResponse;
  } catch (err) {
    throw new Error(`Invalid JSON response from Komoot login: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!data.username || !data.password) {
    throw new Error('Komoot login response did not contain credentials');
  }

  return {
    userID: data.username,
    token: data.password,
    locale: data.locale,
  };
}

/**
 * Komoot API client for making authenticated requests.
 *
 * After login, all requests use the API token (not the original password)
 * for authentication via HTTP Basic Auth.
 */
export class KomootClient {
  constructor(
    private readonly email: string,
    private readonly userID: string,
    private readonly token: string,
  ) {}

  /**
   * Get the user's Komoot user ID.
   */
  getUserID(): string {
    return this.userID;
  }

  /**
   * Build request headers for API calls.
   */
  private getHeaders(): Record<string, string> {
    return {
      'Authorization': basicAuth(this.userID, this.token),
      'Accept': 'application/hal+json',
    };
  }

  /**
   * Make an authenticated GET request to the Komoot API.
   *
   * @param path - API path (e.g., "/v007/tours/123")
   * @returns Parsed JSON response
   * @throws Error if request fails (network error, HTTP error, or invalid JSON)
   */
  async get<T>(path: string): Promise<T> {
    const url = `${KOMOOT_API_BASE}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });
    } catch (err) {
      throw new Error(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (response.status === 404) {
      throw new Error('Tour not found or access denied');
    }
    if (response.status === 429) {
      throw new Error('Rate limited by Komoot API — please wait and try again');
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Komoot request failed (${response.status}): ${body}`);
    }

    try {
      return await response.json() as T;
    } catch (err) {
      throw new Error(`Invalid JSON response from Komoot: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Check if the client's token is still valid.
   * Makes a lightweight request to the user's profile endpoint.
   *
   * @returns true if token is valid, false if expired/invalid
   */
  async validate(): Promise<boolean> {
    try {
      await this.get(`/v007/users/${encodeURIComponent(this.userID)}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch a paginated list of the user's tours.
   *
   * @param page - Page number (1-based)
   * @param limit - Number of tours per page
   * @returns Tours response with embedded tours and pagination metadata
   */
  async listTours(page: number = 1, limit: number = 100): Promise<ToursResponse> {
    const query = new URLSearchParams({
      page: String(page),
      sort_field: 'date',
      sort_direction: 'desc',
      limit: String(limit),
    });

    return this.get<ToursResponse>(
      `/v007/users/${encodeURIComponent(this.userID)}/tours/?${query}`,
    );
  }

  /**
   * Fetch all tours with automatic pagination.
   * Includes a small delay between requests to avoid rate limiting.
   *
   * @param limit - Number of tours per page (default: 100)
   * @returns Array of all tours
   */
  async listAllTours(limit: number = 100): Promise<TourSummary[]> {
    const allTours: TourSummary[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      logger.debug(`Fetching tours page ${page}/${totalPages}...`);
      const response = await this.listTours(page, limit);
      
      // Handle missing _embedded field gracefully
      if (response._embedded?.tours) {
        allTours.push(...response._embedded.tours);
        logger.debug(`Found ${response._embedded.tours.length} tours on page ${page}`);
      } else {
        logger.debug(`No tours found on page ${page}`);
      }
      
      totalPages = response.page.totalPages;
      page++;

      // Add delay between requests to avoid rate limiting
      if (page <= totalPages) {
        await new Promise(resolve => setTimeout(resolve, PAGINATION_DELAY_MS));
      }
    } while (page <= totalPages);

    return allTours;
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
