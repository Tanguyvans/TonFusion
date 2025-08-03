import type { Transaction } from '@/txMonitor/types';
import { isWithinTimeRange } from './dateTimeUtils';
import { MONITOR_CONFIG } from '../../../constants/config';

/**
 * Find successful transactions matching op_code and query_id within specified time range
 *
 * @param txList - Array of transactions to search
 * @param opCode - Operation code to search for
 * @param sinceTimestamp - Start timestamp (UNIX timestamp in seconds)
 * @param queryId - Query ID to search for
 * @param requiredExcessOpcodeCount - Minimum number of required op_code occurrences.
 *                                   Returns found transactions when this number is reached.
 * @returns Array of matching transactions (maximum requiredExcessOpcodeCount items)
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

    // 1. Within time range
    // 2. op_code matches
    // 3. query_id within tolerance (±1000)
    // 4. Transaction is successful
    const txQueryId = tx.in_msg?.decoded_body?.query_id?.toString();
    let queryIdMatch = true;

    if (txQueryId !== undefined) {
      try {
        const txQid = BigInt(txQueryId);
        const expectedQid = BigInt(queryId);
        const diff = txQid > expectedQid ? txQid - expectedQid : expectedQid - txQid;
        queryIdMatch = diff <= BigInt(MONITOR_CONFIG.MONITORING_QUERY_ID_TOLERANCE);
      } catch (e) {
        // Fallback to strict comparison if numeric conversion fails
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
