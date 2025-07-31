# TON-EVM Bridge CLI

A command-line interface for deploying and interacting with TON and EVM bridge contracts. This CLI provides seamless integration between TON blockchain and EVM-compatible chains (Ethereum, BSC) using cross-chain swap infrastructure.

## 🚀 Features

- **TON Contract Deployment** - Deploy TON Vault contracts with TonKeeper integration
- **EVM Contract Deployment** - Deploy cross-chain resolver contracts
- **Blueprint Integration** - Full TON Blueprint support with wallet connections
- **Cross-Chain Operations** - Bridge between TON and EVM chains
- **Interactive CLI** - User-friendly command-line interface with prompts

## 📦 Installation

```bash
# Clone and navigate to the project
cd ton-evm-bridge-cli

# Install dependencies
npm install

# Build the project
npm run build
```

## 🔧 Commands

### General Commands

```bash
# Show all available commands
npm run cli -- --help

# Show version
npm run cli -- --version
```

### TON Commands

#### Deploy TON Vault Contract

Deploy a TON Vault contract with TonKeeper wallet integration:

```bash
# Deploy to testnet (recommended for testing)
npm run cli -- ton deploy --testnet

# Deploy to mainnet
npm run cli -- ton deploy

# Show TON command help
npm run cli -- ton --help
```

**Deployment Process:**

1. 🚀 Starts Blueprint deployment system
2. 🔗 Prompts for wallet connection (TonKeeper/TON Connect)
3. 📱 Opens TonKeeper for transaction approval
4. ⚙️ Interactive setup (Simple/Detailed jetton configuration)
5. ⏳ Deploys vault contract to TON blockchain
6. ✅ Shows contract address and confirmation

**Wallet Options:**

- **TON Connect compatible mobile wallet** (TonKeeper - Recommended)
- **Deep link** (ton:// URLs)
- **Mnemonic** (manual seed phrase)

#### Interact with TON Contracts

```bash
# Interact with deployed TON contracts
npm run cli -- ton interact --testnet

# Interact with mainnet contracts
npm run cli -- ton interact
```

### EVM Commands

#### Deploy EVM Resolver Contract

Deploy cross-chain resolver contracts to EVM chains:

```bash
# Deploy EVM contracts
npm run cli -- evm deploy --network sepolia --resolver --escrow-factory --verify
```

#### Interact with EVM Contracts

```bash
# Interact with deployed EVM contracts
npm run cli -- evm interact
```

## 🏗️ Contract Architecture

### TON Vault Contract

The TON Vault contract implements:

- **Cross-chain Swap Management** - Handles TON to EVM swaps
- **Jetton Integration** - Supports standard TON jettons
- **Time-locked Operations** - Secure swap mechanisms
- **Admin Controls** - Contract management features

### EVM Resolver Contract

The EVM Resolver contract provides:

- **1inch Integration** - Uses 1inch cross-chain swap protocol
- **Escrow Management** - Secure fund locking
- **Cross-chain Validation** - Validates TON operations
- **Atomic Swaps** - Ensures transaction atomicity

## 🔗 Wallet Integration

### TON Wallet (TonKeeper)

The CLI integrates with TonKeeper wallet for TON operations:

1. **TON Connect Protocol** - Secure wallet connection
2. **Transaction Signing** - Hardware wallet support
3. **Network Switching** - Automatic testnet/mainnet detection
4. **Balance Checking** - Automatic balance validation

### EVM Wallet (MetaMask)

For EVM operations, the CLI supports:

1. **MetaMask Integration** - Popular browser wallet
2. **WalletConnect** - Mobile wallet connections
3. **Hardware Wallets** - Ledger/Trezor support
4. **Multi-chain Support** - Ethereum, BSC, Polygon

## 📁 Project Structure

```
ton-evm-bridge-cli/
├── contracts/
│   ├── evm/              # Solidity contracts
│   └── ton/              # FunC contracts
├── scripts/
│   └── deployVault.ts    # Blueprint deployment script
├── src/
│   ├── commands/
│   │   ├── evm/          # EVM command implementations
│   │   └── ton/          # TON command implementations
│   ├── utils/            # Utility functions
│   └── index.ts          # CLI entry point
├── wrappers/             # Contract wrappers and compile configs
└── README.md
```

## ⚙️ Configuration

### Blueprint Configuration

The CLI uses Blueprint for TON contract management:

```typescript
// blueprint.config.ts
export const config: Config = {
    network: {
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        type: 'testnet',
        version: 'v2'
    }
};
```

### Environment Variables

Create a `.env` file for configuration:

```bash
# TON Configuration
TON_TESTNET_ENDPOINT=https://testnet.toncenter.com/api/v2/jsonRPC
TON_MAINNET_ENDPOINT=https://toncenter.com/api/v2/jsonRPC

# EVM Configuration  
ETH_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/your-key
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Wallet Configuration
MNEMONIC=your-wallet-mnemonic-for-testing
```

## 🧪 Development

### Building

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run specific command in dev mode
npm run dev ton deploy --testnet
```

### Testing

```bash
# Run tests (if available)
npm test

# Test specific deployment
npm run cli -- ton deploy --testnet
```

## 🔒 Security

### Wallet Security

- **Never commit mnemonics** to version control
- **Use hardware wallets** for mainnet deployments
- **Verify contract addresses** before transactions
- **Test on testnet first** before mainnet deployment

### Contract Security

- **Audit contracts** before mainnet deployment  
- **Use time locks** for critical operations
- **Implement access controls** for admin functions
- **Monitor contract activity** after deployment

## 📚 Examples

### Deploy TON Vault to Testnet

```bash
# Step 1: Build the project
npm run build

# Step 2: Deploy to testnet
npm run cli -- ton deploy --testnet

# Step 3: Follow prompts
# - Select wallet type (TonKeeper recommended)
# - Choose setup type (Simple/Detailed)
# - Enter jetton details
# - Approve transaction in TonKeeper

# Expected output:
# 🚀 Starting TON Vault deployment with Blueprint...
# 📋 Network: testnet
# 🔗 This will open TonKeeper for wallet connection...
# ✅ Deployment completed!
```

### Deploy EVM Resolver

```bash
# Deploy EVM resolver contracts
npm run cli -- evm deploy

# Follow prompts for network selection and configuration
```

## 🐛 Troubleshooting

### Common Issues

**Blueprint not found:**

```bash
npm install @ton/blueprint@^0.25.0 --legacy-peer-deps
```

**Contract compilation fails:**

```bash
# Ensure contract files are in correct location
# Check wrappers/ directory has .compile.ts files
```

**TonKeeper connection fails:**

```bash
# Ensure TonKeeper is installed and updated
# Check network connectivity
# Try mnemonic option as fallback
```

### Debug Mode

```bash
# Run with debug output
DEBUG=* npm run cli -- ton deploy --testnet
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [TON Documentation](https://docs.ton.org/)
- [Blueprint Documentation](https://github.com/ton-org/blueprint)
- [TonKeeper Wallet](https://tonkeeper.com/)
- [1inch Cross-Chain](https://1inch.io/)

---

**Happy Building! 🚀**
