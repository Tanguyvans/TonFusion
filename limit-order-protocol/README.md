<div align="center">
    <img src="https://github.com/1inch/limit-order-protocol/blob/master/.github/1inch_github_w.svg#gh-light-mode-only">
    <img src="https://github.com/1inch/limit-order-protocol/blob/master/.github/1inch_github_b.svg#gh-dark-mode-only">
</div>

# 1inch Limit Order Protocol Smart Contract

[![Build Status](https://github.com/1inch/limit-order-protocol/workflows/CI/badge.svg)](https://github.com/1inch/limit-order-protocol/actions)
[![Coverage Status](https://codecov.io/gh/1inch/limit-order-protocol/branch/master/graph/badge.svg?token=FSFTJPS41S)](https://codecov.io/gh/1inch/limit-order-protocol)

### Version warning

The `master` branch contains the latest work-in-progress version of limit orders. It hasn't been audited and may contain severe security issues or may not work at all.

Please, use the commit tagged version to get the latest production version that has passed through a series of security audits:

- tag `4.3.2` [Fee Flow in Limit order protocol v4](https://github.com/1inch/limit-order-protocol/tree/4.3.2) / [secure audits](https://github.com/1inch/1inch-audits/tree/master/Fees%20for%20LO%20and%20Fusion%20V1)
- tag `4.0.0` [Limit order protocol v4](https://github.com/1inch/limit-order-protocol/tree/4.0.0) / [security audits](https://github.com/1inch/1inch-audits/tree/master/Aggregation%20Pr.%20V6%20and%20Limit%20Order%20Pr.V4)
- tag `3.0.1` [Limit order protocol v3](https://github.com/1inch/limit-order-protocol/tree/3.0.1) / [security audits](https://github.com/1inch/1inch-audits/tree/master/Aggregation%20Pr.%20V5%20and%20Limit%20Order%20Pr.V3)
- tag `v2` - [Limit order protocol v2](https://github.com/1inch/limit-order-protocol/tree/v2) / [security audits](https://github.com/1inch/1inch-audits/tree/master/Limit%20Order%20Protocol%20V2)

### About

You can find the latest general overview and documentation on the 1inch limit orders protocol in the [description.md](description.md). Documentation for this and previous versions can be found on the [1inch documentation portal](https://docs.1inch.io/docs/limit-order-protocol/introduction/).

The repository contains smart contracts for EVM-based blockchains (such as Ethereum, Binance Smart Chain, etc.). These contracts are a core part of the 1inch limit order protocol, allowing users to create limit orders off-chain that can be filled on-chain. A limit order is a data structure signed according to EIP-712.

### Limit Order

The key features of the protocol are **extreme flexibility** and **high gas efficiency**, which are achieved with the following features

**Basic features**

- Select an asset receiver for an order.
- Choose whether to allow or disallow partial and multiple fills.
- Define conditions that must be met before execution can proceed (e.g. stop-loss, take-profit orders).
- Specify interactions (arbitrary maker's code) to execute before and after order filling.
- Choose an approval scheme for token spend (approve, permit, permit2).
- Request that WETH be unwrapped to ETH either before (to sell ETH) or after the swap (to receive ETH).
- Make an order private by specifying the only allowed taker's address.
- Set the order's expiration date.
- Assign a nonce or epoch to the order for easy cancellation later.

**Advanced features**

- Define a proxy to handle transfers of assets that are not compliant with `IERC20`, allowing the swapping of non-ERC20 tokens, such as ERC721 or ERC1155.
- Define functions to calculate, on-chain, the exchange rate for maker and taker assets. These functions can be used to implement dutch auctions (where the rate decreases over time) or range orders (where the rate depends on the volume already filled), among others.

### RFQ orders

Separate RFQ order are deprecated in v4. To create the most gas efficient order use a basic order without extensions.

### Supported tokens

- ERC 20
- ERC 721
- ERC 1155
- Other token standards could be supported via external extension

### Deployments & audits (Limit Orders Protocol v4):

You can find 1inch Router v6 and 1inch Limit Order protocol v4 deployments here:

**Ethereum mainnet:** [0x111111125421ca6dc452d289314280a0f8842a65](https://etherscan.io/address/0x111111125421ca6dc452d289314280a0f8842a65)

**BSC mainnet:** [0x111111125421ca6dc452d289314280a0f8842a65](https://bscscan.com/address/0x111111125421ca6dc452d289314280a0f8842a65#code)

**Polygon mainnet:** [0x111111125421ca6dc452d289314280a0f8842a65](https://polygonscan.com/address/0x111111125421ca6dc452d289314280a0f8842a65#code)

**Optimism Mainnet:** [0x111111125421ca6dc452d289314280a0f8842a65](https://optimistic.etherscan.io/address/0x111111125421ca6dc452d289314280a0f8842a65#code)

**Arbitrum One:** [0x111111125421ca6dc452d289314280a0f8842a65](https://arbiscan.io/address/0x111111125421ca6dc452d289314280a0f8842a65#code)

**Gnosis Chain:** [0x111111125421ca6dc452d289314280a0f8842a65](https://blockscout.com/xdai/mainnet/address/0x111111125421ca6dc452d289314280a0f8842a65/transactions)

**Avalanche:** [0x111111125421ca6dc452d289314280a0f8842a65](https://snowtrace.io/address/0x111111125421ca6dc452d289314280a0f8842a65#code)

**Fantom:** [0x111111125421ca6dc452d289314280a0f8842a65](https://ftmscan.com/address/0x111111125421ca6dc452d289314280a0f8842a65#code)

**Aurora:** [0x111111125421ca6dc452d289314280a0f8842a65](https://aurorascan.dev/address/0x111111125421ca6dc452d289314280a0f8842a65)

**Kaia:** [0x111111125421ca6dc452d289314280a0f8842a65](https://kaiascan.io/address/0x111111125421ca6dc452d289314280a0f8842a65)

**Base:** [0x111111125421ca6dc452d289314280a0f8842a65](https://basescan.org/address/0x111111125421ca6dc452d289314280a0f8842a65#code)

**zkSync Era:** [0x6fd4383cb451173d5f9304f041c7bcbf27d561ff](https://era.zksync.network/address/0x6fd4383cb451173d5f9304f041c7bcbf27d561ff#code)

You can find audit reports on etherscan and in the separate [audit repository](https://github.com/1inch/1inch-audits/tree/master/Limit%20Order%20Protocol).

### Utils library (Limit Orders Protocol v4)
Plenty of utils that helps create & sign orders are available in our typescript utils library:

- [1inch Limit Order Utils](https://github.com/1inch/limit-order-protocol-utils)

---

## 🚀 Custom Deployment for Hackathon

### Sepolia Testnet Deployment

For hackathon purposes, we have deployed a custom instance on Sepolia testnet:

- **Contract Address**: `0x2e4c226467d2Cc07a6373ce68c0b670e84496891`
- **Network**: Sepolia Testnet
- **Status**: ✅ Deployed and Verified
- **Explorer**: https://sepolia.etherscan.io/address/0x2e4c226467d2Cc07a6373ce68c0b670e84496891#code

### Prerequisites for Deployment

1. **Node.js** (v18+ recommended)
2. **Funded Sepolia wallet** with ETH for gas fees
3. **Etherscan API key** for contract verification

### Setup Environment

Create a `.env` file with your credentials:

```bash
# Network RPC URLs
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Private key for deployment (use a test wallet!)
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY

# Gas settings
GAS_PRICE_GWEI=20
```

### Installation Commands

```bash
# Install dependencies
npm install --legacy-peer-deps
```

### Deployment Commands

#### Deploy to Sepolia Testnet

```bash
# Deploy LimitOrderProtocol to Sepolia
npx hardhat run scripts/simple-deploy.js --network sepolia --config hardhat.config.minimal.js
```

**Expected Output:**
```
============================================================
🚀 Deploying 1inch Limit Order Protocol to Network
============================================================
Network: sepolia Chain ID: 11155111
📋 Deploying LimitOrderProtocol...
✅ LimitOrderProtocol deployed to: 0x[CONTRACT_ADDRESS]
⏳ Waiting for confirmations...
✅ Deployment completed successfully!
```

#### Verify Contract on Etherscan

```bash
# Verify the deployed contract
npx hardhat run scripts/verify-sepolia.js --network sepolia --config hardhat.config.minimal.js
```

**Expected Output:**
```
🔍 Verifying LimitOrderProtocol on Sepolia...
📤 Submitting to Etherscan...
Successfully verified contract LimitOrderProtocol on the block explorer.
✅ Verification successful!
🔗 https://sepolia.etherscan.io/address/0x[CONTRACT_ADDRESS]#code
```

### Contract Details

```json
{
  "network": "sepolia",
  "chainId": 11155111,
  "contracts": {
    "LimitOrderProtocol": "0x2e4c226467d2Cc07a6373ce68c0b670e84496891",
    "WETH": "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
  },
  "timestamp": "2025-07-31T22:03:36.664Z",
  "txHash": "0x9f5f25417a637eccb3cc0f431d8a2515c187fbb225659fd118c63b8cdafd7cb5"
}
```

### Cross-Chain Integration

This deployment is designed for TON-EVM bridge integration:

1. **TON Side**: Users create swap requests on TON blockchain
2. **EVM Side**: Limit orders created using this deployed contract
3. **Execution**: Resolvers coordinate atomic swaps between chains
4. **Settlement**: Funds move securely with hashlock/timelock protection

### Gas Costs on Sepolia

- **Deployment**: ~2,500,000 gas (~0.05 ETH)
- **Create Order**: ~80,000 gas
- **Fill Order**: ~150,000 gas
- **Cancel Order**: ~50,000 gas

### Troubleshooting

**Deployment Fails:**
- Check wallet has sufficient Sepolia ETH
- Verify SEPOLIA_RPC_URL is accessible
- Ensure PRIVATE_KEY has correct format (0x prefix)

**Verification Fails:**
- Ensure ETHERSCAN_API_KEY is set
- Wait 30 seconds after deployment before verifying
- Check network connectivity

**Ready for Cross-Chain Bridge Integration! 🚀**
