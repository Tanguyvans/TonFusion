import { MONITOR_CONFIG } from '../../../constants/config';

/**
 * Convert date time string to UNIX timestamp (seconds)
 * @param dateTimeStr Date time string in DD.MM.YYYY, HH:MM:SS format
 * @returns UNIX timestamp (seconds)
 * @throws Throws if date time format is invalid
 */
export function parseDateTimeToUnix(dateTimeStr: string): number {
  // Parse date string and get date components
  const match = dateTimeStr.match(/^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}):(\d{2})$/);
  
  if (!match) {
    throw new Error('Invalid datetime format. Please enter in DD.MM.YYYY, HH:MM:SS format. Example: 21.06.2025, 07:28:30');
  }
  
  const [, day, month, year, hours, minutes, seconds] = match.map(Number);
  
  // Month starts from 0, so subtract 1
  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  
  // Throw error if date is invalid
  if (isNaN(date.getTime()) || 
      date.getDate() !== day || 
      date.getMonth() !== month - 1 || 
      date.getFullYear() !== year) {
    throw new Error('Invalid date. Please enter a valid date. Example: 21.06.2025, 07:28:30');
  }
  
  // Convert milliseconds to seconds and return
  return Math.floor(date.getTime() / 1000);
}

/**
 * Check if timestamp is within specified time range
 * @param timestamp Target UNIX timestamp (seconds)
 * @param sinceTimestamp Base UNIX timestamp (seconds)
 * @returns true if within time range, false otherwise
 */
export function isWithinTimeRange(timestamp: number, sinceTimestamp: number): boolean {
  return timestamp >= sinceTimestamp && 
         timestamp <= sinceTimestamp + MONITOR_CONFIG.MONITORING_WINDOW_MS / 1000;
}
