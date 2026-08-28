/**
 * Tests for multi-provider credential management
 * 
 * These tests use a temporary directory for the .env file to avoid
 * interfering with the real ~/.gpx2wanderer/.env used by other tests.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';
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
  setConfigPaths,
  resetConfigPaths,
  type KomootCredentials,
  type StravaCredentials,
  type WandererCredentials,
} from '../../providers/auth/credentials.js';

describe('Credential Management', () => {
  let tempDir: string;
  let tempConfigDir: string;
  let tempEnvPath: string;

  beforeAll(() => {
    // Create a temporary directory for all tests in this suite
    tempDir = mkdtempSync(resolve(tmpdir(), 'gpx2wanderer-cred-test-'));
    tempConfigDir = tempDir;
    tempEnvPath = resolve(tempDir, '.env');

    // Point the credentials module to the temp directory
    setConfigPaths(tempConfigDir, tempEnvPath);
  });

  beforeEach(() => {
    // Clear the temp env file between tests for isolation
    if (existsSync(tempEnvPath)) {
      writeFileSync(tempEnvPath, '', { mode: 0o600 });
    }
  });

  afterAll(() => {
    // Reset to real paths and clean up temp directory
    resetConfigPaths();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
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

      const content = readFileSync(tempEnvPath, 'utf-8');
      expect(content).not.toContain('test@example.com');
      expect(content).not.toContain('secret123');
      expect(content).toContain('KOMOOT_EMAIL_ENC=');
      expect(content).toContain('KOMOOT_PASSWORD_ENC=');
    });

    it('should return null if decryption fails', () => {
      // Create config directory and write invalid encrypted data
      mkdirSync(tempConfigDir, { recursive: true });
      const invalidContent = `# Komoot credentials (encrypted, machine-bound)
KOMOOT_EMAIL_ENC=invalid-base64-data
KOMOOT_PASSWORD_ENC=invalid-base64-data
KOMOOT_TOKEN_ENC=invalid-base64-data
KOMOOT_USERID_ENC=invalid-base64-data
`;
      writeFileSync(tempEnvPath, invalidContent);

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
        refreshToken: 'refresh-token-def',
      };

      saveStravaCredentials(credentials);

      const content = readFileSync(tempEnvPath, 'utf-8');
      expect(content).not.toContain('client-id-123');
      expect(content).not.toContain('client-secret-xyz');
      expect(content).toContain('STRAVA_CLIENT_ID_ENC=');
      expect(content).toContain('STRAVA_REFRESH_TOKEN_ENC=');
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
      const content = readFileSync(tempEnvPath, 'utf-8');
      expect(content).toContain('# Komoot credentials');
      expect(content).toContain('# Strava credentials');
      expect(content).toContain('# Wanderer credentials');
    });
  });
});
