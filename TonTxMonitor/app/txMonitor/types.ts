// Message type definition
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

// Transaction monitoring parameter type (for internal use)
export interface TxMonitorParams {
  userAddress: string;
  queryId: string;
  requiredExcessOpcodeCount: number;
  txHash: string;
  totalAmount: string;
}

// API request type (for external use)
export type TxMonitorRequest = {
  userAddress: string;
  txHashbyTonConnect: string;
  queryId?: string;
  requiredExcessOpcodeCount?: number; 
  sinceTimestamp?: number; //UNIX timestamp in seconds
  totalAmount?: string;
};

// Transaction type 
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

// Transaction monitor result type
export type TxMonitorResult = 
  'TX_RESULT_FULLY_SUCCESS' | 
  'TX_RESULT_PARTIAL_SUCCESS' | 
  'TX_RESULT_FAILED' | 
  'TX_RESULT_ERROR';

// Monitor configuration type
export interface MonitorConfig {
  monitorCount: number;
  monitorIntervalMs: number;
}

// Monitor result type
export interface MonitorResult {
  destinationSuccess: boolean | null;
  querySuccess: boolean | null;
  opCodeSuccess: boolean | null;
}


/**
 * Return type of verifyOpCode. Holds summary of verification result.
 */
export type OpCodeVerificationResult = {
  found: number;
  required: number;
  status: TxMonitorResult;
} | null;
