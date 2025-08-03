import { NextResponse } from 'next/server';
import { getTxMonitorResult } from '../txMonitor/main';

export const dynamic = 'force-dynamic'; // Force dynamic rendering

export async function POST(request: Request) {
  try {
    const params = await request.json();
    
    // Validate required parameters
    if (!params.userAddress || !params.txHashbyTonConnect) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('Start monitoring:', {
      userAddress: params.userAddress,
      queryId: params.queryId || '0',
      requiredExcessOpcodeCount: params.requiredExcessOpcodeCount || 1,
      totalAmount: params.totalAmount || '0',
      txHashbyTonConnect: params.txHashbyTonConnect,

    });

    const result = await getTxMonitorResult(
      params.userAddress,
      params.queryId || '0',
      params.requiredExcessOpcodeCount || 1,
      new Date((params.sinceTimestamp || Date.now()) * 1000),
      params.totalAmount || '0',
      params.txHashbyTonConnect,

    );

    console.log('Monitoring completed:', result);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error occurred during monitoring:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error occurred during monitoring',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
