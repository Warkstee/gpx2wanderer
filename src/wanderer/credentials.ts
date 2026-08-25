/**
 * Wanderer credential management
 * 
 * Stores credentials in an encrypted file at ~/.gpx2wanderer/.env
 * Uses machine-bound encryption (scrypt-derived key from hostname + username)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { encrypt, decrypt } from '../crypto/encryption.js';

const CONFIG_DIR = resolve(homedir(), '.gpx2wanderer');
const ENV_PATH = resolve(CONFIG_DIR, '.env');

export interface WandererCredentials {
  host: string;
  username: string;
  password: string;
  cookie?: string;
}

/**
 * Parse a .env file content into key-value pairs.
 * Handles comments (lines starting with #) and empty lines.
 */
function parseEnv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

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

  // Wanderer section
  if (env['WANDERER_HOST_ENC']) {
    sections.push(
      '# Wanderer credentials (encrypted, machine-bound)',
      `WANDERER_HOST_ENC=${env['WANDERER_HOST_ENC']}`,
      `WANDERER_USERNAME_ENC=${env['WANDERER_USERNAME_ENC']}`,
      `WANDERER_PASSWORD_ENC=${env['WANDERER_PASSWORD_ENC']}`,
    );
    if (env['WANDERER_COOKIE_ENC']) {
      sections.push(`WANDERER_COOKIE_ENC=${env['WANDERER_COOKIE_ENC']}`);
    }
  }

  writeFileSync(ENV_PATH, sections.join('\n') + '\n', { mode: 0o600 });
}

/**
 * Check if Wanderer credentials exist.
 */
export function hasWandererCredentials(): boolean {
  if (!existsSync(ENV_PATH)) return false;
  const content = readFileSync(ENV_PATH, 'utf-8');
  const env = parseEnv(content);
  return !!(env['WANDERER_HOST_ENC'] && env['WANDERER_USERNAME_ENC'] && env['WANDERER_PASSWORD_ENC']);
}

/**
 * Load and decrypt Wanderer credentials from the .env file.
 * Returns null if credentials don't exist or decryption fails.
 * The cookie field is optional — returned only if present and valid.
 */
export function loadWandererCredentials(): WandererCredentials | null {
  if (!existsSync(ENV_PATH)) return null;

  const content = readFileSync(ENV_PATH, 'utf-8');
  const env = parseEnv(content);

  const hostEnc = env['WANDERER_HOST_ENC'];
  const usernameEnc = env['WANDERER_USERNAME_ENC'];
  const passwordEnc = env['WANDERER_PASSWORD_ENC'];

  if (!hostEnc || !usernameEnc || !passwordEnc) return null;

  try {
    const creds: WandererCredentials = {
      host: decrypt(hostEnc),
      username: decrypt(usernameEnc),
      password: decrypt(passwordEnc),
    };

    // Cookie is optional
    if (env['WANDERER_COOKIE_ENC']) {
      try {
        creds.cookie = decrypt(env['WANDERER_COOKIE_ENC']);
      } catch {
        // Invalid cookie — ignore it
      }
    }

    return creds;
  } catch {
    return null;
  }
}

/**
 * Encrypt and save Wanderer credentials to the .env file.
 * Creates the config directory and file if they don't exist.
 * Preserves any other content in the existing .env file.
 */
export function saveWandererCredentials(credentials: WandererCredentials): void {
  const env = readEnvFile();
  env['WANDERER_HOST_ENC'] = encrypt(credentials.host);
  env['WANDERER_USERNAME_ENC'] = encrypt(credentials.username);
  env['WANDERER_PASSWORD_ENC'] = encrypt(credentials.password);

  if (credentials.cookie) {
    env['WANDERER_COOKIE_ENC'] = encrypt(credentials.cookie);
  }

  writeEnvFile(env);
}

/**
 * Save only the Wanderer cookie (for session persistence).
 * Updates the existing .env file without touching other credentials.
 */
export function saveWandererCookie(cookie: string): void {
  const env = readEnvFile();
  env['WANDERER_COOKIE_ENC'] = encrypt(cookie);
  writeEnvFile(env);
}

/**
 * Delete Wanderer credentials from the .env file.
 */
export function deleteWandererCredentials(): void {
  const env = readEnvFile();
  delete env['WANDERER_HOST_ENC'];
  delete env['WANDERER_USERNAME_ENC'];
  delete env['WANDERER_PASSWORD_ENC'];
  delete env['WANDERER_COOKIE_ENC'];
  writeEnvFile(env);
}
