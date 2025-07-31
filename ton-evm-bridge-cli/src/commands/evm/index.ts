import { Command } from 'commander';
import chalk from 'chalk';
import { deployResolver } from './deploy';
import { interactWithResolver } from './interact';

export const evmCommands = new Command();

evmCommands
  .name('evm')
  .description('EVM contract operations');

evmCommands
  .command('deploy')
  .description('Deploy EVM contracts')
  .option('-n, --network <network>', 'Network to deploy to (ethereum, sepolia, bsc, bscTestnet, polygon, mumbai)', 'sepolia')
  .option('-r, --resolver', 'Deploy Resolver contract')
  .option('-e, --escrow-factory', 'Deploy Escrow Factory contract')
  .option('-v, --verify', 'Verify contracts on block explorer')
  .action(async (options) => {
    try {
      console.log(chalk.blue(`Deploying to ${options.network}...`));
      await deployResolver(options);
    } catch (error) {
      console.error(chalk.red('Deployment failed:'), error);
      process.exit(1);
    }
  });

evmCommands
  .command('interact')
  .description('Interact with deployed EVM contracts')
  .option('-n, --network <network>', 'Network to interact with (ethereum, sepolia, bsc, bscTestnet, polygon, mumbai)', 'sepolia')
  .action(async (options) => {
    try {
      await interactWithResolver(options);
    } catch (error) {
      console.error(chalk.red('Interaction failed:'), error);
      process.exit(1);
    }
  });