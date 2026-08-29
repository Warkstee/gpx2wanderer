/**
 * Wanderer Authentication Service
 * 
 * Handles Wanderer authentication logic extracted from CLI for reuse.
 * Provides both programmatic auth (for API) and interactive prompt support (for CLI).
 */

import { loadWandererCredentials, saveWandererCookie } from '../providers/auth/credentials.js';
import { login as wandererLogin, validateCookie } from '../wanderer/api.js';
import * as logger from '../utils/logger.js';
import type { WandererSession } from './types.js';

/**
 * Callback type for prompting user for credentials.
 * Used by CLI to inject interactive prompts.
 */
export type CredentialPromptFn = (message?: string) => Promise<{
  host: string;
  username: string;
  password: string;
  cookie?: string;
} | null>;

/**
 * Resolve Wanderer authentication without prompting.
 * 
 * Attempts to authenticate using stored credentials:
 * 1. Load stored credentials
 * 2. Validate cached cookie or re-authenticate
 * 
 * @returns WandererSession if successful, null if credentials missing or invalid
 */
export async function resolveWandererAuth(): Promise<WandererSession | null> {
  const wandererCreds = loadWandererCredentials();
  
  if (!wandererCreds) {
    logger.debug('No stored Wanderer credentials found');
    return null;
  }
  
  logger.debug('Loaded stored Wanderer credentials');
  
  let cookie = wandererCreds.cookie;
  
  if (cookie) {
    const isValid = await validateCookie(wandererCreds.host, cookie);
    
    if (!isValid) {
      logger.debug('Cached Wanderer cookie expired — re-authenticating...');
      try {
        const loginResult = await wandererLogin(
          wandererCreds.host,
          wandererCreds.username,
          wandererCreds.password
        );
        cookie = loginResult.cookie;
        saveWandererCookie(cookie);
        logger.debug('Wanderer cookie refreshed');
      } catch (err) {
        logger.debug(`Wanderer re-login failed: ${err instanceof Error ? err.message : String(err)}`);
        return null;
      }
    } else {
      logger.debug('Cached Wanderer cookie is valid');
    }
  } else {
    // No cached cookie — login now
    logger.debug('No cached Wanderer cookie — authenticating...');
    try {
      const loginResult = await wandererLogin(
        wandererCreds.host,
        wandererCreds.username,
        wandererCreds.password
      );
      cookie = loginResult.cookie;
      saveWandererCookie(cookie);
      logger.debug('Wanderer login successful');
    } catch (err) {
      logger.debug(`Wanderer login failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }
  
  return { host: wandererCreds.host, cookie: cookie! };
}

/**
 * Resolve Wanderer authentication with interactive prompt fallback.
 * 
 * Same as resolveWandererAuth(), but if credentials are missing or invalid,
 * calls the provided prompt function to ask the user for credentials.
 * 
 * The prompt function is expected to handle login and return credentials
 * with a valid cookie (like promptForWandererCredentials does).
 * 
 * @param promptFn - Function to prompt user for credentials (should handle login)
 * @returns WandererSession if successful, null if user cancels or auth fails
 */
export async function resolveWandererAuthWithPrompt(
  promptFn: CredentialPromptFn
): Promise<WandererSession | null> {
  // First try without prompting
  const session = await resolveWandererAuth();
  if (session) {
    return session;
  }
  
  // Prompt for credentials (prompt function handles login)
  const creds = await promptFn();
  if (!creds) {
    return null;
  }
  
  // Prompt function should have logged in and returned cookie
  if (!creds.cookie) {
    logger.debug('Prompt function did not return a cookie');
    return null;
  }
  
  return { host: creds.host, cookie: creds.cookie };
}
