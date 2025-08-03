import type { Transaction, TxMonitorResult } from '@/txMonitor/types';
import type { OpCodeVerificationResult } from '@/txMonitor/types';
import { calcQueryIdDiff } from '@/txMonitor/utils/queryIdDiff';
import { findOpCodeTxs } from '@/txMonitor/utils/txMonitorUtils';
import { getTransactions } from '../../lib/tonApi';
import { MONITOR_CONFIG } from '../../constants/config';

export class SwapModeTxMonitor {
  private monitorCount: number;
  private monitorIntervalMs: number;
  private requiredExcessOpcodeCount: number;
  private isMonitoring = false;
  private prevTxResult: TxMonitorResult | null = null;

  constructor(requiredExcessOpcodeCount: number) {
    this.monitorCount = MONITOR_CONFIG.MONITORING_COUNT;
    this.monitorIntervalMs = MONITOR_CONFIG.MONITORING_INTERVAL_MS;
    this.requiredExcessOpcodeCount = requiredExcessOpcodeCount;
  }

  /**
   * Start monitoring transactions (async)
   * @param options Monitoring options
   */
  async start(options: {
    userAddress: string;
    queryId: string;
    sinceTimestamp: number;
    onUpdate?: (result: {
      opCodeSuccess: boolean | null;
      txResult: TxMonitorResult;
      txList: Transaction[];
    }) => void;
    onLog?: (message: string) => void;
  }): Promise<TxMonitorResult> {
    const {
      userAddress,
      queryId,
      sinceTimestamp,
      onUpdate,
      onLog,
    } = options;

    this.isMonitoring = true;
    this.prevTxResult = null;

    onLog?.(`\n=== Monitoring started (${this.monitorCount} times) ===`);
    onLog?.(`Base timestamp: ${new Date(sinceTimestamp * 1000).toISOString()}`);
    onLog?.(`Required ExcessOpcode count: ${this.requiredExcessOpcodeCount}`);

    for (let i = 0; i < this.monitorCount && this.isMonitoring; i++) {
      try {
        // Get transactions
        const txList = await getTransactions(userAddress);
        // Verify op_code and query_id
        const verification = this.verifyOpCode(txList, MONITOR_CONFIG.MONITORING_OP_CODE, sinceTimestamp, queryId, onLog);
        // Judge result
        let txResult: TxMonitorResult = 'TX_RESULT_ERROR';
        let opCodeSuccess: boolean | null = null;
        if (verification) {
          txResult = verification.status;
          opCodeSuccess = verification.status === 'TX_RESULT_FULLY_SUCCESS' ? true : 
                         verification.status === 'TX_RESULT_ERROR' ? null : false;
        }
        // Notify only if result changes
        if (i === 0 || txResult !== this.prevTxResult) {
          onLog?.(`=== TxResult: ${txResult} ===`);
          if (verification) {
            onLog?.(`Found ${verification.found} out of ${verification.required} required transactions`);
          }
          this.prevTxResult = txResult;
        }
        // Call callback
        onUpdate?.({
          txResult,
          opCodeSuccess,
          txList: verification?.found ? txList : []
        });
        // Stop monitoring if fully successful
        if (txResult === 'TX_RESULT_FULLY_SUCCESS') {
          onLog?.('All required transactions detected.');
          this.stop();
          break;
        }
      } catch (e) {
        onLog?.(`Error occurred: ${(e as Error).message}`);
      }
      // 監視間隔を待機（最終ループでは待機しない）
      if (i < this.monitorCount - 1 && this.isMonitoring) {
        await new Promise(resolve => setTimeout(resolve, this.monitorIntervalMs));
      }
    }
    this.isMonitoring = false;
    return this.prevTxResult || 'TX_RESULT_ERROR';
  }

  stop(): void {
    this.isMonitoring = false;
  }

  /**
   * 指定されたopCodeとqueryIdに一致するトランザクションをVerification
   */
  private verifyOpCode(
    txList: Transaction[],
    opCode: string,
    sinceTimestamp: number,
    queryId: string,
    onLog?: (message: string) => void
  ): OpCodeVerificationResult {
    try {
      const txs = findOpCodeTxs(txList, opCode, sinceTimestamp, queryId, this.requiredExcessOpcodeCount);
      let status: TxMonitorResult;
      if (txs.length === 0) {
        status = 'TX_RESULT_FAILED';
      } else if (txs.length >= this.requiredExcessOpcodeCount) {
        status = 'TX_RESULT_FULLY_SUCCESS';
      } else {
        status = 'TX_RESULT_PARTIAL_SUCCESS';
      }
      onLog?.(`[verifyOpCode] Found ${txs.length} txs with opCode ${opCode} and queryId ${queryId} (status: ${status})`);
      if (txs.length > 0) {
        onLog?.(`[verifyOpCode] Found transactions:`);
        txs.forEach((tx: Transaction, index: number) => {
          const txQueryId = tx.in_msg?.decoded_body?.query_id?.toString() || 'N/A';
          let diffInfo = '';
          if (queryId && txQueryId !== 'N/A') {
            const diff = calcQueryIdDiff(txQueryId, queryId);
            diffInfo = diff !== undefined ? ` (diff: ${diff})` : ' (comparison error)';
          }
          onLog?.(`[${index + 1}] ${tx.hash || 'unknown'} at ${new Date((tx.utime || 0) * 1000).toISOString()}`);
          onLog?.(`    QueryId: ${txQueryId}${diffInfo}`);
        });
      }
      return {
        found: txs.length,
        required: this.requiredExcessOpcodeCount,
        status
      };
    } catch (e) {
      onLog?.(`[verifyOpCode] Error: ${e}`);
      return { found: 0, required: this.requiredExcessOpcodeCount, status: 'TX_RESULT_ERROR' };
    }
  }
}

/**
 * Monitor transactions
 * @param userAddress User wallet address
 * @param queryId Query ID
 * @param requiredExcessOpcodeCount Required ExcessOpcode count
 * @param sinceTimestamp Monitoring start time
 * @param totalAmount Total TON amount
 * @param txHashbyTonConnect Transaction hash sent by TonConnect
 */
export async function getTxMonitorResult(
  userAddress: string,
  queryId: string,
  requiredExcessOpcodeCount: number = 1,
  sinceTimestamp: Date = new Date(),
  totalAmount: string,
  txHashbyTonConnect: string,

): Promise<TxMonitorResult> {
  // ブラウザ環境では実行されないようにする
  if (typeof window !== 'undefined') {
    throw new Error('This function cannot be executed in a browser environment');
  }

  try {
    let txMonitorResult: TxMonitorResult;

    const monitor = new SwapModeTxMonitor(requiredExcessOpcodeCount);
    txMonitorResult = await monitor.start({
      userAddress,
      queryId,
      sinceTimestamp: Math.floor(sinceTimestamp.getTime() / 1000),

      onLog: console.log,
    });
    // 最終的な結果サマリーを出力
    console.error(
      '=== TxMonitor Summary ===\n' +
      `QueryId: ${queryId}\n` +
      `User: ${userAddress}\n` +
      `TotalAmount(TON): ${totalAmount}\n` +
      `RequiredExcessOpcodeCount: ${requiredExcessOpcodeCount}\n` +
      `SinceTimestamp: ${sinceTimestamp}\n` +
      `TxHashbyTonConnect: ${txHashbyTonConnect}\n` +
      `Result: ${txMonitorResult}\n`
    );
    return txMonitorResult;
  } catch (e) {
    throw new Error(`TxMonitor failed: ${(e as Error).message}`);
  }
}
