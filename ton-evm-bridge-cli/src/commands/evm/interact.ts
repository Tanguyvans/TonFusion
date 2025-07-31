import { ethers } from 'ethers';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { getWallet, networks } from '../../utils/config';

interface InteractOptions {
  network: string;
}

export async function interactWithResolver(options: InteractOptions) {
  const wallet = getWallet(options.network);
  const networkConfig = networks[options.network];
  
  console.log(chalk.cyan(`Connected to ${networkConfig.name}`));
  console.log(chalk.cyan(`Wallet: ${wallet.address}`));

  const { contractType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'contractType',
      message: 'Which contract to interact with?',
      choices: ['Resolver', 'Escrow Factory']
    }
  ]);

  if (contractType === 'Resolver') {
    await interactWithResolverContract(wallet, options.network);
  } else {
    await interactWithEscrowFactory(wallet, options.network);
  }
}

async function interactWithResolverContract(wallet: ethers.Wallet, network: string) {
  const networkConfig = networks[network];
  let resolverAddress = networkConfig.resolverAddress;

  if (!resolverAddress) {
    const { address } = await inquirer.prompt([
      {
        type: 'input',
        name: 'address',
        message: 'Enter Resolver contract address:',
        validate: (input) => ethers.isAddress(input) || 'Invalid address'
      }
    ]);
    resolverAddress = address;
  }

  const contractPath = path.join(__dirname, '../../../../cross-chain-resolver-example/dist/contracts/Resolver.sol/Resolver.json');
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  const resolver = new ethers.Contract(resolverAddress!, contractJson.abi, wallet);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        'View owner',
        'View timelock delay',
        'View escrow factory',
        'Resolve swap',
        'Cancel swap',
        'Update timelock delay',
        'Transfer ownership'
      ]
    }
  ]);

  try {
    switch (action) {
      case 'View owner':
        const owner = await resolver.owner();
        console.log(chalk.green(`Owner: ${owner}`));
        break;

      case 'View timelock delay':
        const delay = await resolver.timelockDelay();
        console.log(chalk.green(`Timelock delay: ${delay.toString()} seconds`));
        break;

      case 'View escrow factory':
        const factory = await resolver.escrowFactory();
        console.log(chalk.green(`Escrow factory: ${factory}`));
        break;

      case 'Resolve swap':
        await handleResolveSwap(resolver);
        break;

      case 'Cancel swap':
        await handleCancelSwap(resolver);
        break;

      case 'Update timelock delay':
        await handleUpdateTimelockDelay(resolver);
        break;

      case 'Transfer ownership':
        await handleTransferOwnership(resolver);
        break;
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  }
}

async function interactWithEscrowFactory(wallet: ethers.Wallet, network: string) {
  const networkConfig = networks[network];
  let factoryAddress = networkConfig.escrowFactoryAddress;

  if (!factoryAddress) {
    const { address } = await inquirer.prompt([
      {
        type: 'input',
        name: 'address',
        message: 'Enter Escrow Factory contract address:',
        validate: (input) => ethers.isAddress(input) || 'Invalid address'
      }
    ]);
    factoryAddress = address;
  }

  const contractPath = path.join(__dirname, '../../../../cross-chain-resolver-example/dist/contracts/TestEscrowFactory.sol/TestEscrowFactory.json');
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  const factory = new ethers.Contract(factoryAddress!, contractJson.abi, wallet);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        'Create escrow',
        'Get escrow count',
        'View escrow details'
      ]
    }
  ]);

  try {
    switch (action) {
      case 'Create escrow':
        console.log(chalk.yellow('Creating new escrow...'));
        const tx = await factory.createEscrow();
        console.log(chalk.gray(`Transaction: ${tx.hash}`));
        const receipt = await tx.wait();
        console.log(chalk.green('Escrow created successfully!'));
        break;

      case 'Get escrow count':
        const count = await factory.getEscrowCount();
        console.log(chalk.green(`Total escrows: ${count.toString()}`));
        break;

      case 'View escrow details':
        const { index } = await inquirer.prompt([
          {
            type: 'number',
            name: 'index',
            message: 'Enter escrow index:',
            validate: (input) => input >= 0 || 'Index must be non-negative'
          }
        ]);
        const escrowAddress = await factory.getEscrow(index);
        console.log(chalk.green(`Escrow at index ${index}: ${escrowAddress}`));
        break;
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error);
  }
}

async function handleResolveSwap(resolver: ethers.Contract) {
  const inputs = await inquirer.prompt([
    {
      type: 'input',
      name: 'orderId',
      message: 'Enter order ID (bytes32):',
      validate: (input) => /^0x[a-fA-F0-9]{64}$/.test(input) || 'Invalid bytes32 format'
    },
    {
      type: 'input',
      name: 'escrowAddress',
      message: 'Enter escrow address:',
      validate: (input) => ethers.isAddress(input) || 'Invalid address'
    },
    {
      type: 'input',
      name: 'taker',
      message: 'Enter taker address:',
      validate: (input) => ethers.isAddress(input) || 'Invalid address'
    }
  ]);

  console.log(chalk.yellow('Resolving swap...'));
  const tx = await resolver.resolveSwap(inputs.orderId, inputs.escrowAddress, inputs.taker);
  console.log(chalk.gray(`Transaction: ${tx.hash}`));
  await tx.wait();
  console.log(chalk.green('Swap resolved successfully!'));
}

async function handleCancelSwap(resolver: ethers.Contract) {
  const inputs = await inquirer.prompt([
    {
      type: 'input',
      name: 'orderId',
      message: 'Enter order ID (bytes32):',
      validate: (input) => /^0x[a-fA-F0-9]{64}$/.test(input) || 'Invalid bytes32 format'
    },
    {
      type: 'input',
      name: 'escrowAddress',
      message: 'Enter escrow address:',
      validate: (input) => ethers.isAddress(input) || 'Invalid address'
    }
  ]);

  console.log(chalk.yellow('Canceling swap...'));
  const tx = await resolver.cancelSwap(inputs.orderId, inputs.escrowAddress);
  console.log(chalk.gray(`Transaction: ${tx.hash}`));
  await tx.wait();
  console.log(chalk.green('Swap canceled successfully!'));
}

async function handleUpdateTimelockDelay(resolver: ethers.Contract) {
  const { newDelay } = await inquirer.prompt([
    {
      type: 'number',
      name: 'newDelay',
      message: 'Enter new timelock delay (seconds):',
      validate: (input) => input > 0 || 'Delay must be positive'
    }
  ]);

  console.log(chalk.yellow('Updating timelock delay...'));
  const tx = await resolver.updateTimelockDelay(newDelay);
  console.log(chalk.gray(`Transaction: ${tx.hash}`));
  await tx.wait();
  console.log(chalk.green('Timelock delay updated successfully!'));
}

async function handleTransferOwnership(resolver: ethers.Contract) {
  const { newOwner } = await inquirer.prompt([
    {
      type: 'input',
      name: 'newOwner',
      message: 'Enter new owner address:',
      validate: (input) => ethers.isAddress(input) || 'Invalid address'
    }
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to transfer ownership to ${newOwner}?`,
      default: false
    }
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Transfer canceled'));
    return;
  }

  console.log(chalk.yellow('Transferring ownership...'));
  const tx = await resolver.transferOwnership(newOwner);
  console.log(chalk.gray(`Transaction: ${tx.hash}`));
  await tx.wait();
  console.log(chalk.green('Ownership transferred successfully!'));
}