import { ethers } from 'ethers';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getWallet, networks } from '../../utils/config';
import inquirer from 'inquirer';

const execAsync = promisify(exec);

interface DeployOptions {
  network: string;
  resolver?: boolean;
  escrowFactory?: boolean;
  verify?: boolean;
}

export async function deployResolver(options: DeployOptions) {
  const wallet = getWallet(options.network);
  const networkConfig = networks[options.network];
  
  console.log(chalk.cyan(`Connected to ${networkConfig.name}`));
  console.log(chalk.cyan(`Deploying from: ${wallet.address}`));
  
  const balance = await wallet.provider!.getBalance(wallet.address);
  console.log(chalk.cyan(`Balance: ${ethers.formatEther(balance)} ETH`));

  if (!options.resolver && !options.escrowFactory) {
    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'contracts',
        message: 'Which contracts would you like to deploy?',
        choices: [
          { name: 'Resolver', value: 'resolver' },
          { name: 'Escrow Factory', value: 'escrowFactory' }
        ]
      }
    ]);
    
    options.resolver = answers.contracts.includes('resolver');
    options.escrowFactory = answers.contracts.includes('escrowFactory');
  }

  const deployedContracts: Record<string, string> = {};

  if (options.escrowFactory) {
    console.log(chalk.yellow('\nDeploying Escrow Factory...'));
    const escrowFactoryAddress = await deployEscrowFactory(wallet, networkConfig);
    deployedContracts.escrowFactory = escrowFactoryAddress;
  }

  if (options.resolver) {
    console.log(chalk.yellow('\nDeploying Resolver...'));
    
    let escrowFactoryAddress = deployedContracts.escrowFactory || networkConfig.escrowFactoryAddress;
    
    if (!escrowFactoryAddress) {
      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'escrowFactory',
          message: 'Enter Escrow Factory address:',
          validate: (input) => ethers.isAddress(input) || 'Invalid address'
        }
      ]);
      escrowFactoryAddress = answer.escrowFactory;
    }

    const resolverAddress = await deployResolverContract(wallet, escrowFactoryAddress!, networkConfig);
    deployedContracts.resolver = resolverAddress;
  }

  console.log(chalk.green('\n✅ Deployment complete!'));
  console.log(chalk.cyan('\nDeployed contracts:'));
  
  for (const [contract, address] of Object.entries(deployedContracts)) {
    console.log(chalk.white(`${contract}: ${address}`));
  }

  console.log(chalk.yellow('\nAdd these addresses to your .env file:'));
  for (const [contract, address] of Object.entries(deployedContracts)) {
    const envKey = `${options.network.toUpperCase()}_${contract.replace(/([A-Z])/g, '_$1').toUpperCase()}_ADDRESS`;
    console.log(chalk.gray(`${envKey}=${address}`));
  }

  // Verify contracts if requested
  if (options.verify) {
    console.log(chalk.yellow('\n🔍 Verifying contracts...'));
    await verifyContracts(deployedContracts, options.network, networkConfig);
  }
}

async function deployEscrowFactory(wallet: ethers.Wallet, networkConfig: any): Promise<string> {
  const contractPath = path.join(__dirname, '../../../../cross-chain-resolver-example/dist/contracts/TestEscrowFactory.sol/TestEscrowFactory.json');
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  const factory = new ethers.ContractFactory(
    contractJson.abi,
    contractJson.bytecode.object,
    wallet
  );

  console.log(chalk.gray('Deploying...'));
  
  // TestEscrowFactory constructor arguments
  const limitOrderProtocol = networkConfig.chainId === 11155111 
    ? '0x111111125421ca6dc452d289314280a0f8842a65' // Sepolia LOP
    : '0x111111125421ca6dc452d289314280a0f8842a65'; // BSC testnet LOP
  const feeToken = networkConfig.chainId === 11155111
    ? '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' // WETH on Sepolia
    : '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'; // WBNB on BSC testnet
  const accessToken = '0x0000000000000000000000000000000000000000'; // Zero address
  const rescueDelay = 30 * 60; // 30 minutes

  const contract = await factory.deploy(
    limitOrderProtocol,
    feeToken,
    accessToken,
    wallet.address, // owner
    rescueDelay, // rescueDelaySrc
    rescueDelay  // rescueDelayDst
  );
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log(chalk.green(`Escrow Factory deployed at: ${address}`));
  
  return address;
}

async function deployResolverContract(wallet: ethers.Wallet, escrowFactoryAddress: string, networkConfig: any): Promise<string> {
  const contractPath = path.join(__dirname, '../../../../cross-chain-resolver-example/dist/contracts/Resolver.sol/Resolver.json');
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  
  const factory = new ethers.ContractFactory(
    contractJson.abi,
    contractJson.bytecode.object,
    wallet
  );

  console.log(chalk.gray('Deploying with escrow factory:', escrowFactoryAddress));
  
  // Resolver constructor arguments: (factory, lop, initialOwner)
  const limitOrderProtocol = networkConfig.chainId === 11155111 
    ? '0x111111125421ca6dc452d289314280a0f8842a65' // Sepolia LOP
    : '0x111111125421ca6dc452d289314280a0f8842a65'; // BSC testnet LOP

  const contract = await factory.deploy(
    escrowFactoryAddress, // IEscrowFactory factory
    limitOrderProtocol,   // IOrderMixin lop  
    wallet.address        // address initialOwner
  );
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log(chalk.green(`Resolver deployed at: ${address}`));
  
  return address;
}

async function verifyContracts(deployedContracts: Record<string, string>, network: string, networkConfig: any) {
  const contractsDir = path.join(__dirname, '../../../../cross-chain-resolver-example');
  
  // Map network names to Forge verification names
  const verifierNetworks: Record<string, string> = {
    sepolia: 'sepolia',
    bscTestnet: 'bsc-testnet',
    mumbai: 'mumbai',
    ethereum: 'mainnet',
    bsc: 'bsc',
    polygon: 'matic'
  };

  const verifierNetwork = verifierNetworks[network];
  if (!verifierNetwork) {
    console.log(chalk.red(`⚠️  Verification not supported for network: ${network}`));
    return;
  }

  try {
    // Verify EscrowFactory
    if (deployedContracts.escrowFactory) {
      console.log(chalk.blue(`Verifying EscrowFactory at ${deployedContracts.escrowFactory}...`));
      
      const limitOrderProtocol = networkConfig.chainId === 11155111 
        ? '0x111111125421ca6dc452d289314280a0f8842a65' // Sepolia LOP
        : '0x111111125421ca6dc452d289314280a0f8842a65'; // BSC testnet LOP
      const feeToken = networkConfig.chainId === 11155111
        ? '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' // WETH on Sepolia
        : '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd'; // WBNB on BSC testnet
      const accessToken = '0x0000000000000000000000000000000000000000';
      const rescueDelay = 30 * 60; // 30 minutes

      const escrowCmd = `forge verify-contract ${deployedContracts.escrowFactory} contracts/src/TestEscrowFactory.sol:TestEscrowFactory --chain ${verifierNetwork} --constructor-args $(cast abi-encode "constructor(address,address,address,address,uint32,uint32)" ${limitOrderProtocol} ${feeToken} ${accessToken} ${process.env.WALLET_ADDRESS || '0x504b635B7E22F8DF7d037cf31639811AE583E9f0'} ${rescueDelay} ${rescueDelay})`;
      
      await execAsync(escrowCmd, { cwd: contractsDir });
      console.log(chalk.green(`✅ EscrowFactory verified!`));
    }

    // Verify Resolver
    if (deployedContracts.resolver && deployedContracts.escrowFactory) {
      console.log(chalk.blue(`Verifying Resolver at ${deployedContracts.resolver}...`));
      
      const limitOrderProtocol = networkConfig.chainId === 11155111 
        ? '0x111111125421ca6dc452d289314280a0f8842a65' // Sepolia LOP
        : '0x111111125421ca6dc452d289314280a0f8842a65'; // BSC testnet LOP

      const resolverCmd = `forge verify-contract ${deployedContracts.resolver} contracts/src/Resolver.sol:Resolver --chain ${verifierNetwork} --constructor-args $(cast abi-encode "constructor(address,address,address)" ${deployedContracts.escrowFactory} ${limitOrderProtocol} ${process.env.WALLET_ADDRESS || '0x504b635B7E22F8DF7d037cf31639811AE583E9f0'})`;
      
      await execAsync(resolverCmd, { cwd: contractsDir });
      console.log(chalk.green(`✅ Resolver verified!`));
    }

    console.log(chalk.green(`\n🎉 All contracts verified successfully!`));
  } catch (error) {
    console.log(chalk.red(`❌ Verification failed: ${error}`));
    console.log(chalk.yellow(`\n💡 You can verify manually using these commands:`));
    
    if (deployedContracts.escrowFactory) {
      console.log(chalk.gray(`forge verify-contract ${deployedContracts.escrowFactory} contracts/src/TestEscrowFactory.sol:TestEscrowFactory --chain ${verifierNetwork} --constructor-args-path constructor-args-escrow.txt`));
    }
    
    if (deployedContracts.resolver) {
      console.log(chalk.gray(`forge verify-contract ${deployedContracts.resolver} contracts/src/Resolver.sol:Resolver --chain ${verifierNetwork} --constructor-args-path constructor-args-resolver.txt`));
    }
  }
}