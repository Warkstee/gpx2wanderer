/**
 * Multi-provider credential management with machine-bound encryption.
 *
 * Credentials are stored encrypted in ~/.gpx2wanderer/.env using AES-256-GCM.
 * The encryption key is derived from machine-specific identifiers (hostname +
 * username), so credentials cannot be decrypted on a different machine.
 *
 * Each provider uses a namespaced set of environment variables:
 *   - Komoot:  KOMOOT_EMAIL_ENC, KOMOOT_PASSWORD_ENC, KOMOOT_TOKEN_ENC, KOMOOT_USERID_ENC
 *   - Strava:  STRAVA_CLIENT_ID_ENC, STRAVA_CLIENT_SECRET_ENC, STRAVA_ACCESS_TOKEN_ENC, STRAVA_REFRESH_TOKEN_ENC
 *   - Wanderer: WANDERER_USERNAME_ENC, WANDERER_PASSWORD_ENC, WANDERER_HOST_ENC, WANDERER_COOKIE_ENC
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { hostname, userInfo, homedir } from 'os';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { parseEnv } from '../../utils/env-parser.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const APP_SALT = 'gpx2wanderer-credential-store-v1';

// Config paths — can be overridden for testing via setConfigPaths()
let CONFIG_DIR = resolve(homedir(), '.gpx2wanderer');
let ENV_PATH = resolve(CONFIG_DIR, '.env');

/**
 * Override the config directory and env file path.
 * Intended for testing only — allows tests to use a temp directory
 * instead of the real ~/.gpx2wanderer/.env.
 */
export function setConfigPaths(configDir: string, envPath: string): void {
  CONFIG_DIR = configDir;
  ENV_PATH = envPath;
}

/**
 * Reset config paths to defaults.
 */
export function resetConfigPaths(): void {
  CONFIG_DIR = resolve(homedir(), '.gpx2wanderer');
  ENV_PATH = resolve(CONFIG_DIR, '.env');
}

// ── Credential types ──────────────────────────────────────────────────

export interface KomootCredentials {
  email: string;
  password: string;
  token: string;
  userID: string;
}

export interface StravaCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
}

export interface WandererCredentials {
  username: string;
  password: string;
  host: string;
  cookie?: string;
}

// ── Encryption primitives ─────────────────────────────────────────────

/**
 * Derive an encryption key from machine-specific identifiers.
 * This ties the encrypted credentials to the current machine + user,
 * so they can't be decrypted on a different machine.
 */
function getEncryptionKey(): Buffer {
  const machineId = `${hostname()}:${userInfo().username}`;
  return scryptSync(machineId, APP_SALT, KEY_LENGTH);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing IV + auth tag + ciphertext.
 */
function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt a base64-encoded string produced by encrypt().
 * Throws if the data has been tampered with or the key is wrong.
 */
function decrypt(encoded: string): string {
  const combined = Buffer.from(encoded, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

// ── Env file I/O ──────────────────────────────────────────────────────

/**
 * Read the current env file into a key-value map.
 * Returns an empty object if the file doesn't exist.
 */
function readEnvFile(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  return parseEnv(readFileSync(ENV_PATH, 'utf-8'));
}

/**
 * Serialize the env map to the .env file with section comments.
 * Creates the config directory if needed. File is written with mode 0o600.
 */
function writeEnvFile(env: Record<string, string>): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }

  const sections: string[] = [];

  // Komoot section
  if (env['KOMOOT_EMAIL_ENC']) {
    sections.push(
      '# Komoot credentials (encrypted, machine-bound)',
      `KOMOOT_EMAIL_ENC=${env['KOMOOT_EMAIL_ENC']}`,
      `KOMOOT_PASSWORD_ENC=${env['KOMOOT_PASSWORD_ENC']}`,
      `KOMOOT_TOKEN_ENC=${env['KOMOOT_TOKEN_ENC']}`,
      `KOMOOT_USERID_ENC=${env['KOMOOT_USERID_ENC']}`,
    );
  }

  // Strava section
  if (env['STRAVA_CLIENT_ID_ENC']) {
    sections.push(
      '',
      '# Strava credentials (encrypted, machine-bound)',
      `STRAVA_CLIENT_ID_ENC=${env['STRAVA_CLIENT_ID_ENC']}`,
      `STRAVA_CLIENT_SECRET_ENC=${env['STRAVA_CLIENT_SECRET_ENC']}`,
      `STRAVA_ACCESS_TOKEN_ENC=${env['STRAVA_ACCESS_TOKEN_ENC']}`,
      `STRAVA_REFRESH_TOKEN_ENC=${env['STRAVA_REFRESH_TOKEN_ENC']}`,
    );
  }

  // Wanderer section
  if (env['WANDERER_USERNAME_ENC']) {
    sections.push(
      '',
      '# Wanderer credentials (encrypted, machine-bound)',
      `WANDERER_USERNAME_ENC=${env['WANDERER_USERNAME_ENC']}`,
      `WANDERER_PASSWORD_ENC=${env['WANDERER_PASSWORD_ENC']}`,
      `WANDERER_HOST_ENC=${env['WANDERER_HOST_ENC']}`,
    );
    if (env['WANDERER_COOKIE_ENC']) {
      sections.push(`WANDERER_COOKIE_ENC=${env['WANDERER_COOKIE_ENC']}`);
    }
  }

  writeFileSync(ENV_PATH, sections.join('\n') + '\n', { mode: 0o600 });
}

// ── Komoot credentials ────────────────────────────────────────────────

/**
 * Check if encrypted Komoot credentials exist.
 */
export function hasKomootCredentials(): boolean {
  const env = readEnvFile();
  return !!(env['KOMOOT_EMAIL_ENC'] && env['KOMOOT_PASSWORD_ENC']
    && env['KOMOOT_TOKEN_ENC'] && env['KOMOOT_USERID_ENC']);
}

/**
 * Load and decrypt Komoot credentials from the .env file.
 * Returns null if credentials don't exist or decryption fails.
 */
export function loadKomootCredentials(): KomootCredentials | null {
  const env = readEnvFile();

  const emailEnc = env['KOMOOT_EMAIL_ENC'];
  const passwordEnc = env['KOMOOT_PASSWORD_ENC'];
  const tokenEnc = env['KOMOOT_TOKEN_ENC'];
  const userIDEnc = env['KOMOOT_USERID_ENC'];

  if (!emailEnc || !passwordEnc || !tokenEnc || !userIDEnc) return null;

  try {
    return {
      email: decrypt(emailEnc),
      password: decrypt(passwordEnc),
      token: decrypt(tokenEnc),
      userID: decrypt(userIDEnc),
    };
  } catch {
    return null;
  }
}

/**
 * Encrypt and save Komoot credentials to the .env file.
 * Creates the config directory and file if they don't exist.
 * Preserves credentials for other providers.
 */
export function saveKomootCredentials(credentials: KomootCredentials): void {
  const env = readEnvFile();
  env['KOMOOT_EMAIL_ENC'] = encrypt(credentials.email);
  env['KOMOOT_PASSWORD_ENC'] = encrypt(credentials.password);
  env['KOMOOT_TOKEN_ENC'] = encrypt(credentials.token);
  env['KOMOOT_USERID_ENC'] = encrypt(credentials.userID);
  writeEnvFile(env);
}

// ── Strava credentials ────────────────────────────────────────────────

/**
 * Check if encrypted Strava credentials exist.
 */
export function hasStravaCredentials(): boolean {
  const env = readEnvFile();
  return !!(env['STRAVA_CLIENT_ID_ENC'] && env['STRAVA_CLIENT_SECRET_ENC']
    && env['STRAVA_ACCESS_TOKEN_ENC'] && env['STRAVA_REFRESH_TOKEN_ENC']);
}

/**
 * Load and decrypt Strava credentials from the .env file.
 * Returns null if credentials don't exist or decryption fails.
 */
export function loadStravaCredentials(): StravaCredentials | null {
  const env = readEnvFile();

  const clientIdEnc = env['STRAVA_CLIENT_ID_ENC'];
  const clientSecretEnc = env['STRAVA_CLIENT_SECRET_ENC'];
  const accessTokenEnc = env['STRAVA_ACCESS_TOKEN_ENC'];
  const refreshTokenEnc = env['STRAVA_REFRESH_TOKEN_ENC'];

  if (!clientIdEnc || !clientSecretEnc || !accessTokenEnc || !refreshTokenEnc) return null;

  try {
    return {
      clientId: decrypt(clientIdEnc),
      clientSecret: decrypt(clientSecretEnc),
      accessToken: decrypt(accessTokenEnc),
      refreshToken: decrypt(refreshTokenEnc),
    };
  } catch {
    return null;
  }
}

/**
 * Encrypt and save Strava credentials to the .env file.
 * Creates the config directory and file if they don't exist.
 * Preserves credentials for other providers.
 */
export function saveStravaCredentials(credentials: StravaCredentials): void {
  const env = readEnvFile();
  env['STRAVA_CLIENT_ID_ENC'] = encrypt(credentials.clientId);
  env['STRAVA_CLIENT_SECRET_ENC'] = encrypt(credentials.clientSecret);
  env['STRAVA_ACCESS_TOKEN_ENC'] = encrypt(credentials.accessToken);
  env['STRAVA_REFRESH_TOKEN_ENC'] = encrypt(credentials.refreshToken);
  writeEnvFile(env);
}

// ── Wanderer credentials ──────────────────────────────────────────────

/**
 * Check if encrypted Wanderer credentials exist.
 */
export function hasWandererCredentials(): boolean {
  const env = readEnvFile();
  return !!(env['WANDERER_USERNAME_ENC'] && env['WANDERER_PASSWORD_ENC']
    && env['WANDERER_HOST_ENC']);
}

/**
 * Load and decrypt Wanderer credentials from the .env file.
 * Returns null if credentials don't exist or decryption fails.
 * The cookie field is optional — returned only if present and valid.
 */
export function loadWandererCredentials(): WandererCredentials | null {
  const env = readEnvFile();

  const usernameEnc = env['WANDERER_USERNAME_ENC'];
  const passwordEnc = env['WANDERER_PASSWORD_ENC'];
  const hostEnc = env['WANDERER_HOST_ENC'];

  if (!usernameEnc || !passwordEnc || !hostEnc) return null;

  try {
    const creds: WandererCredentials = {
      username: decrypt(usernameEnc),
      password: decrypt(passwordEnc),
      host: decrypt(hostEnc),
    };

    const cookieEnc = env['WANDERER_COOKIE_ENC'];
    if (cookieEnc) {
      try {
        creds.cookie = decrypt(cookieEnc);
      } catch {
        // Cookie decryption failed — ignore, will re-login
      }
    }

    return creds;
  } catch {
    return null;
  }
}

/**
 * Encrypt and save Wanderer credentials to the .env file.
 * Preserves existing provider credentials and any cached cookie.
 */
export function saveWandererCredentials(credentials: WandererCredentials): void {
  const env = readEnvFile();
  env['WANDERER_USERNAME_ENC'] = encrypt(credentials.username);
  env['WANDERER_PASSWORD_ENC'] = encrypt(credentials.password);
  env['WANDERER_HOST_ENC'] = encrypt(credentials.host);

  if (credentials.cookie) {
    env['WANDERER_COOKIE_ENC'] = encrypt(credentials.cookie);
  }

  writeEnvFile(env);
}

/**
 * Update only the cached Wanderer session cookie.
 * Preserves all other credentials. Does nothing if Wanderer credentials
 * haven't been saved yet.
 */
export function saveWandererCookie(cookie: string): void {
  const env = readEnvFile();
  if (!env['WANDERER_USERNAME_ENC']) return;

  env['WANDERER_COOKIE_ENC'] = encrypt(cookie);
  writeEnvFile(env);
}
