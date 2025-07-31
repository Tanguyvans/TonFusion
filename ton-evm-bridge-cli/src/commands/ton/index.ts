import { Command } from 'commander';
import chalk from 'chalk';
import { deployTonContracts } from './deploy';
import { interactWithTon } from './interact';

export const tonCommands = new Command();

tonCommands
  .name('ton')
  .description('TON contract operations');

tonCommands
  .command('deploy')
  .description('Deploy TON contracts')
  .option('-t, --testnet', 'Deploy to testnet (default: mainnet)')
  .option('-c, --contract <name>', 'Contract to deploy')
  .action(async (options) => {
    try {
      console.log(chalk.blue(`Deploying to TON ${options.testnet ? 'testnet' : 'mainnet'}...`));
      await deployTonContracts(options);
    } catch (error) {
      console.error(chalk.red('Deployment failed:'), error);
      process.exit(1);
    }
  });

tonCommands
  .command('interact')
  .description('Interact with deployed TON contracts')
  .option('-t, --testnet', 'Use testnet (default: mainnet)')
  .action(async (options) => {
    try {
      await interactWithTon(options);
    } catch (error) {
      console.error(chalk.red('Interaction failed:'), error);
      process.exit(1);
    }
  });