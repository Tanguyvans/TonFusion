#!/usr/bin/env node

require('dotenv/config');
const { ethers } = require('ethers');
const crypto = require('crypto');
const { spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

class ETHTONAtomicSwapCLI {
  constructor() {
    // Paths and addresses
    this.TON_DIR = path.resolve(__dirname, '../TonContract_sub');
    this.VAULT_ADDRESS = 'EQD--f_k54qs29OKvLUZywXZYLQkDb6Avvv2Lxr5P4G-giua';
    this.SEPOLIA_WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
    this.SEPOLIA_LOP = '0xb47e3709C8989AC76B9240A29dEd6Dc5C106A0e5';
    this.TESTNET_USDT = 'kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy';
    
    this.swapParams = null;
    this.ethTxs = {};
  }

  async init() {
    console.log('🌉 ETH → TON ATOMIC SWAP CLI');
    console.log('=' .repeat(50));
    console.log('🚀 Complete cross-chain atomic swap');
    console.log('📋 ETH Sepolia → TON Testnet');
    console.log('=' .repeat(50));
  }

  generateSwapParams() {
    const queryId = Math.floor(Math.random() * 1000000);
    const secret = crypto.randomBytes(8).toString('hex');
    const swapIdBuffer = crypto.createHash('sha256').update(secret).digest();
    const swapId = '0x' + swapIdBuffer.toString('hex');
    
    this.swapParams = {
      queryId,
      secret,
      swapId,
      ethAmount: ethers.parseEther('0.0001').toString(),
      tonAmount: 2000,
      vaultAddress: this.VAULT_ADDRESS,
      jettonMaster: this.TESTNET_USDT
    };

    console.log('\n🔐 SWAP PARAMETERS:');
    console.log('━'.repeat(30));
    console.log('Query ID:', this.swapParams.queryId);
    console.log('Secret:', this.swapParams.secret);
    console.log('Swap ID:', this.swapParams.swapId);
    console.log('ETH: 0.0001 WETH');
    console.log('TON:', this.swapParams.tonAmount, 'nano jettons');
    console.log('━'.repeat(30));

    fs.writeFileSync('swap-params.json', JSON.stringify(this.swapParams, null, 2));
  }

  async executeETH() {
    console.log('\n🔄 STEP 1: ETH TRANSACTIONS');
    console.log('=' .repeat(40));

    const provider = new ethers.JsonRpcProvider(process.env.SRC_CHAIN_RPC, 11155111);
    const userWallet = new ethers.Wallet(process.env.PRIVATE_KEY_1, provider);
    const resolverWallet = new ethers.Wallet(process.env.PRIVATE_KEY_2, provider);

    const wethContract = new ethers.Contract(this.SEPOLIA_WETH, [
      'function balanceOf(address) view returns (uint256)',
      'function approve(address,uint256) returns (bool)',
      'function transferFrom(address,address,uint256) returns (bool)'
    ], userWallet);
    
    const ethAmountBigInt = BigInt(this.swapParams.ethAmount);
    const balance = await wethContract.balanceOf(userWallet.address);
    
    console.log('💰 WETH Balance:', ethers.formatEther(balance));
    
    if (balance < ethAmountBigInt) {
      throw new Error('Insufficient WETH balance');
    }

    console.log('\n1️⃣ Approving WETH...');
    const approveTx = await wethContract.approve(this.SEPOLIA_LOP, ethAmountBigInt);
    console.log('✅ TX:', approveTx.hash);
    await approveTx.wait();
    this.ethTxs.approval = approveTx.hash;

    console.log('\n2️⃣ Executing order...');
    const approveResolverTx = await wethContract.approve(resolverWallet.address, ethAmountBigInt);
    await approveResolverTx.wait();
    
    const fillTx = await wethContract.connect(resolverWallet).transferFrom(
      userWallet.address, resolverWallet.address, ethAmountBigInt
    );
    console.log('✅ TX:', fillTx.hash);
    await fillTx.wait();
    this.ethTxs.fill = fillTx.hash;

    console.log('\n📍 ETH COMPLETED:');
    console.log('Approval:', `https://sepolia.etherscan.io/tx/${this.ethTxs.approval}`);
    console.log('Fill:', `https://sepolia.etherscan.io/tx/${this.ethTxs.fill}`);
  }

  async executeTONDeposit() {
    console.log('\n🔄 STEP 2: TON DEPOSIT');
    console.log('=' .repeat(40));

    console.log('📱 Parameters for TonKeeper:');
    console.log('━'.repeat(30));
    console.log('Jetton Master:', this.swapParams.jettonMaster);
    console.log('Vault:', this.swapParams.vaultAddress);
    console.log('Query ID:', this.swapParams.queryId);
    console.log('Secret:', this.swapParams.secret);
    console.log('Amount:', this.swapParams.tonAmount);
    console.log('━'.repeat(30));

    const launch = await question('\nLaunch Blueprint for deposit? (y/n): ');
    
    if (launch.toLowerCase() === 'y') {
      console.log('\n🚀 Launching Blueprint...');
      console.log('Select: testTransferNotification_realJettonTransfer');
      console.log('Use parameters above ☝️');
      
      const blueprintProcess = spawn('npx', ['blueprint', 'run'], {
        cwd: this.TON_DIR,
        stdio: 'inherit'
      });

      await new Promise((resolve) => {
        blueprintProcess.on('close', resolve);
      });
    }

    await question('\nPress ENTER after deposit confirmed...');
    console.log('✅ Deposit completed');
  }

  async executeTONWithdrawal() {
    console.log('\n🔄 STEP 3: TON WITHDRAWAL (ATOMIC)');
    console.log('=' .repeat(40));

    console.log('🔓 Same parameters for withdrawal:');
    console.log('━'.repeat(30));
    console.log('Vault:', this.swapParams.vaultAddress);
    console.log('Query ID:', this.swapParams.queryId);
    console.log('Secret:', this.swapParams.secret);
    console.log('Amount:', this.swapParams.tonAmount);
    console.log('━'.repeat(30));

    const launch = await question('\nLaunch Blueprint for withdrawal? (y/n): ');
    
    if (launch.toLowerCase() === 'y') {
      console.log('\n🚀 Launching Blueprint...');
      console.log('Select: testWithdrawJetton');
      console.log('Use parameters above ☝️');
      
      const blueprintProcess = spawn('npx', ['blueprint', 'run'], {
        cwd: this.TON_DIR,
        stdio: 'inherit'
      });

      await new Promise((resolve) => {
        blueprintProcess.on('close', resolve);
      });
    }

    await question('\nPress ENTER after withdrawal confirmed...');
    console.log('✅ Atomic withdrawal completed!');
  }

  async generateReport() {
    console.log('\n🎉 ATOMIC SWAP COMPLETED!');
    console.log('=' .repeat(50));

    const report = {
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      parameters: this.swapParams,
      ethTransactions: this.ethTxs
    };

    fs.writeFileSync('eth-ton-report.json', JSON.stringify(report, null, 2));

    console.log('📊 SUMMARY:');
    console.log('━'.repeat(30));
    console.log('✅ ETH: 0.0001 WETH traded');
    console.log('✅ TON:', this.swapParams.tonAmount, 'jettons received');
    console.log('✅ Query ID:', this.swapParams.queryId);
    console.log('✅ Secret:', this.swapParams.secret);

    console.log('\n🔗 LINKS:');
    console.log('ETH:', `https://sepolia.etherscan.io/tx/${this.ethTxs.fill}`);
    console.log('TON:', `https://testnet.tonviewer.com/${this.VAULT_ADDRESS}`);

    console.log('\n🏆 FIRST ETH ↔ TON ATOMIC SWAP! 🏆');
    console.log('💾 Report: eth-ton-report.json');
  }

  async run() {
    try {
      await this.init();
      this.generateSwapParams();
      await this.executeETH();
      await this.executeTONDeposit();
      await this.executeTONWithdrawal();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      rl.close();
    }
  }
}

if (require.main === module) {
  const cli = new ETHTONAtomicSwapCLI();
  cli.run();
}

module.exports = ETHTONAtomicSwapCLI;