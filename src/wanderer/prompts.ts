import prompts from 'prompts';
import { saveWandererCredentials, type WandererCredentials } from '../providers/auth/credentials.js';
import { login } from './api.js';
import * as logger from '../utils/logger.js';

/**
 * Normalize a Wanderer host URL:
 * - Trim whitespace
 * - Strip trailing slashes
 * - Prepend http:// if no scheme is present
 */
function normalizeHost(raw: string): string {
  let host = raw.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(host)) {
    host = `http://${host}`;
  }
  return host;
}

/**
 * Prompt the user for their Wanderer credentials interactively.
 * Calls the Wanderer login API to verify the credentials, then saves
 * them encrypted for future runs.
 * 
 * @param message - Optional message to display before prompting
 * @returns The credentials (with cookie from login), or null if the user cancels or login fails.
 */
export async function promptForWandererCredentials(message?: string): Promise<WandererCredentials | null> {
  console.log(message ?? '\nNo Wanderer credentials found. Let\'s set them up.\n');

  const response = await prompts([
    {
      type: 'text',
      name: 'host',
      message: 'Wanderer instance URL (e.g. http://localhost:3000):',
      validate: (value: string) => (value.trim().length > 0 ? true : 'Host is required'),
      initial: 'http://localhost:3000',
    },
    {
      type: 'text',
      name: 'username',
      message: 'Wanderer username:',
      validate: (value: string) => (value.trim().length > 0 ? true : 'Username is required'),
    },
    {
      type: 'password',
      name: 'password',
      message: 'Wanderer password:',
      validate: (value: string) => (value.length > 0 ? true : 'Password is required'),
    },
  ]);

  if (!response.host || !response.username || !response.password) {
    return null;
  }

  const host = normalizeHost(response.host);
  logger.debug(`Logging in to Wanderer at ${host}...`);

  let loginResult;
  try {
    loginResult = await login(host, response.username, response.password);
  } catch (err) {
    logger.error(`Wanderer login failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
  logger.debug('Wanderer login successful');

  const credentials: WandererCredentials = {
    username: response.username,
    password: response.password,
    host,
    cookie: loginResult.cookie,
  };

  saveWandererCredentials(credentials);
  console.log('\n✓ Wanderer credentials saved securely.\n');

  return credentials;
}
