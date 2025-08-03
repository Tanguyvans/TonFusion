// メッセージの型定義
export interface Message {
  destination?: {
    address: string;
  };
  op_code?: string;
  decoded_body?: {
    query_id?: string | number;
    [key: string]: any;
  };
  [key: string]: any;
}

// APIリクエスト型定義
export type TxMonitorRequest = {
  userAddress: string;
  txHashbyTonConnect: string;
  queryId?: string;
  requiredExcessOpcodeCount?: number; 
  sinceTimestamp?: number; //UNIX timestamp in seconds
  totalAmount?: string;

};

// トランザクションの型定義
export interface Transaction {
  hash?: string;
  utime?: number;
  success?: boolean;
  in_msg?: Message;
  out_msgs?: Message[];
  account?: {
    address: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// トランザクション検索結果の型
export type TxMonitorResult = 
  'TX_RESULT_FULLY_SUCCESS' | 
  'TX_RESULT_PARTIAL_SUCCESS' | 
  'TX_RESULT_FAILED' | 
  'TX_RESULT_ERROR';

// 監視設定の型
export interface MonitorConfig {
  monitorCount: number;
  monitorIntervalMs: number;
}

// 監視結果の型
export interface MonitorResult {
  destinationSuccess: boolean | null;
  querySuccess: boolean | null;
  opCodeSuccess: boolean | null;
}


/**
 * verifyOpCodeの戻り値型。検証結果の要約を保持
 */
export type OpCodeVerificationResult = {
  found: number;
  required: number;
  status: TxMonitorResult;
} | null;
