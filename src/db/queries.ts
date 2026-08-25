/**
 * Database query operations
 */

import Database from 'better-sqlite3';
import { ALL_TABLES, SCHEMA_VERSION } from './schema.js';

let db: Database.Database | null = null;

/**
 * Initialize database connection and create tables if needed
 */
export function initializeDatabase(dbPath: string): Database.Database {
  if (db) {
    return db;
  }

  db = new Database(dbPath);
  
  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');
  
  // Create tables if they don't exist
  for (const createTable of ALL_TABLES) {
    db.exec(createTable);
  }

  // Set schema version
  const versionCheck = db.prepare('SELECT version FROM schema_version').get();
  if (!versionCheck) {
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
  }

  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Credential operations
 */
export const credentials = {
  save(provider: string, encryptedData: string, iv: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO credentials (provider, encrypted_data, iv, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(provider) DO UPDATE SET
        encrypted_data = excluded.encrypted_data,
        iv = excluded.iv,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(provider, encryptedData, iv);
  },

  get(provider: string): { encrypted_data: string; iv: string } | undefined {
    const db = getDatabase();
    return db.prepare('SELECT encrypted_data, iv FROM credentials WHERE provider = ?').get(provider) as any;
  },

  delete(provider: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM credentials WHERE provider = ?').run(provider);
  },
};

/**
 * Settings operations
 */
export const settings = {
  set(key: string, value: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(key, value);
  },

  get(key: string): string | undefined {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return row?.value;
  },

  delete(key: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
  },
};

/**
 * Import history operations
 */
export const importHistory = {
  create(entry: {
    source_provider?: string;
    source_id?: string;
    gpx_file_path: string;
    status: string;
  }): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO import_history (source_provider, source_id, gpx_file_path, status)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      entry.source_provider || null,
      entry.source_id || null,
      entry.gpx_file_path,
      entry.status
    );
    return result.lastInsertRowid as number;
  },

  update(id: number, updates: {
    waypoints_generated?: number;
    max_divergence_meters?: number;
    valhalla_iterations?: number;
    wanderer_trail_id?: string;
    status?: string;
    error_message?: string;
    completed_at?: string;
  }): void {
    const db = getDatabase();
    const sets: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        sets.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (sets.length > 0) {
      values.push(id);
      db.prepare(`UPDATE import_history SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
  },

  get(id: number): any {
    const db = getDatabase();
    return db.prepare('SELECT * FROM import_history WHERE id = ?').get(id);
  },

  list(limit = 50): any[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM import_history ORDER BY created_at DESC LIMIT ?').all(limit) as any[];
  },
};
