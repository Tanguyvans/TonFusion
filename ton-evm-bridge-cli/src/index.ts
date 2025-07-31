#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { evmCommands } from './commands/evm';
import { tonCommands } from './commands/ton';

dotenv.config();

const program = new Command();

program
  .name('ton-evm-bridge')
  .description('CLI for TON-EVM Bridge contract deployment and interaction')
  .version('1.0.0');

program.addCommand(evmCommands);
program.addCommand(tonCommands);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  console.log(chalk.cyan('\nWelcome to TON-EVM Bridge CLI!\n'));
  program.outputHelp();
}