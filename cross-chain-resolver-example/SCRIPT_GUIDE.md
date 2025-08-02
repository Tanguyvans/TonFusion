# Script Guide - Cross-Chain Resolver

## Environment Setup

### Prerequisites
```bash
# Install dependencies
pnpm install
forge install

# Set environment variables in .env
SRC_CHAIN_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
DST_CHAIN_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
PRIVATE_KEY_1=0x...  # User wallet
PRIVATE_KEY_2=0x...  # Resolver wallet
```

## Deployment Commands

### Deploy Limit Order Protocol (Sepolia)
```bash
cd ../limit-order-protocol
node place-order.js
```

### Deploy Cross-Chain Resolver
```bash
# Build contracts
forge build

# Run tests with testnet fork
SRC_CHAIN_RPC=<ETH_FORK_URL> DST_CHAIN_RPC=<BSC_FORK_URL> pnpm test

# Deploy to testnets (automatic in test suite)
pnpm test -- --testNamePattern="should swap Sepolia WETH -> BSC BNB"
```

## Script Commands

### Check Balances
```bash
node check-balances.js
```
**Output:** ETH, BNB, and WETH balances for both wallets on both testnets

### Create Limit Order
```bash
cd ../limit-order-protocol
node place-order.js
```
**Creates:** Off-chain signed order (1 USDC → 0.0004 WETH)

### Fill Limit Order
```bash
cd ../limit-order-protocol
node fill-order.js
```
**Executes:** On-chain order fulfillment

### Cross-Chain Swap Demo
```bash
node testnet-cross-chain-swap.js
```
**Performs:** 0.001 WETH → 0.001 BNB atomic swap

## SDK Commands

### Install Local SDK
```bash
# SDK already forked and modified for testnet support
cd local-cross-chain-sdk
npm install
```

### Build Contracts
```bash
forge build
```

### Lint Code
```bash
pnpm lint
```

## Test Commands

### Run All Tests
```bash
pnpm test
```

### Run Specific Tests
```bash
# Single fill test
pnpm test -- --testNamePattern="Single fill"

# Multiple fills test
pnpm test -- --testNamePattern="Multiple fills"

# Cancellation test
pnpm test -- --testNamePattern="Cancel"
```

## Explorer Links

### View Transactions
```bash
# Sepolia
https://sepolia.etherscan.io/tx/[TRANSACTION_HASH]

# BSC Testnet
https://testnet.bscscan.com/tx/[TRANSACTION_HASH]
```

### View Contracts
```bash
# Sepolia Limit Order Protocol
https://sepolia.etherscan.io/address/0xb47e3709C8989AC76B9240A29dEd6Dc5C106A0e5

# Sepolia Escrow Factory
https://sepolia.etherscan.io/address/0xf05e194E2DA9C3Cf14Fa4f1334c8673Dd7e0013E

# BSC Testnet Escrow Factory
https://testnet.bscscan.com/address/0x4f2bb4b14EA60898B25291868F519677b3D1c171
```

## Workflow Commands

### Complete Cross-Chain Trade Flow
```bash
# 1. Check initial balances
node check-balances.js

# 2. Create limit order (optional)
cd ../limit-order-protocol && node place-order.js

# 3. Execute cross-chain swap
cd ../cross-chain-resolver-example && node testnet-cross-chain-swap.js

# 4. Verify final balances
node check-balances.js
```

## Troubleshooting

### Common Issues
```bash
# Insufficient funds
# Solution: Fund wallets with testnet ETH/BNB from faucets

# SDK chain validation error
# Solution: Already fixed in local-cross-chain-sdk

# Contract deployment failed
# Solution: Check gas prices and wallet balances
```

### Reset Environment
```bash
# Clean build
forge clean && forge build

# Reinstall dependencies
rm -rf node_modules && pnpm install
```