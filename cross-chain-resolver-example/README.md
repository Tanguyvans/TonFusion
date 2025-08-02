# TonFusion Cross-Chain Resolver

🌉 **First ETH ↔ TON Atomic Swap Implementation**

Complete cross-chain atomic swap system between Ethereum and TON blockchains using 1inch Limit Order Protocol and custom TON vault contracts.

## 🚀 Quick Start

### **ETH → TON Atomic Swap:**
```bash
node eth-ton-cli.js
```

### **Testnet Cross-Chain Swap:**
```bash
node testnet-cross-chain-swap.js
```

## 📋 What This Does

1. **ETH Side**: Creates and executes limit orders on Sepolia
2. **TON Side**: Deposits and withdraws jettons using atomic secrets
3. **Atomic**: Both transfers complete or both fail - no partial execution
4. **Trustless**: No intermediaries, cryptographically secured

## 🏗️ Architecture

- **EVM Contracts**: Solidity contracts in `contracts/src/`
- **TON Contracts**: Located in `../TonContract_sub/`
- **Vault Address**: `EQD--f_k54qs29OKvLUZywXZYLQkDb6Avvv2Lxr5P4G-giua`

## 🔐 Security Features

- SHA256 hashlock mechanism
- Time-locked escrows with automatic refunds
- EIP-712 signed limit orders
- Atomic execution guarantees

## 🎯 Test Results

Successfully demonstrated:
- ✅ Real ETH transactions on Sepolia testnet
- ✅ Real TON transactions on TON testnet
- ✅ Atomic swap completion
- ✅ TonKeeper wallet integration

## 🏆 Achievement

**World's first working ETH ↔ TON atomic swap bridge** - Revolutionary cross-ecosystem DeFi technology!

---

## Installation (Development)

Install dependencies:
```shell
pnpm install
forge install
```

Run tests:
```shell
SRC_CHAIN_RPC=ETH_FORK_URL DST_CHAIN_RPC=BNB_FORK_URL pnpm test
```
