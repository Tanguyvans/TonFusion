# Ton Fusion

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build
`npx blueprint build`
> ? Choose file to use: Vault

### Test(Not implemented)
`npx blueprint test`

### Deploy & initiate
`npx blueprint run`
Step1: deployVault
Step2: initVault
- Vault contract address: the address of the vault contract deployed in Step1: deployVault 

### Test vault operations by scripts
`npx blueprint run`
Step1: testTransferNotification_realJettonTransfer
    - Jetton Master address: kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy (USDT on testnet)
    - Destination address (Vault contract): the address of the vault contract deployed in Deploy & initiate
    * make sure your wallet has enough USDT for transfer and TON for gas.
    * 1000000 nano = 1 USDT (decimals =6), 1 TON = 1000000000 nano (decimals =9)
    
Step2: testWithdrawJetton
    - Vault contract address: the address of the vault contract deployed in Deploy & initiate
    - Recipient address (to receive Jettons): your wallet address

Sample vault address:
https://testnet.tonviewer.com/kQDT_l6aeZu1JrKQvN2SEatwsl6dIvwTscWk8HtZdEpVUWBH



