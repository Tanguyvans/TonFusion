import { Command } from 'commander';
import { monitorTransaction } from './testTxMonitor';
import type { MonitorOptions } from './types';

const program = new Command();

// Command line options
program
  .option('--env <env>', 'Environment (local or prod)', 'local')
  .requiredOption('--address <address>', 'Wallet address')
  .option('--queryId <queryId>', 'Query ID', '0')
  .option('--amount <amount>', 'Amount', '1')
  .option('--sinceTimestamp <sinceTimestamp>', 'UNIX timestamp for monitoring start (default: now)', '')
  .parse(process.argv);

const options = program.opts<MonitorOptions>();

// CLI entrypoint
monitorTransaction(options);
