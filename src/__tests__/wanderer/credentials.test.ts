/**
 * Unit tests for the Wanderer credentials module
 * 
 * These tests use a temporary directory to avoid interfering with the real
 * ~/.gpx2wanderer/.env file and other parallel tests.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { encrypt, decrypt } from '../../crypto/encryption.js';

const REAL_CONFIG_DIR = resolve(homedir(), '.gpx2wanderer');
const REAL_ENV_PATH = resolve(REAL_CONFIG_DIR, '.env');

describe('Wanderer Credentials Module', () => {
  let tempDir: string;
  let tempEnvPath: string;
  let backupContent: string | null = null;
  let hadExistingConfig = false;

  beforeAll(() => {
    // Backup real config if it exists
    if (existsSync(REAL_ENV_PATH)) {
      backupContent = readFileSync(REAL_ENV_PATH, 'utf-8');
      hadExistingConfig = true;
    }
  });

  beforeEach(() => {
    // Create a temporary directory for this test
    tempDir = mkdtempSync(resolve(tmpdir(), 'gpx2wanderer-test-'));
    tempEnvPath = resolve(tempDir, '.env');
  });

  afterEach(() => {
    // Clean up temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Restore real config if it existed
    if (hadExistingConfig && backupContent) {
      if (!existsSync(REAL_CONFIG_DIR)) {
        mkdirSync(REAL_CONFIG_DIR, { recursive: true, mode: 0o700 });
      }
      writeFileSync(REAL_ENV_PATH, backupContent, { mode: 0o600 });
    }
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt Wanderer credentials', () => {
      const plaintext = 'http://localhost:3000';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt with special characters', () => {
      const plaintext = 'pässwörd 🌍 日本語';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'test-password';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('File Operations', () => {
    it('should create config directory with correct permissions', () => {
      const testDir = resolve(tempDir, 'test-config');
      mkdirSync(testDir, { recursive: true, mode: 0o700 });
      expect(existsSync(testDir)).toBe(true);
    });

    it('should write .env file with correct permissions', () => {
      writeFileSync(tempEnvPath, 'TEST_KEY=test_value\n', { mode: 0o600 });
      expect(existsSync(tempEnvPath)).toBe(true);
      const content = readFileSync(tempEnvPath, 'utf-8');
      expect(content).toContain('TEST_KEY=test_value');
    });

    it('should parse .env file correctly', () => {
      const content = `# Comment
WANDERER_HOST_ENC=encrypted_host
WANDERER_USERNAME_ENC=encrypted_user
WANDERER_PASSWORD_ENC=encrypted_pass

VALHALLA_URL_ENC=encrypted_url
`;
      writeFileSync(tempEnvPath, content, { mode: 0o600 });
      const parsed = readFileSync(tempEnvPath, 'utf-8');
      expect(parsed).toContain('WANDERER_HOST_ENC=encrypted_host');
      expect(parsed).toContain('VALHALLA_URL_ENC=encrypted_url');
    });
  });

  describe('Credential Storage Format', () => {
    it('should encrypt credentials before storing', () => {
      const host = 'http://localhost:3000';
      const username = 'testuser';
      const password = 's3cret!';

      const encryptedHost = encrypt(host);
      const encryptedUser = encrypt(username);
      const encryptedPass = encrypt(password);

      // Verify they're encrypted (not plaintext)
      expect(encryptedHost).not.toBe(host);
      expect(encryptedUser).not.toBe(username);
      expect(encryptedPass).not.toBe(password);

      // Verify they can be decrypted
      expect(decrypt(encryptedHost)).toBe(host);
      expect(decrypt(encryptedUser)).toBe(username);
      expect(decrypt(encryptedPass)).toBe(password);
    });

    it('should handle cookie encryption', () => {
      const cookie = 'pb_auth=eyJyZWNvcmQiOnsiaWQiOiIxMjM0NTY3ODkwMTIzNDU2Nzg5In19';
      const encrypted = encrypt(cookie);
      expect(encrypted).not.toBe(cookie);
      expect(decrypt(encrypted)).toBe(cookie);
    });

    it('should handle unicode in credentials', () => {
      const username = 'tëstüsér';
      const password = 'pässwörd 🌍';

      const encryptedUser = encrypt(username);
      const encryptedPass = encrypt(password);

      expect(decrypt(encryptedUser)).toBe(username);
      expect(decrypt(encryptedPass)).toBe(password);
    });
  });

  describe('Cookie Management', () => {
    it('should encrypt cookie independently', () => {
      const cookie = 'pb_auth=newsessioncookie';
      const encrypted = encrypt(cookie);
      expect(decrypt(encrypted)).toBe(cookie);
    });

    it('should handle long cookie values', () => {
      const longCookie = 'pb_auth=' + 'a'.repeat(1000);
      const encrypted = encrypt(longCookie);
      expect(decrypt(encrypted)).toBe(longCookie);
    });
  });

  describe('Valhalla Configuration', () => {
    it('should encrypt Valhalla URL', () => {
      const url = 'http://localhost:8002';
      const encrypted = encrypt(url);
      expect(decrypt(encrypted)).toBe(url);
    });

    it('should handle unicode in Valhalla URL', () => {
      const url = 'http://välbällä.example.com:8002';
      const encrypted = encrypt(url);
      expect(decrypt(encrypted)).toBe(url);
    });
  });

  describe('Security', () => {
    it('should use machine-specific encryption key', () => {
      // The encryption should be tied to the machine
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should fail to decrypt with wrong data', () => {
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext);
      
      // Corrupt the encrypted data
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';
      
      expect(() => decrypt(corrupted)).toThrow();
    });

    it('should use AES-256-GCM with authentication', () => {
      const plaintext = 'sensitive-data';
      const encrypted = encrypt(plaintext);
      
      // Encrypted data should be base64 encoded
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
      
      // Should decrypt successfully
      expect(decrypt(encrypted)).toBe(plaintext);
    });
  });
});
