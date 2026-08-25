/**
 * Wanderer credential management
 */

import { credentials } from '../db/queries.js';
import { encrypt, decrypt } from '../crypto/encryption.js';

export interface WandererCredentials {
  baseUrl: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

/**
 * Save Wanderer credentials (encrypted)
 */
export function saveWandererCredentials(creds: WandererCredentials, encryptionKey: string): void {
  const { encrypted, iv } = encrypt(creds, encryptionKey);
  credentials.save('wanderer', encrypted, iv);
}

/**
 * Load Wanderer credentials (decrypted)
 */
export function loadWandererCredentials(encryptionKey: string): WandererCredentials | null {
  const stored = credentials.get('wanderer');
  if (!stored) {
    return null;
  }

  return decrypt<WandererCredentials>(stored.encrypted_data, stored.iv, encryptionKey);
}

/**
 * Delete Wanderer credentials
 */
export function deleteWandererCredentials(): void {
  credentials.delete('wanderer');
}
