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

3. testRefundJetton
   - Vault contract address: Address of the vault deployed in Deploy & Initiate
   - Query ID: must match the Query ID used in testDepositJetton
   - Secret for Swap ID: must match the Secret for Swap ID used in testDepositJetton

**Important: Both Query ID and Secret for Swap ID must match for Withdrawal and Refund operations**

When switching TON wallets:
1. Delete the existing connection file: `TonContract_sub/temp/testnet/tonconnect.json`
2. Run the script again to establish a new connection

### Sample Vault Address
[kQBBkjy_kUeB8um1BVChq1Uru4MXM8V-CixDZ1XPyLjaKR5v](https://testnet.tonviewer.com/kQBBkjy_kUeB8um1BVChq1Uru4MXM8V-CixDZ1XPyLjaKR5v)


