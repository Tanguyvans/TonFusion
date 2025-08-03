#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import axios, { AxiosError } from 'axios';
import type { MonitorOptions, ApiResponse } from './types.ts';

const program = new Command();

// Command line options
program
  .option('--env <env>', 'Environment (local or prod)', 'local')
  .requiredOption('--address <address>', 'Wallet address')
  .requiredOption('--txHash <txHash>', 'Transaction hash')
  .option('--queryId <queryId>', 'Query ID', '0')
  .option('--amount <amount>', 'Amount', '1')
  .option('--sinceTimestamp <sinceTimestamp>', 'UNIX timestamp for monitoring start (default: now)', '')
  .parse(process.argv);

const options = program.opts<MonitorOptions>();

// API endpoint configuration
const API_ENDPOINTS = {
  local: 'http://localhost:3000/api',
  prod: 'https://your-production-url.com/api' // Update with your production URL
};

async function monitorTransaction() {
  const endpoint = API_ENDPOINTS[options.env];
  const requestData = {
    userAddress: options.address,
    txHashbyTonConnect: options.txHash,
    queryId: options.queryId,
    sinceTimestamp: options.sinceTimestamp ? Number(options.sinceTimestamp) : Math.floor(Date.now() / 1000),
    totalAmount: options.amount
  };

  console.log(chalk.blue('Sending request to:'), endpoint);
  console.log(chalk.blue('Request data:'), JSON.stringify(requestData, null, 2));

  try {
    const response = await axios.post<ApiResponse>(endpoint, requestData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000 // 30 seconds timeout
    });

    if (response.data.success) {
      console.log(chalk.green('✅ Success:'), response.data.data);
    } else {
      console.error(chalk.red('❌ Error:'), response.data.error || 'Unknown error');
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

// Execute the monitor
monitorTransaction();
