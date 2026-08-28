/**
 * TypeScript types for Strava API responses
 *
 * Based on the Strava API v3 Swagger spec:
 * https://developers.strava.com/swagger/swagger.json
 */

/**
 * Summary representation of an athlete.
 * Returned by GET /athlete (summary) and in nested objects.
 */
export interface SummaryAthlete {
  id: number;
  resource_state: number;
  firstname: string;
  lastname: string;
  profile_medium?: string;
  profile?: string;
  city?: string;
  state?: string;
  country?: string;
  sex?: string;
  premium?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Detailed representation of the authenticated athlete.
 * Returned by GET /athlete with profile:read_all scope.
 */
export interface DetailedAthlete extends SummaryAthlete {
  username?: string;
  badge_type_id?: number;
  follower_count?: number;
  friend_count?: number;
  mutual_friend_count?: number;
  athlete_type?: number; // 0 = cyclist, 1 = runner
  date_preference?: string;
  measurement_preference?: string;
  ftp?: number | null;
  weight?: number;
}

/**
 * Token response from POST /oauth/token.
 * Returned on both initial authorization and token refresh.
 */
export interface TokenResponse {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix epoch seconds
  expires_in: number; // Seconds until expiry
  athlete?: SummaryAthlete;
}

/**
 * Route type enum values from Strava.
 */
export type RouteType = 1 | 2 | 3 | 4;
// 1 = Ride, 2 = Run, 3 = Hike, 4 = Walk (and others)

/**
 * Polyline map data for a route.
 */
export interface RouteMap {
  id: string;
  polyline?: string;
  summary_polyline?: string;
  resource_state: number;
}

/**
 * Route summary from GET /athletes/{id}/routes.
 */
export interface RouteSummary {
  id: number;
  resource_state: number;
  name: string;
  description?: string;
  athlete: SummaryAthlete;
  distance: number; // meters
  elevation_gain: number; // meters
  map: RouteMap;
  type: RouteType;
  sub_type?: number;
  private: boolean;
  starred: boolean;
  timestamp: number; // Unix epoch seconds
  estimated_moving_time?: number; // seconds
  segments?: unknown[]; // Detailed segment data (not used for listing)
}

/**
 * Detailed route from GET /routes/{id}.
 */
export interface Route extends RouteSummary {
  // Additional fields available in detailed view
  created_at?: string;
  updated_at?: string;
}
