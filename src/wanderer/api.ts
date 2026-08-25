/**
 * Wanderer API client
 * 
 * Handles authentication and API requests to a self-hosted Wanderer instance.
 * Wanderer uses cookie-based authentication via the /api/v1/auth/login endpoint.
 */

import * as logger from '../utils/logger.js';

/**
 * Result of a successful Wanderer login.
 */
export interface LoginResult {
  /** Session cookie string for subsequent requests */
  cookie: string;
  /** User ID (15 chars) from the pb_auth cookie record */
  userID: string;
}

/**
 * Authenticate with Wanderer and obtain a session cookie.
 * 
 * Makes a POST request to /api/v1/auth/login with username and password.
 * The response sets a session cookie that must be sent with subsequent requests.
 * 
 * @param host - Wanderer instance base URL (e.g. "http://localhost:3000")
 * @param username - User's Wanderer username or email
 * @param password - User's Wanderer password
 * @returns Login result with session cookie and user ID
 * @throws Error if authentication fails
 */
export async function login(host: string, username: string, password: string): Promise<LoginResult> {
  const url = `${host}/api/v1/auth/login`;
  
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
  } catch (err) {
    throw new Error(`Network error during Wanderer login: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('Wanderer login failed — invalid username or password');
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Wanderer login failed (${response.status}): ${body}`);
  }

  // Extract the session cookie from the Set-Cookie header.
  // The response may contain multiple cookies (e.g., meilisearch_token and pb_auth).
  // We need to extract all of them and send them back on subsequent requests.
  const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
  let cookieStrings: string[];

  if (setCookieHeaders.length === 0) {
    // Fallback for environments that don't support getSetCookie()
    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) {
      throw new Error('Wanderer login response did not contain a session cookie');
    }
    // Parse multiple cookies from the header (separated by comma, but be careful with dates)
    const cookies = setCookieHeader.split(/,(?=\s*[a-zA-Z0-9_]+=)/);
    cookieStrings = cookies.map(c => c.split(';')[0].trim());
  } else {
    // Extract just the name=value part from each cookie
    cookieStrings = setCookieHeaders.map(c => c.split(';')[0].trim());
  }

  const cookie = cookieStrings.join('; ');

  // Extract the user ID from the pb_auth cookie
  // The pb_auth cookie contains a JSON object with a "record" field that has the user's "id"
  const pbAuthCookie = cookieStrings.find(c => c.startsWith('pb_auth='));
  let userID = '';
  
  if (pbAuthCookie) {
    try {
      // Decode the URL-encoded cookie value
      const decoded = decodeURIComponent(pbAuthCookie.substring('pb_auth='.length));
      const pbAuth = JSON.parse(decoded);
      userID = pbAuth.record?.id ?? '';
      logger.debug(`Extracted user ID from pb_auth: ${userID}`);
    } catch (err) {
      logger.debug(`Failed to parse pb_auth cookie: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!userID) {
    throw new Error('Failed to extract user ID from login response');
  }

  return { cookie, userID };
}

/**
 * Validate whether a cached session cookie is still valid.
 * 
 * Makes a lightweight authenticated request to check if the cookie works.
 * Uses the /api/v1/collections endpoint as a probe — it requires authentication
 * but returns quickly with minimal data.
 * 
 * @param host - Wanderer instance base URL
 * @param cookie - Session cookie to validate
 * @returns true if the cookie is valid, false otherwise
 */
export async function validateCookie(host: string, cookie: string): Promise<boolean> {
  const url = `${host}/api/v1/collections`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
      },
    });

    // 200 means the cookie is valid
    // 401/403 means the cookie has expired or is invalid
    return response.ok;
  } catch {
    // Network error or other failure — treat as invalid
    return false;
  }
}

/**
 * Response from the trail upload endpoint.
 */
export interface TrailUploadResponse {
  id: string;
  name: string;
  description?: string;
  location?: string;
  author: string;
  date?: string;
  public: boolean;
  difficulty?: 'easy' | 'moderate' | 'difficult';
  lat?: number;
  lon?: number;
  distance?: number;
  elevation_gain?: number;
  elevation_loss?: number;
  duration?: number;
  photos?: string[];
  thumbnail?: number;
  like_count: number;
  category?: string;
  subcategory?: string;
  tags?: string[];
  gpx?: string;
  created: string;
  updated: string;
}

/**
 * Upload a GPX file to Wanderer and create a new trail.
 * 
 * Makes a PUT request to /api/v1/trail/upload with the GPX file as multipart/form-data.
 * Wanderer will parse the GPX, extract trail metadata, and perform duplicate detection.
 * 
 * @param host - Wanderer instance base URL
 * @param cookie - Session cookie for authentication
 * @param gpxContent - GPX XML content as a string
 * @param name - Trail name (optional, Wanderer will infer from GPX if not provided)
 * @param ignoreDuplicates - If true, skip duplicate detection (default: false)
 * @returns Trail object with id, name, distance, elevation, etc.
 * @throws Error if upload fails
 */
export async function uploadTrail(
  host: string,
  cookie: string,
  gpxContent: string,
  name?: string,
  ignoreDuplicates: boolean = false,
): Promise<TrailUploadResponse> {
  const url = `${host}/api/v1/trail/upload`;

  // Build multipart/form-data
  const formData = new FormData();

  // Add the GPX file as a Blob
  const gpxBlob = new Blob([gpxContent], { type: 'application/gpx+xml' });
  formData.append('file', gpxBlob, 'trail.gpx');

  // Add optional name field
  if (name) {
    formData.append('name', name);
  }

  // Add ignoreDuplicates flag
  formData.append('ignoreDuplicates', String(ignoreDuplicates));

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Cookie': cookie,
      },
      body: formData,
    });
  } catch (err) {
    throw new Error(`Network error during trail upload: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (response.status === 400) {
    const body = await response.text();
    throw new Error(`Invalid or empty GPX file: ${body}`);
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error('Authentication failed — session cookie may have expired');
  }
  if (response.status === 500) {
    const body = await response.text();
    throw new Error(`Wanderer server error during upload: ${body}`);
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Trail upload failed (${response.status}): ${body}`);
  }

  let data: TrailUploadResponse;
  try {
    data = await response.json() as TrailUploadResponse;
  } catch (err) {
    throw new Error(`Invalid JSON response from trail upload: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!data.id || !data.name) {
    throw new Error('Trail upload response did not contain required fields (id, name)');
  }

  return data;
}

/**
 * Fetch all categories from the Wanderer API.
 * Results are cached to avoid repeated requests.
 */
const categoryCache = new Map<string, Array<{ id: string; name: string }>>();

export async function getCategories(host: string, cookie: string): Promise<Array<{ id: string; name: string }>> {
  const cacheKey = `${host}:${cookie}`;
  if (categoryCache.has(cacheKey)) {
    return categoryCache.get(cacheKey)!;
  }

  const url = `${host}/api/v1/category`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Cookie': cookie },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status}`);
  }

  const data = await response.json() as { items: Array<{ id: string; name: string }> };
  const categories = data.items;
  categoryCache.set(cacheKey, categories);
  return categories;
}

/**
 * Fetch all subcategories from the Wanderer API.
 * Results are cached to avoid repeated requests.
 */
const subcategoryCache = new Map<string, Array<{ id: string; name: string; category: string }>>();

export async function getSubcategories(host: string, cookie: string): Promise<Array<{ id: string; name: string; category: string }>> {
  const cacheKey = `${host}:${cookie}`;
  if (subcategoryCache.has(cacheKey)) {
    return subcategoryCache.get(cacheKey)!;
  }

  const url = `${host}/api/v1/subcategory`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Cookie': cookie },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subcategories: ${response.status}`);
  }

  const data = await response.json() as { items: Array<{ id: string; name: string; category: string }> };
  const subcategories = data.items;
  subcategoryCache.set(cacheKey, subcategories);
  return subcategories;
}

/**
 * Update an existing trail's metadata (category, difficulty, etc.).
 * 
 * Makes a POST request to /api/v1/trail/form/{id} with only the fields
 * that need to be updated. This is used after uploadTrail() to set
 * category and difficulty that the upload endpoint doesn't accept.
 * 
 * Category and subcategory names are resolved to IDs via the API.
 * 
 * @param host - Wanderer instance base URL
 * @param cookie - Session cookie for authentication
 * @param trailId - Trail ID returned from uploadTrail()
 * @param difficulty - Difficulty grade (easy, moderate, difficult)
 * @param categoryName - Category name (e.g., "Hiking", "Biking")
 * @param subcategoryName - Optional subcategory name (e.g., "MTB", "Road")
 * @throws Error if update fails
 */
export async function updateTrail(
  host: string,
  cookie: string,
  trailId: string,
  difficulty?: string,
  categoryName?: string,
  subcategoryName?: string,
): Promise<void> {
  const url = `${host}/api/v1/trail/form/${trailId}`;

  // Resolve category and subcategory names to IDs
  let categoryId: string | undefined;
  let subcategoryId: string | undefined;

  if (categoryName) {
    const categories = await getCategories(host, cookie);
    const category = categories.find(c => c.name === categoryName);
    if (category) {
      categoryId = category.id;
    } else {
      logger.debug(`Category "${categoryName}" not found`);
    }
  }

  if (subcategoryName && categoryId) {
    const subcategories = await getSubcategories(host, cookie);
    const subcategory = subcategories.find(s => s.name === subcategoryName && s.category === categoryId);
    if (subcategory) {
      subcategoryId = subcategory.id;
    } else {
      logger.debug(`Subcategory "${subcategoryName}" not found for category "${categoryName}"`);
    }
  }

  const formData = new FormData();

  formData.append('id', trailId);
  if (difficulty) formData.append('difficulty', difficulty);
  if (categoryId) formData.append('category', categoryId);
  if (subcategoryId) formData.append('subcategory', subcategoryId);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
      },
      body: formData,
    });
  } catch (err) {
    throw new Error(`Network error during trail update: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Trail update failed (${response.status}): ${body}`);
  }
}
