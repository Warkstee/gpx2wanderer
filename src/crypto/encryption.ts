/**
 * AES-256-GCM encryption for credential storage
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits

/**
 * Encrypt data using AES-256-GCM
 * @param data - Data to encrypt (will be JSON stringified)
 * @param encryptionKey - 32-byte hex key
 * @returns Object with encrypted data (hex) and IV (hex)
 */
export function encrypt(data: unknown, encryptionKey: string): { encrypted: string; iv: string } {
  const key = Buffer.from(encryptionKey, 'hex');
  
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const plaintext = JSON.stringify(data);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Combine encrypted data and auth tag
  const combined = encrypted + authTag.toString('hex');
  
  return {
    encrypted: combined,
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Hex string of encrypted data + auth tag
 * @param iv - Hex string of initialization vector
 * @param encryptionKey - 32-byte hex key
 * @returns Decrypted data (parsed from JSON)
 */
export function decrypt<T = unknown>(encryptedData: string, iv: string, encryptionKey: string): T {
  const key = Buffer.from(encryptionKey, 'hex');
  
  if (key.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }

  const ivBuffer = Buffer.from(iv, 'hex');
  
  // Split encrypted data and auth tag
  const authTagHex = encryptedData.slice(-TAG_LENGTH * 2);
  const encryptedHex = encryptedData.slice(0, -TAG_LENGTH * 2);
  
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted) as T;
}

/**
 * Generate a new encryption key
 * @returns 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
