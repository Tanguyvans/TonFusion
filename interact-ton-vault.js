#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function interactWithVault() {
  console.log('🔧 TonFusion: TON Vault Interaction Tool');
  console.log('=' .repeat(60));
  
  // Try to load vault info
  const vaultInfoPath = path.join(__dirname, 'ton-vault-deployment.json');
  let vaultAddress = '';
  
  if (fs.existsSync(vaultInfoPath)) {
    const vaultInfo = JSON.parse(fs.readFileSync(vaultInfoPath, 'utf8'));
    vaultAddress = vaultInfo.address;
    console.log('📍 Found deployed vault:', vaultAddress);
  } else {
    vaultAddress = await question('Enter your vault address: ');
  }
  
  console.log('\n🔧 Available Operations:');
  console.log('1. Register Deposit (Lock USDT for cross-chain swap)');
  console.log('2. Withdraw Jetton (Claim USDT with secret)');
  console.log('3. Check Vault Status');
  console.log('4. View Swap Details');
  console.log('5. Full Cross-Chain Demo');
  
  const choice = await question('\nSelect operation (1-5): ');
  
  const tonContractPath = path.join(__dirname, 'TonContract_sub');
  process.chdir(tonContractPath);
  
  switch(choice) {
    case '1':
      await registerDeposit(vaultAddress);
      break;
    case '2':
      await withdrawJetton(vaultAddress);
      break;
    case '3':
      await checkVaultStatus(vaultAddress);
      break;
    case '4':
      await viewSwapDetails(vaultAddress);
      break;
    case '5':
      await fullCrossChainDemo(vaultAddress);
      break;
    default:
      console.log('Invalid choice');
  }
  
  rl.close();
}

async function registerDeposit(vaultAddress) {
  console.log('\n📝 Register Deposit (Lock USDT)');
  console.log('-'.repeat(40));
  
  // Generate swap parameters
  const queryId = Math.floor(Math.random() * 1000000);
  const secret = crypto.randomBytes(16).toString('hex');
  const swapId = crypto.createHash('sha256').update(secret).digest('hex');
  
  console.log('🔐 Generated Swap Parameters:');
  console.log('   Query ID:', queryId);
  console.log('   Secret:', secret);
  console.log('   Swap ID (SHA256):', swapId);
  console.log('');
  console.log('⚠️  SAVE THESE VALUES! You need them to withdraw.');
  
  const amount = await question('\nEnter USDT amount (e.g., 1): ');
  const nanoAmount = parseFloat(amount) * 1000000; // USDT has 6 decimals
  
  console.log('\n📱 Instructions:');
  console.log('1. Select "testTransferNotification_realJettonTransfer"');
  console.log('2. Enter these values:');
  console.log('   - Jetton Master: kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy');
  console.log('   - Destination:', vaultAddress);
  console.log('   - Query ID:', queryId);
  console.log('   - Secret:', secret);
  console.log('   - Amount:', nanoAmount);
  console.log('3. Confirm in TonKeeper');
  
  // Save swap info
  const swapInfo = {
    queryId,
    secret,
    swapId,
    amount: amount,
    nanoAmount,
    vaultAddress,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  
  const swapPath = path.join(__dirname, `swap-${queryId}.json`);
  fs.writeFileSync(swapPath, JSON.stringify(swapInfo, null, 2));
  console.log('\n💾 Swap info saved to:', swapPath);
  
  await question('\nPress ENTER to continue...');
  
  console.log('\nRunning: npx blueprint run');
  const process = exec('npx blueprint run');
  
  process.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  await new Promise((resolve) => {
    process.on('close', () => resolve());
  });
  
  console.log('\n✅ Deposit registration initiated!');
  console.log('📊 Your USDT is now locked in the vault');
  console.log('🔓 Use Query ID and Secret to withdraw');
}

async function withdrawJetton(vaultAddress) {
  console.log('\n💰 Withdraw Jetton (Claim USDT)');
  console.log('-'.repeat(40));
  
  const queryId = await question('Enter Query ID: ');
  const secret = await question('Enter Secret: ');
  const amount = await question('Enter amount to withdraw: ');
  
  console.log('\n📱 Instructions:');
  console.log('1. Select "testWithdrawJetton"');
  console.log('2. Enter these values:');
  console.log('   - Vault address:', vaultAddress);
  console.log('   - Query ID:', queryId);
  console.log('   - Secret:', secret);
  console.log('   - Amount:', amount);
  console.log('3. Confirm in TonKeeper');
  
  await question('\nPress ENTER to continue...');
  
  console.log('\nRunning: npx blueprint run');
  const process = exec('npx blueprint run');
  
  process.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  await new Promise((resolve) => {
    process.on('close', () => resolve());
  });
  
  console.log('\n✅ Withdrawal initiated!');
  console.log('💰 Check your wallet for the USDT');
}

async function checkVaultStatus(vaultAddress) {
  console.log('\n📊 Checking Vault Status');
  console.log('-'.repeat(40));
  
  console.log('📱 Instructions:');
  console.log('1. Select "getVaultData" (in admin folder)');
  console.log('2. Enter vault address:', vaultAddress);
  
  await question('\nPress ENTER to continue...');
  
  console.log('\nRunning: npx blueprint run');
  const process = exec('npx blueprint run');
  
  process.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  await new Promise((resolve) => {
    process.on('close', () => resolve());
  });
}

async function viewSwapDetails(vaultAddress) {
  console.log('\n🔍 View Swap Details');
  console.log('-'.repeat(40));
  
  const queryId = await question('Enter Query ID to check: ');
  
  console.log('\n📱 Instructions:');
  console.log('1. Go to:', `https://testnet.tonviewer.com/${vaultAddress}`);
  console.log('2. Click "Methods" tab');
  console.log('3. Find "get_swaps_info_debug"');
  console.log('4. Enter Query ID:', queryId);
  console.log('5. Click "Run"');
  
  console.log('\n📊 The response will show:');
  console.log('   - Swap ID (hash)');
  console.log('   - Ethereum user address');
  console.log('   - TON user address');
  console.log('   - Amount locked');
  console.log('   - Status (0=init, 1=completed, 2=refunded)');
  console.log('   - Timestamps and deadline');
}

async function fullCrossChainDemo(vaultAddress) {
  console.log('\n🌉 Full Cross-Chain Demo');
  console.log('=' .repeat(60));
  console.log('This demonstrates the complete ETH → TON atomic swap flow');
  console.log('');
  
  // Generate parameters for demo
  const queryId = Math.floor(Math.random() * 1000000);
  const secret = crypto.randomBytes(16).toString('hex');
  const swapId = crypto.createHash('sha256').update(secret).digest('hex');
  const ethUser = '0x504b635B7E22F8DF7d037cf31639811AE583E9f0'; // From ETH side
  
  console.log('🔐 Cross-Chain Swap Parameters:');
  console.log('━'.repeat(50));
  console.log('ETH Side:');
  console.log('  User:', ethUser);
  console.log('  Amount: 0.00033 WETH');
  console.log('  Target: TON USDC (1.0)');
  console.log('');
  console.log('TON Side:');
  console.log('  Vault:', vaultAddress);
  console.log('  Query ID:', queryId);
  console.log('  Secret:', secret);
  console.log('  Swap ID:', swapId);
  console.log('  Amount: 1.0 USDT');
  console.log('━'.repeat(50));
  
  console.log('\n📋 Complete Flow:');
  console.log('1. ETH: User creates limit order (0.00033 WETH → 1 USDT)');
  console.log('2. ETH: Resolver detects opportunity');
  console.log('3. TON: Register deposit with swap parameters');
  console.log('4. ETH: Resolver fills order, gets WETH');
  console.log('5. TON: User withdraws USDT with secret');
  console.log('6. ✅ Atomic swap complete!');
  
  console.log('\n💡 To execute this flow:');
  console.log('1. Run the ETH script: node integrated-eth-ton-vault.js');
  console.log('2. Use these parameters for TON deposit');
  console.log('3. After ETH side completes, withdraw with secret');
  
  // Save demo parameters
  const demoInfo = {
    ethSide: {
      user: ethUser,
      amount: '0.00033 WETH',
      target: '1.0 USDT'
    },
    tonSide: {
      vault: vaultAddress,
      queryId,
      secret,
      swapId,
      amount: '1.0 USDT'
    },
    timestamp: new Date().toISOString()
  };
  
  const demoPath = path.join(__dirname, 'cross-chain-demo-params.json');
  fs.writeFileSync(demoPath, JSON.stringify(demoInfo, null, 2));
  console.log('\n💾 Demo parameters saved to:', demoPath);
}

// Run the tool
interactWithVault().catch(console.error);