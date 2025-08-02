#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function deployVault() {
  console.log('🚀 TON Vault Deployment (Simplified)');
  console.log('=' .repeat(60));
  
  try {
    // Check if already built
    if (fs.existsSync('./build/vault.compiled.json')) {
      console.log('✅ Vault already built!');
    } else {
      console.log('🔨 Building vault contract...');
      console.log('Running: npx blueprint build');
      
      try {
        // Try non-interactive build
        execSync('npx func-js contracts/vault.fc --output build/vault.fif', { stdio: 'inherit' });
        console.log('✅ Vault built successfully!');
      } catch (e) {
        console.log('⚠️  Direct build failed, trying blueprint...');
        // If direct build fails, try blueprint
        execSync('echo "1" | npx blueprint build', { stdio: 'inherit' });
      }
    }
    
    console.log('\n📱 Now let\'s deploy to testnet!');
    console.log('-'.repeat(40));
    console.log('Make sure TonKeeper is:');
    console.log('  ✓ On TESTNET mode');
    console.log('  ✓ Has ~0.1 TON balance');
    console.log('');
    
    await question('Press ENTER when ready...');
    
    console.log('\n🚀 Starting deployment...');
    console.log('Follow these steps:');
    console.log('  1. Select "deployVault" from menu');
    console.log('  2. Choose "Simple" setup');
    console.log('  3. Enter name: "TonFusionVault"');
    console.log('  4. Scan QR with TonKeeper');
    console.log('  5. Confirm transaction');
    console.log('');
    
    // Run blueprint interactively
    execSync('npx blueprint run', { stdio: 'inherit' });
    
    console.log('\n✅ Deployment complete!');
    
    const vaultAddress = await question('\nEnter the deployed vault address: ');
    
    if (vaultAddress) {
      const deploymentInfo = {
        vaultAddress,
        network: 'testnet',
        timestamp: new Date().toISOString(),
        contractType: 'TonContract_sub Vault',
        features: {
          registerDeposit: true,
          withdrawJetton: true,
          atomicSwaps: true,
          hashlockMechanism: true
        }
      };
      
      fs.writeFileSync('vault-deployment.json', JSON.stringify(deploymentInfo, null, 2));
      console.log('\n💾 Deployment info saved!');
      console.log('📍 Vault address:', vaultAddress);
      console.log('🔗 Explorer:', `https://testnet.tonviewer.com/${vaultAddress}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

deployVault();