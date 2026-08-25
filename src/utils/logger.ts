/**
 * Logger utility with colored output
 */

import chalk from 'chalk';

let verboseMode = false;

/**
 * Enable or disable verbose logging
 */
export function setVerbose(enabled: boolean): void {
  verboseMode = enabled;
}

/**
 * Log info message (always shown)
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Log success message (always shown)
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Log warning message (always shown)
 */
export function warn(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

/**
 * Log error message (always shown)
 */
export function error(message: string): void {
  console.error(chalk.red('✖'), message);
}

/**
 * Log debug message (only shown in verbose mode)
 */
export function debug(message: string): void {
  if (verboseMode) {
    console.log(chalk.gray('🔍'), chalk.gray(message));
  }
}
