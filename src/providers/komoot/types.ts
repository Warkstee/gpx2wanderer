/**
 * TypeScript types for Komoot API responses
 */

/** Difficulty information from the tour response */
export interface TourDifficulty {
  grade: string;
  explanation_technical?: string;
  explanation_fitness?: string;
}

/**
 * Tour summary from the tours list endpoint.
 * Contains basic metadata about a tour without full coordinate data.
 */
export interface TourSummary {
  id: number;
  name: string;
  distance: number; // meters
  duration: number; // seconds
  sport: string;
  date: string; // ISO 8601
  type: string; // "tour_recorded" or "tour_planned"
  elevation_up: number; // meters
  elevation_down: number; // meters
  difficulty?: TourDifficulty;
}

/**
 * Pagination metadata from the API response.
 */
export interface PageMetadata {
  page: number;
  totalPages: number;
  totalElements: number;
}

/**
 * Response from GET /v007/users/{userID}/tours/
 */
export interface ToursResponse {
  _embedded?: {
    tours: TourSummary[];
  };
  page: PageMetadata;
}

/**
 * A single coordinate point in the dense track
 */
export interface CoordinateItem {
  lat: number;
  lng: number;
  alt: number;
  t: number; // elapsed time in milliseconds from start
}

/**
 * Embedded coordinates structure from the API response
 */
export interface EmbeddedCoordinates {
  items: CoordinateItem[];
}

/**
 * Response from GET /v007/tours/{id}
 * Contains full tour data with embedded coordinates
 */
export interface TourResponse {
  id: number;
  name: string;
  date: string;
  duration: number;
  sport: string;
  distance: number;
  elevation_up: number;
  elevation_down: number;
  type: string;
  difficulty?: TourDifficulty;
  _embedded?: {
    coordinates?: EmbeddedCoordinates;
  };
  [key: string]: unknown;
}
