import prompts from 'prompts';
import { saveStravaCredentials, type StravaCredentials } from '../auth/credentials.js';
import { StravaClient } from './api.js';
import * as logger from '../../utils/logger.js';

/**
 * Prompt the user for their Strava API credentials interactively.
 * Validates the credentials by fetching the authenticated athlete profile,
 * then saves them encrypted for future runs.
 *
 * @param message - Optional message to display before prompting
 * @returns The credentials, or null if the user cancels or validation fails.
 */
export async function promptForStravaCredentials(message?: string): Promise<StravaCredentials | null> {
  console.log(message ?? '\nNo Strava credentials found. Let\'s set them up.\n');

  console.log('To obtain API credentials:');
  console.log('  1. Go to https://www.strava.com/settings/api');
  console.log('  2. Create an API application (or use an existing one)');
  console.log('  3. Note your Client ID and Client Secret');
  console.log('  4. Complete the OAuth authorization to get your initial refresh token');
  console.log('     (see https://developers.strava.com/docs/authentication/)');
  console.log('');

  const response = await prompts([
    {
      type: 'text',
      name: 'clientId',
      message: 'Strava Client ID:',
      validate: (value: string) => (value.trim().length > 0 ? true : 'Client ID is required'),
    },
    {
      type: 'password',
      name: 'clientSecret',
      message: 'Strava Client Secret:',
      validate: (value: string) => (value.length > 0 ? true : 'Client Secret is required'),
    },
    {
      type: 'password',
      name: 'refreshToken',
      message: 'Strava Refresh Token:',
      validate: (value: string) => (value.length > 0 ? true : 'Refresh Token is required'),
    },
  ]);

  if (!response.clientId || !response.clientSecret || !response.refreshToken) {
    return null;
  }

  const credentials: StravaCredentials = {
    clientId: response.clientId.trim(),
    clientSecret: response.clientSecret,
    refreshToken: response.refreshToken,
  };

  // Validate by fetching the authenticated athlete
  logger.debug('Validating Strava credentials...');
  const client = new StravaClient(credentials.clientId, credentials.clientSecret, credentials.refreshToken);

  const athlete = await client.validate();
  if (!athlete) {
    logger.error('Strava credential validation failed — please check your credentials.');
    return null;
  }

  logger.debug(`Validation successful — athlete: ${athlete.firstname} ${athlete.lastname} (ID: ${athlete.id})`);

  saveStravaCredentials(credentials);
  console.log(`\n✓ Strava credentials saved securely (athlete: ${athlete.firstname} ${athlete.lastname}).\n`);

  return credentials;
}
