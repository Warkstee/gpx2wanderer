/**
 * AES-256-GCM encryption for credential storage
 * 
 * Uses machine-bound key derivation via scrypt, tying encrypted credentials
 * to the current machine + user. This eliminates the need for environment
 * variables while maintaining security.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { hostname, userInfo } from 'node:os';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const APP_SALT = 'gpx2wanderer-credential-store-v1';

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
 * 
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded encrypted data
 */
export function encrypt(plaintext: string): string {
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
 * 
 * @param encoded - Base64-encoded encrypted data
 * @returns Decrypted plaintext string
 */
export function decrypt(encoded: string): string {
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
