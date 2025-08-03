import { MONITOR_CONFIG } from '../../../constants/config';

/**
 * 日時文字列をUNIXタイムスタンプ（秒）に変換する
 * @param dateTimeStr DD.MM.YYYY, HH:MM:SS 形式の日時文字列
 * @returns UNIXタイムスタンプ（秒）
 * @throws 無効な日時形式の場合にスローされる
 */
export function parseDateTimeToUnix(dateTimeStr: string): number {
  // 日付文字列をパースして日付コンポーネントを取得
  const match = dateTimeStr.match(/^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}):(\d{2})$/);
  
  if (!match) {
    throw new Error('Invalid datetime format. Please enter in DD.MM.YYYY, HH:MM:SS format. Example: 21.06.2025, 07:28:30');
  }
  
  const [, day, month, year, hours, minutes, seconds] = match.map(Number);
  
  // 月は0から始まるため1を引く
  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  
  // 無効な日付の場合はエラーをスロー
  if (isNaN(date.getTime()) || 
      date.getDate() !== day || 
      date.getMonth() !== month - 1 || 
      date.getFullYear() !== year) {
    throw new Error('Invalid date. Please enter a valid date. Example: 21.06.2025, 07:28:30');
  }
  
  // ミリ秒から秒に変換して返す
  return Math.floor(date.getTime() / 1000);
}

/**
 * 指定されたタイムスタンプが基準時刻以降かつ基準時刻+設定された時間枠内かどうかを判定する
 * @param timestamp 比較対象のUNIXタイムスタンプ（秒）
 * @param sinceTimestamp 基準となるUNIXタイムスタンプ（秒）
 * @returns 基準時刻以降かつ基準時刻+設定された時間枠内の場合はtrue、それ以外はfalse
 */
export function isWithinTimeRange(timestamp: number, sinceTimestamp: number): boolean {
  return timestamp >= sinceTimestamp && 
         timestamp <= sinceTimestamp + MONITOR_CONFIG.MONITORING_WINDOW_MS / 1000;
}
