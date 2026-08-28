import prompts from 'prompts';
import { saveKomootCredentials, type KomootCredentials } from '../auth/credentials.js';
import { login } from './api.js';
import * as logger from '../../utils/logger.js';

/**
 * Prompt the user for their Komoot credentials interactively.
 * Calls the Komoot login API to verify the credentials, then saves
 * them encrypted for future runs.
 * 
 * @param message - Optional message to display before prompting
 * @returns The credentials, or null if the user cancels or login fails.
 */
export async function promptForKomootCredentials(message?: string): Promise<KomootCredentials | null> {
  console.log(message ?? '\nNo Komoot credentials found. Let\'s set them up.\n');

  const response = await prompts([
    {
      type: 'text',
      name: 'email',
      message: 'Komoot email:',
      validate: (value: string) => (value.trim().length > 0 ? true : 'Email is required'),
    },
    {
      type: 'password',
      name: 'password',
      message: 'Komoot password:',
      validate: (value: string) => (value.length > 0 ? true : 'Password is required'),
    },
  ]);

  if (!response.email || !response.password) {
    return null;
  }

  logger.debug('Logging in to Komoot...');

  let loginResult;
  try {
    loginResult = await login(response.email, response.password);
  } catch (err) {
    logger.error(`Komoot login failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
  logger.debug('Komoot login successful');

  const credentials: KomootCredentials = {
    email: response.email,
    password: response.password,
    token: loginResult.token,
    userID: loginResult.userID,
  };

  saveKomootCredentials(credentials);
  console.log('\n✓ Komoot credentials saved securely.\n');

  return credentials;
}
