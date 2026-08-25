/**
 * Output file writer — handles writing GPX XML to disk.
 * 
 * Provides utilities for determining output paths and writing
 * the serialized GPX content to files.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import * as logger from '../utils/logger.js';

/**
 * Write GPX XML content to a file.
 * 
 * @param content - The GPX XML string to write
 * @param outputPath - Path where the file should be written
 * @throws Error if writing fails
 */
export function writeGpxFile(content: string, outputPath: string): void {
  const absolutePath = resolve(outputPath);
  
  try {
    writeFileSync(absolutePath, content, 'utf-8');
    logger.success(`GPX file written to: ${absolutePath}`);
  } catch (err) {
    throw new Error(`Failed to write GPX file: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Generate a default output filename from a tour name.
 * 
 * Sanitizes the tour name by removing/replacing characters that are
 * invalid in filenames, and appends the .gpx extension.
 * 
 * @param tourName - The tour name to use as the base filename
 * @returns A sanitized filename with .gpx extension
 */
export function generateOutputFilename(tourName: string): string {
  // Replace invalid filename characters with underscores
  const sanitized = tourName
    .replace(/[<>:"/\\|?*]/g, '_')  // Windows invalid chars
    .replace(/\s+/g, '_')            // Spaces to underscores
    .replace(/_+/g, '_')             // Collapse multiple underscores
    .replace(/^_|_$/g, '');          // Trim leading/trailing underscores
  
  return `${sanitized}.gpx`;
}
