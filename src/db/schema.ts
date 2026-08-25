/**
 * Database schema definitions for gpx2wanderer
 */

export const SCHEMA_VERSION = 1;

export const CREATE_CREDENTIALS_TABLE = `
  CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL UNIQUE,
    encrypted_data TEXT NOT NULL,
    iv TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

export const CREATE_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`;

export const CREATE_IMPORT_HISTORY_TABLE = `
  CREATE TABLE IF NOT EXISTS import_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_provider TEXT,
    source_id TEXT,
    gpx_file_path TEXT NOT NULL,
    waypoints_generated INTEGER,
    max_divergence_meters REAL,
    valhalla_iterations INTEGER,
    wanderer_trail_id TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT
  )
`;

export const CREATE_SCHEMA_VERSION_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  )
`;

export const ALL_TABLES = [
  CREATE_SCHEMA_VERSION_TABLE,
  CREATE_CREDENTIALS_TABLE,
  CREATE_SETTINGS_TABLE,
  CREATE_IMPORT_HISTORY_TABLE,
];
