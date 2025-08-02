# Cross-Chain Resolver - TonFusion

## Overview
Cross-chain atomic swap implementation using 1inch's cross-chain resolver pattern and limit order protocol. Enables WETH → BNB swaps between Sepolia and BSC testnet.

## Contract Addresses

### Sepolia Testnet (Chain ID: 11155111)
- **Limit Order Protocol:** `0xb47e3709C8989AC76B9240A29dEd6Dc5C106A0e5`
- **Escrow Factory:** `0xf05e194E2DA9C3Cf14Fa4f1334c8673Dd7e0013E`
- **Resolver Contract:** `0x676E169F4a6B232d87927dD73cB1c4037ee9a094`
- **WETH Token:** `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`

### BSC Testnet (Chain ID: 97)
- **Escrow Factory:** `0x4f2bb4b14EA60898B25291868F519677b3D1c171`
- **Resolver Contract:** `0x057f2734d699fd06C26A99711C63b5119aAeD2Fd`
- **WBNB Token:** `0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd`

## Test Wallets
- **User Wallet:** `0x504b635B7E22F8DF7d037cf31639811AE583E9f0`
- **Resolver Wallet:** `0xd97E5d514fBD76061e9DAC837B2f23F2517C5fdD`

## Successful Transactions

### Limit Order Protocol (Sepolia)
- **Order Creation:** `0xb94afdea49ac874f53d2345226abb914c595fe2ed597feb2cc849d55e23b06c5`
- **Trade:** 1 USDC → 0.0004 WETH

### Cross-Chain Swap Demo
- **Sepolia WETH Lock:** `0xa1962f1f1e13539698c8e96f713e0c4356aa245bf75ed655d0ae3c3eeead5025`
- **BSC BNB Release:** `0x778faeb7b7094954f9f5d1cfe913ff1d4d543b7e19f6311b9546fc7f4fb1f30d`
- **Amount:** 0.001 WETH ↔ 0.001 BNB

## Architecture
- **Source Chain:** Sepolia (Ethereum testnet)
- **Destination Chain:** BSC Testnet
- **Swap Mechanism:** Atomic cross-chain with escrow contracts
- **SDK:** Modified 1inch Cross-Chain SDK with testnet support

## Key Features
- ✅ Gas-free limit order creation
- ✅ Atomic cross-chain execution
- ✅ Testnet deployment and testing
- ✅ Dutch auction mechanism
- ✅ Multiple fill support
- ✅ Secret/hash management for security