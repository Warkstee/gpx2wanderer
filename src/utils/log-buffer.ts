/**
 * In-memory ring buffer for log entries
 * 
 * Stores recent log entries in a fixed-size circular buffer.
 * When the buffer is full, oldest entries are overwritten.
 */

/**
 * Log entry structure
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log level */
  level: 'info' | 'success' | 'warn' | 'error' | 'debug';
  /** Log message */
  message: string;
}

/**
 * Maximum number of log entries to retain
 */
const MAX_ENTRIES = 500;

/**
 * Circular buffer storing log entries
 */
const buffer: LogEntry[] = [];

/**
 * Current write position in the buffer
 */
let writeIndex = 0;

/**
 * Total number of entries written (may exceed buffer size)
 */
let totalWritten = 0;

/**
 * Add a log entry to the buffer
 * 
 * @param entry - Log entry to add
 */
export function addEntry(entry: LogEntry): void {
  if (buffer.length < MAX_ENTRIES) {
    buffer.push(entry);
  } else {
    // Buffer is full, overwrite oldest entry
    buffer[writeIndex] = entry;
  }
  
  writeIndex = (writeIndex + 1) % MAX_ENTRIES;
  totalWritten++;
}

/**
 * Get log entries from the buffer
 * 
 * Returns entries in reverse chronological order (newest first).
 * 
 * @param limit - Maximum number of entries to return (default: 100, max: 500)
 * @param level - Optional filter by log level
 * @returns Array of log entries
 */
export function getEntries(limit: number = 100, level?: string): LogEntry[] {
  // Clamp limit to valid range
  const effectiveLimit = Math.max(1, Math.min(limit, MAX_ENTRIES));
  
  // Get all entries in reverse order (newest first)
  let entries: LogEntry[];
  
  if (totalWritten <= MAX_ENTRIES) {
    // Buffer hasn't wrapped yet, entries are in chronological order
    entries = [...buffer].reverse();
  } else {
    // Buffer has wrapped, need to reconstruct in reverse chronological order
    // Start from the most recent entry (writeIndex - 1) and go backwards
    entries = [];
    for (let i = 0; i < MAX_ENTRIES; i++) {
      const index = (writeIndex - 1 - i + MAX_ENTRIES) % MAX_ENTRIES;
      entries.push(buffer[index]);
    }
  }
  
  // Filter by level if specified
  if (level) {
    entries = entries.filter(e => e.level === level);
  }
  
  // Apply limit
  return entries.slice(0, effectiveLimit);
}

/**
 * Clear all entries from the buffer
 * 
 * Primarily useful for testing.
 */
export function clear(): void {
  buffer.length = 0;
  writeIndex = 0;
  totalWritten = 0;
}
