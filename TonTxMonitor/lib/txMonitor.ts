interface TxMonitorParams {
  userAddress: string;
  queryId: string;
  requiredExcessOpcodeCount: number;
  txHash: string;
  totalAmount: string;

}

export async function callTxMonitor(params: TxMonitorParams) {
  try {
    const response = await fetch('/api/tx-monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: params.userAddress,
        queryId: params.queryId,
        requiredExcessOpcodeCount: params.requiredExcessOpcodeCount,
        sinceTimestamp: new Date().toISOString(),
        totalAmount: params.totalAmount,
        txHashbyTonConnect: params.txHash,

      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Monitoring Result: Monitoring successfully finished');
      console.log(`TxMonitorResult: ${result.data || 'TX_RESULT_ERROR'}`);
    } else {
      console.error('Monitoring Result: Monitoring failed');
      console.error(`Error: ${result.error || 'Unknown error'}`);
    }
    return result;
  } catch (error) {
    console.error('TxMonitor error:', error);
    throw error;
  }
}
