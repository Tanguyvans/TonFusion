import type { Transaction, Message } from '@/txMonitor/types';
import { MONITOR_CONFIG } from '../constants/config';

// TON API設定
const TON_API_CONFIG = {
  // 環境変数からBASE_URLを取得（デフォルトはmainnet）
  get BASE_URL(): string {
    return process.env.NEXT_PUBLIC_TON_API_BASE_URL || 'https://tonapi.io';
  },
  // APIキー
  get API_KEY(): string {
    return process.env.NEXT_PUBLIC_TON_API_KEY || '';
  },
  // リクエストタイムアウト（ミリ秒）
  TIMEOUT_MS: 30000
};

async function fetchFromTonApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TON_API_CONFIG.BASE_URL}${endpoint}`);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });
  
  const headers: HeadersInit = { 'Accept': 'application/json' };
  if (TON_API_CONFIG.API_KEY) {
    headers['Authorization'] = `Bearer ${TON_API_CONFIG.API_KEY}`;
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TON_API_CONFIG.TIMEOUT_MS);
  
  try {
    const response = await fetch(url.toString(), { headers, signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// TON APIのstring型メッセージをMessage型に変換するヘルパー
function parseMessage(msg: any): Message {
  if (!msg) return {};
  if (typeof msg === 'string') {
    // 必要に応じてデコード処理を追加
    return { raw: msg };
  }
  return msg;
}

export async function getTransactions(
  userAddress: string,
  limit: number = MONITOR_CONFIG.MONITORING_TX_LIST_LIMIT
): Promise<Transaction[]> {
  const data = await fetchFromTonApi<{ transactions: any[] }>(
    `/v2/blockchain/accounts/${userAddress}/transactions`,
    { limit: limit.toString() }
  );
  return (data.transactions || []).map((tx) => ({
    ...tx,
    in_msg: parseMessage(tx.in_msg),
    out_msgs: Array.isArray(tx.out_msgs) ? tx.out_msgs.map(parseMessage) : [],
  }));
}
