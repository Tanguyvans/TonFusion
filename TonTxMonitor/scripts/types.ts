export type Environment = 'local' | 'prod';

export interface MonitorOptions {
  env: Environment;
  address: string;
  txHash: string;
  queryId?: string;
  amount?: string;
  sinceTimestamp?: string;
}

export interface ApiResponse {
  success: boolean;
  data?: string;
  error?: string;
}
