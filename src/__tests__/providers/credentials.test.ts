/**
 * Tests for multi-provider credential management
 * 
 * These tests backup and restore the real ~/.gpx2wanderer/.env file to avoid
 * destroying existing credentials that are needed for smoke tests and integration tests.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import {
  hasKomootCredentials,
  loadKomootCredentials,
  saveKomootCredentials,
  hasStravaCredentials,
  loadStravaCredentials,
  saveStravaCredentials,
  hasWandererCredentials,
  loadWandererCredentials,
  saveWandererCredentials,
  saveWandererCookie,
  type KomootCredentials,
  type StravaCredentials,
  type WandererCredentials,
} from '../../providers/auth/credentials.js';

const CONFIG_DIR = resolve(homedir(), '.gpx2wanderer');
const ENV_PATH = resolve(CONFIG_DIR, '.env');

describe('Credential Management', () => {
  let backupContent: string | null = null;
  let hadExistingConfig = false;

  beforeAll(() => {
    // Backup real config if it exists
    if (existsSync(ENV_PATH)) {
      backupContent = readFileSync(ENV_PATH, 'utf-8');
      hadExistingConfig = true;
    }
  });

  beforeEach(() => {
    // Clear credentials between tests to ensure isolation, but preserve the backup
    if (existsSync(CONFIG_DIR)) {
      writeFileSync(ENV_PATH, '', { mode: 0o600 });
    }
  });

  afterAll(() => {
    // Restore real config if it existed
    if (hadExistingConfig && backupContent) {
      if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
      }
      writeFileSync(ENV_PATH, backupContent, { mode: 0o600 });
    }
  });

  describe('Komoot Credentials', () => {
    it('should return false when no credentials exist', () => {
      expect(hasKomootCredentials()).toBe(false);
      expect(loadKomootCredentials()).toBeNull();
    });

    it('should save and load Komoot credentials', () => {
      const credentials: KomootCredentials = {
        email: 'test@example.com',
        password: 'secret123',
        token: 'api-token-xyz',
        userID: 'user-123',
      };

      saveKomootCredentials(credentials);
      expect(hasKomootCredentials()).toBe(true);

      const loaded = loadKomootCredentials();
      expect(loaded).toEqual(credentials);
    });

    it('should encrypt credentials in the .env file', () => {
      const credentials: KomootCredentials = {
        email: 'test@example.com',
        password: 'secret123',
        token: 'api-token-xyz',
        userID: 'user-123',
      };

      saveKomootCredentials(credentials);

      const content = readFileSync(ENV_PATH, 'utf-8');
      expect(content).not.toContain('test@example.com');
      expect(content).not.toContain('secret123');
      expect(content).toContain('KOMOOT_EMAIL_ENC=');
      expect(content).toContain('KOMOOT_PASSWORD_ENC=');
    });

    it('should return null if decryption fails', () => {
      // Create config directory and write invalid encrypted data
      mkdirSync(CONFIG_DIR, { recursive: true });
      const invalidContent = `# Komoot credentials (encrypted, machine-bound)
KOMOOT_EMAIL_ENC=invalid-base64-data
KOMOOT_PASSWORD_ENC=invalid-base64-data
KOMOOT_TOKEN_ENC=invalid-base64-data
KOMOOT_USERID_ENC=invalid-base64-data
`;
      writeFileSync(ENV_PATH, invalidContent);

      expect(loadKomootCredentials()).toBeNull();
    });
  });

  describe('Strava Credentials', () => {
    it('should return false when no credentials exist', () => {
      expect(hasStravaCredentials()).toBe(false);
      expect(loadStravaCredentials()).toBeNull();
    });

    it('should save and load Strava credentials', () => {
      const credentials: StravaCredentials = {
        clientId: 'client-id-123',
        clientSecret: 'client-secret-xyz',
        accessToken: 'access-token-abc',
        refreshToken: 'refresh-token-def',
      };

      saveStravaCredentials(credentials);
      expect(hasStravaCredentials()).toBe(true);

      const loaded = loadStravaCredentials();
      expect(loaded).toEqual(credentials);
    });

    it('should encrypt credentials in the .env file', () => {
      const credentials: StravaCredentials = {
        clientId: 'client-id-123',
        clientSecret: 'client-secret-xyz',
        accessToken: 'access-token-abc',
        refreshToken: 'refresh-token-def',
      };

      saveStravaCredentials(credentials);

      const content = readFileSync(ENV_PATH, 'utf-8');
      expect(content).not.toContain('client-id-123');
      expect(content).not.toContain('client-secret-xyz');
      expect(content).toContain('STRAVA_CLIENT_ID_ENC=');
      expect(content).toContain('STRAVA_ACCESS_TOKEN_ENC=');
    });
  });

  describe('Wanderer Credentials', () => {
    it('should return false when no credentials exist', () => {
      expect(hasWandererCredentials()).toBe(false);
      expect(loadWandererCredentials()).toBeNull();
    });

    it('should save and load Wanderer credentials', () => {
      const credentials: WandererCredentials = {
        username: 'wanderer-user',
        password: 'wanderer-pass',
        host: 'https://wanderer.example.com',
      };

      saveWandererCredentials(credentials);
      expect(hasWandererCredentials()).toBe(true);

      const loaded = loadWandererCredentials();
      expect(loaded).toEqual(credentials);
    });

    it('should save and load Wanderer credentials with cookie', () => {
      const credentials: WandererCredentials = {
        username: 'wanderer-user',
        password: 'wanderer-pass',
        host: 'https://wanderer.example.com',
        cookie: 'session-cookie-xyz',
      };

      saveWandererCredentials(credentials);
      const loaded = loadWandererCredentials();
      expect(loaded).toEqual(credentials);
    });

    it('should update only the cookie', () => {
      const credentials: WandererCredentials = {
        username: 'wanderer-user',
        password: 'wanderer-pass',
        host: 'https://wanderer.example.com',
      };

      saveWandererCredentials(credentials);
      saveWandererCookie('new-session-cookie');

      const loaded = loadWandererCredentials();
      expect(loaded?.username).toBe('wanderer-user');
      expect(loaded?.cookie).toBe('new-session-cookie');
    });

    it('should not update cookie if Wanderer credentials do not exist', () => {
      saveWandererCookie('orphan-cookie');
      expect(loadWandererCredentials()).toBeNull();
    });
  });

  describe('Multi-provider isolation', () => {
    it('should preserve credentials for other providers', () => {
      const komootCreds: KomootCredentials = {
        email: 'komoot@example.com',
        password: 'komoot-pass',
        token: 'komoot-token',
        userID: 'komoot-user',
      };

      const stravaCreds: StravaCredentials = {
        clientId: 'strava-id',
        clientSecret: 'strava-secret',
        accessToken: 'strava-access',
        refreshToken: 'strava-refresh',
      };

      const wandererCreds: WandererCredentials = {
        username: 'wanderer-user',
        password: 'wanderer-pass',
        host: 'https://wanderer.example.com',
      };

      // Save credentials for each provider
      saveKomootCredentials(komootCreds);
      saveStravaCredentials(stravaCreds);
      saveWandererCredentials(wandererCreds);

      // Verify all credentials are preserved
      expect(loadKomootCredentials()).toEqual(komootCreds);
      expect(loadStravaCredentials()).toEqual(stravaCreds);
      expect(loadWandererCredentials()).toEqual(wandererCreds);

      // Verify the .env file contains all sections
      const content = readFileSync(ENV_PATH, 'utf-8');
      expect(content).toContain('# Komoot credentials');
      expect(content).toContain('# Strava credentials');
      expect(content).toContain('# Wanderer credentials');
    });
  });
});
