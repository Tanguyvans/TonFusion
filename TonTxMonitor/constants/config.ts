// TxMonitor config
export const MONITOR_CONFIG = {
  MONITORING_COUNT: 2, // Recommended for production: 24
  MONITORING_INTERVAL_MS: 5000, // Recommended for production: 5000
  MONITORING_TX_LIST_LIMIT: 1, // Recommended for production: 30
  MONITORING_WINDOW_MS: 120 * 1000, // 2 minutes
  MONITORING_QUERY_ID_TOLERANCE: 2000,
  MONITORING_OP_CODE: '0xd53276db' // EXCESS_OPCODE
};
