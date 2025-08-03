import type { Transaction } from '@/txMonitor/types';
import { isWithinTimeRange } from './dateTimeUtils';
import { MONITOR_CONFIG } from '../../../constants/config';

/**
 * 指定された時間範囲内で、op_codeとquery_idが一致する成功したトランザクションを検索する
 *
 * @param txList - 検索対象のトランザクション配列
 * @param opCode - 検索するオペレーションコード
 * @param sinceTimestamp - 検索開始タイムスタンプ（UNIXタイムスタンプ、秒単位）
 * @param queryId - 検索するquery_id
 * @param requiredExcessOpcodeCount - 必要なオペレーションコードの最小出現回数。
 *                                    この数に達した時点で検索を打ち切り、見つかったトランザクションを返す。
 * @returns 条件に一致するトランザクションの配列（最大でrequiredExcessOpcodeCount件）
 */
export function findOpCodeTxs(
  txList: Transaction[],
  opCode: string,
  sinceTimestamp: number,
  queryId: string,
  requiredExcessOpcodeCount: number
): Transaction[] {
  const result: Transaction[] = [];

  for (const tx of txList) {
    if (result.length >= requiredExcessOpcodeCount) break;

    const txTime = tx.utime || 0;

    // 1. 時間範囲内である
    // 2. op_codeが一致する
    // 3. query_idが許容誤差（±1000）以内であること
    // 4. トランザクションが成功している
    const txQueryId = tx.in_msg?.decoded_body?.query_id?.toString();
    let queryIdMatch = true;

    if (txQueryId !== undefined) {
      try {
        const txQid = BigInt(txQueryId);
        const expectedQid = BigInt(queryId);
        const diff = txQid > expectedQid ? txQid - expectedQid : expectedQid - txQid;
        queryIdMatch = diff <= BigInt(MONITOR_CONFIG.MONITORING_QUERY_ID_TOLERANCE);
      } catch (e) {
        // 数値変換に失敗した場合は厳密な比較にフォールバック
        queryIdMatch = txQueryId === queryId;
      }
    }

    if (
      isWithinTimeRange(txTime, sinceTimestamp) &&
      tx.in_msg?.op_code === opCode &&
      queryIdMatch &&
      tx.success === true
    ) {
      result.push(tx);
    }
  }

  return result;
}
