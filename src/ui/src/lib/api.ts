/**
 * API client utility for making authenticated requests to the backend
 */

export interface ApiError {
  error: string;
  message: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: `Request failed with status ${response.status}`
      }));
      return { error };
    }

    const data = await response.json();
    return { data };
  } catch (err) {
    return {
      error: {
        error: 'Network Error',
        message: err instanceof Error ? err.message : 'Unknown network error'
      }
    };
  }
}

/**
 * GET request helper
 */
export async function get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  });
}

/**
 * PUT request helper
 */
export async function put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined
  });
}

/**
 * DELETE request helper
 */
export async function del<T = any>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}
