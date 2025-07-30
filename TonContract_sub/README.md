# Ton Fusion

## Project Structure

- `contracts`: Source code of all smart contracts and their dependencies
- `wrappers`: Wrapper classes implementing `Contract` from ton-core, including serialization primitives and compilation functions
- `tests`: Tests for the contracts
- `scripts`: Scripts used by the project, mainly deployment scripts

## How to Use

### Package install
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

### Deploy & Initiate
```bash
npx blueprint run
```
1. Deploy Vault
2. Init Vault
   - Vault contract address: Address of the vault deployed in step 1

### Test Vault Operations by Scripts
```bash
npx blueprint run
```
1. testTransferNotification_realJettonTransfer
   - Jetton Master address: kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy (USDT on testnet)
   - Destination address (Vault contract): Address of the vault deployed in Deploy & Initiate
   > Note: Ensure your wallet has enough USDT for transfer and TON for gas.
   > 1000000 nano = 1 USDT (decimals = 6), 1 TON = 1000000000 nano (decimals = 9)

2. testWithdrawJetton
   - Vault contract address: Address of the vault deployed in Deploy & Initiate
   - Recipient address (to receive Jettons): Your wallet address

### Sample Vault Address
[https://testnet.tonviewer.com/kQDT_l6aeZu1JrKQvN2SEatwsl6dIvwTscWk8HtZdEpVUWBH](https://testnet.tonviewer.com/kQDT_l6aeZu1JrKQvN2SEatwsl6dIvwTscWk8HtZdEpVUWBH)




