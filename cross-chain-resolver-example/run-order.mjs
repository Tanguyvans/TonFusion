#!/usr/bin/env node

// Set required environment variables
process.env.SRC_CHAIN_RPC = process.env.SRC_CHAIN_RPC || 'https://eth.merkle.io';
process.env.DST_CHAIN_RPC = process.env.DST_CHAIN_RPC || 'wss://bsc-rpc.publicnode.com';
process.env.SRC_CHAIN_CREATE_FORK = 'true';
process.env.DST_CHAIN_CREATE_FORK = 'true';

console.log('🚀 Starting Cross-Chain Order Script');
console.log('📡 Using RPC URLs:');
console.log(`  Source: ${process.env.SRC_CHAIN_RPC}`);
console.log(`  Destination: ${process.env.DST_CHAIN_RPC}`);

import { spawn } from 'child_process';

// Use Jest to run our working test
const jest = spawn('npx', [
    'jest', 
    'tests/run-cross-chain-order.spec.ts',
    '--testTimeout=60000',
    '--forceExit',
    '--detectOpenHandles'
], {
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_OPTIONS: '--experimental-vm-modules'
    }
});

jest.on('close', (code) => {
    if (code === 0) {
        console.log('✨ Cross-chain order completed successfully!');
    } else {
        console.log('❌ Cross-chain order failed');
    }
    process.exit(code);
});

jest.on('error', (error) => {
    console.error('💥 Failed to spawn Jest:', error);
    process.exit(1);
});