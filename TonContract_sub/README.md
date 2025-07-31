# Ton Fusion

## Project Structure

- `contracts`: Source code of all smart contracts and their dependencies
- `wrappers`: Wrapper classes implementing `Contract` from ton-core, including serialization primitives and compilation functions
- `tests`: Tests for the contracts
- `scripts`: Scripts used by the project, mainly deployment scripts

## How to Use

### Package Installation
```bash
npm install
```

### Build
```bash
npx blueprint build
```
- Choose file to use: Vault

### Test (Not Implemented)
```bash
npx blueprint test
```

### Deploy & Initialize
```bash
npx blueprint run
```
1. deployVault
2. initVault
   - Vault contract address: Address of the vault deployed in step 1

### Test Vault Operations Using Scripts
```bash
npx blueprint run
```
1. testDepositJetton
   - Destination address (Vault contract): Address of the vault deployed in Deploy & Initiate
   - Query ID: decimal value of your choice
   - Secret for Swap ID: string value of your choice, used to lock the asset
   > Note: Ensure your wallet has enough USDT for transfer and TON for gas.

   > 1000000 nano = 1 USDT (decimals = 6), 1 TON = 1000000000 nano (decimals = 9)

2. testWithdrawJetton
   - Vault contract address: Address of the vault deployed in Deploy & Initiate
   - Query ID: must match the Query ID used in testDepositJetton
   - Secret for Swap ID: must match the Secret for Swap ID used in testDepositJetton

**Withdrawal is only possible when both Query ID and Secret for Swap ID match**

### Sample Vault Address
[kQB_ilQesKSefJdv3oUb-2YhdyvrpRcjo1WDfLH1eKdkRhbd](https://testnet.tonviewer.com/kQB_ilQesKSefJdv3oUb-2YhdyvrpRcjo1WDfLH1eKdkRhbd?section=method)





