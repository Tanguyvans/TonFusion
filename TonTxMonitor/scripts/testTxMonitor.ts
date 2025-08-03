import chalk from 'chalk';
import axios, { AxiosError } from 'axios';
import type { MonitorOptions, ApiResponse } from './types.ts';
import { MONITOR_CONFIG } from '../constants/config';

// API endpoint configuration
const API_ENDPOINTS = {
  local: 'http://localhost:3000/api',
  prod: 'https://your-production-url.com/api' // Update with your production URL
};

export async function monitorTransaction(options: MonitorOptions) {
  const endpoint = API_ENDPOINTS[options.env];
  const requestData = {
    userAddress: options.address,
    txHashbyTonConnect: "txHashPlaceholder", // Future TODO: Add txHashbyTonConnect from TonConnect
    queryId: options.queryId,
    sinceTimestamp: options.sinceTimestamp ? Number(options.sinceTimestamp) : Math.floor(Date.now() / 1000),
    totalAmount: options.amount
  };

  console.log(chalk.blue('Sending request to:'), endpoint);
  console.log(chalk.blue('Request data:'), JSON.stringify(requestData, null, 2));

  try {
    const response = await axios.post<ApiResponse>(endpoint, requestData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: MONITOR_CONFIG.MONITORING_COUNT * MONITOR_CONFIG.MONITORING_INTERVAL_MS // from config
    });

    if (response.data.success) {
      console.log(chalk.green('✅ TxMonitor Success:'), response.data.data);
    } else {
      console.error(chalk.red('❌ TxMonitor Error:'), response.data.error || 'Unknown error');
      process.exit(1);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApiResponse>;
      if (axiosError.response) {
        console.error(chalk.red('❌ Server responded with error:'), 
          axiosError.response.data?.error || axiosError.message);
      } else {
        console.error(chalk.red('❌ Network error:'), error.message);
      }
    } else {
      console.error(chalk.red('❌ Unexpected error:'), error);
    }
    process.exit(1);
  }
}

