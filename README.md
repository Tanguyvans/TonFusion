# TonFusion: Extend Fusion+ to TON

A hybrid blockchain project that enables atomic cross-chain swaps between TON blockchain and EVM chains using 1inch's cross-chain swap infrastructure and Hash Time-Locked Contracts (HTLCs).

## Table of Contents

- [Overview](#overview)
- [Hash Time-Locked System](#hash-time-locked-system)
- [Architecture](#architecture)
- [TON-ETH Implementation Guide](#ton-eth-implementation-guide)
- [Development Setup](#development-setup)
- [Testing](#testing)

## Demo

🚀 **To run the atomic swap demos, check out the `demo` branch!**

The `demo` branch contains:
- Complete ETH ↔ TON atomic swap implementations  
- Step-by-step demo instructions in [RUN_DEMO.md](https://github.com/Tanguyvans/TonFusion/blob/demo/RUN_DEMO.md)
- Contract addresses and setup guides
- Both ETH→TON and TON→ETH demo flows

## Overview

TonFusion implements a trustless cross-chain swap protocol that ensures atomic transactions between TON and Ethereum networks. The system guarantees that either both parties receive their funds (successful swap) or both parties get their original funds back (cancelled swap), with no scenario where only one party benefits.

### Key Features

- **Hash Time-Locked System**: Cryptographic security with time-based failsafes
- **Atomic Swaps**: Guaranteed all-or-nothing transactions
- **Multi-chain Support**: TON ↔ EVM
- **Trustless Operation**: No intermediary custody of funds

## Hash Time-Locked System

### Core Mechanism

The hash lock system uses cryptographic hashes to ensure atomic cross-chain swaps:

1. **Secret input**: User inputs a secret string
2. **Hash Lock Creation**: Secret is hashed using SHA256 to create the lock
3. **Dual Escrow Deployment**: Both chains deploy escrows with identical hash locks
4. **Atomic Reveal**: Revealing the secret on one chain enables claims on both chains

### Security Guarantees

- **Atomicity**: Either both parties succeed or both get refunds
- **Time-based Protection**: Multiple timeout periods prevent fund lockup
- **Cryptographic Security**: SHA256 hash ensures only secret holder can unlock

### Flow Example

```
User (TON) ←→ Resolver ←→ User (ETH)
    ↓              ↓           ↓
1. User inputs secret
2. Create hash lock (SHA256(secret))
3. Deploy escrows / register swaps info on both chains with same hash lock
4. User reveals secret on ETH to claim funds
5. Resolver uses revealed secret to claim on TON
```

## Architecture

### Components

1. **Cross-chain Resolver** (`cross-chain-resolver-example/`): EVM implementation using 1inch's protocol
2. **TON Escrow Contract** (`TonContract_main/`): TON blockchain smart contracts (Blueprint framework)

### Current EVM Implementation

The existing resolver demonstrates the pattern for Ethereum ↔ BSC swaps:

- `Resolver.sol`: Main resolver contract validating and executing swaps
- `TestEscrowFactory.sol`: Factory for creating escrow contracts
- Hash-based atomic settlement with multiple time locks

## TON-ETH Implementation Guide

### TON Escrow Contract Design

Create a FunC smart contract that implements the HTLC pattern:

**Storage Structure:**
```func
storage::stopped,
storage::jetton_master,
storage::jetton_wallet,
storage::dict_swaps_info
```
Each swap entry in `storage::dict_swaps_info` is structured as:
```func
storage::dict_swaps_info
    64,
    query_id,
    begin_cell()
        .store_uint(swap_id, 256)         ;; 256-bit unique swap identifier
        .store_uint(eth_addr, 160)        ;; Ethereum address (160-bit)
        .store_slice(ton_addr)            ;; TON address (MsgAddress)
        .store_coins(amount)              ;; Swap amount
        .store_uint(creation_timestamp, 32)
        .store_uint(withdrawal_deadline, 32)
        .store_uint(public_withdrawal_deadline, 32)
        .store_uint(cancellation_deadline, 32)
        .store_uint(public_cancellation_deadline, 32)
        .store_uint(status, 2)            ;; 2-bit status: 0=init, 1=completed, 2=refunded
```

### Contract Functions

#### Deposit Function (op::transfer_notification())
```func
 if (op == op::transfer_notification()) {
        ;; Check if the contract is stopped
        throw_unless(er::vault_is_stopped(), storage::stopped != -1);
        
        ;; Calculate gas 
        int required_gas = gas_basic_processing_consumption() + ;;（0.005 TON）
                gas_storage_load_consumption() +      ;;（0.005 TON）
                gas_dict_update_consumption() +       ;;（0.005 TON）
                gas_storage_save_consumption();       ;;（0.005 TON）: Total: 0.02 TON

        ;; Check if the required gas is available
        throw_unless(er::insufficient_gas(), msg_value >= required_gas);
        
        ;; Get parameters
        int amount = in_msg_body~load_coins();           ;; Amount to deposit
        slice sender_address = in_msg_body~load_msg_addr(); ;; address which sent jetton
        cell forward_payload = in_msg_body~load_maybe_ref(); ;; 
        cell custom_payload = in_msg_body~load_maybe_ref(); ;; 
        
        ;; Parse forward_payload if it exists
        if (~ forward_payload.null?()) {
            slice payload_slice = forward_payload.begin_parse();
            int op_code = payload_slice~load_uint(32); ;; Check op_code
            
            if (op_code == op::register_deposit()) { ;; Only process if it's register_deposit
                int swap_id = payload_slice~load_uint(256);         ;; Swap ID (SHA256 hash as int)
                int eth_addr = payload_slice~load_uint(160);  ;; Ethereum address (160 bits)
                slice ton_addr = payload_slice~load_msg_addr(); ;; TON address (MsgAddress)
                int withdrawal_deadline = payload_slice~load_uint(32);         ;; Withdrawal deadline (32 bits)
                int public_withdrawal_deadline = payload_slice~load_uint(32);  ;; Public withdrawal deadline (32 bits)
                int cancellation_deadline = payload_slice~load_uint(32);       ;; Cancellation deadline (32 bits)
                int public_cancellation_deadline = payload_slice~load_uint(32); ;; Public cancellation deadline (32 bits)
                
                ;; Only update storage if forward_payload is valid
                update_swaps_info(query_id, swap_id, eth_addr, ton_addr, amount, now(), withdrawal_deadline, public_withdrawal_deadline, cancellation_deadline, public_cancellation_deadline, 0);
                save_storage();
            }
        }
        return ();
    }
```

#### Withdraw Function(op::withdraw_jetton())
```func
if (op == op::withdraw_jetton()) {
        ;; Check if the contract is stopped
        throw_unless(er::vault_is_stopped(), storage::stopped != -1);

        ;; Calculate required gas
        int required_gas = gas_storage_load_consumption() + ;; 0.005 TON
                        gas_dict_update_consumption() + ;; 0.005 TON
                        gas_storage_save_consumption() + ;; 0.005 TON
                        gas_jetton_transfer_consumption(); ;; 0.05 TON Total: 0.065 TON
        
        ;; Check if the required gas is available
        throw_unless(er::insufficient_gas(), msg_value >= required_gas);
        
        ;; Load parameters
        slice to_address = in_msg_body~load_msg_addr();  ;; To address
        int amount = in_msg_body~load_coins();           ;; Load parameters
        cell secret_cell = in_msg_body~load_ref();       ;; Received secret as cell
        slice secret_slice = secret_cell.begin_parse();  ;; Parse cell to slice
        int swap_id = slice_hash(secret_slice);          ;; Compute sha256(secret) as int

        ;; Load SwapsInfoID 
        (int stored_swap_id, int eth_addr, slice ton_addr, int stored_amount, int creation_timestamp, int withdrawal_deadline, int public_withdrawal_deadline, int cancellation_deadline, int public_cancellation_deadline, int status) = load_swaps_info(query_id);
        
        ;; Check basic conditions
        throw_unless(er::invalid_query_id(), eth_addr != 0);
        throw_unless(er::invalid_swap_time(), now() >= creation_timestamp);
        throw_unless(er::invalid_swap_id(), stored_swap_id == swap_id);
        throw_unless(er::invalid_swap_amount(), amount <= stored_amount);
        throw_unless(er::invalid_swap_status(), status == 0);

        ;; Check time and permited withdrawer address
        if (now() <= withdrawal_deadline) {
            ;; intended participant only withdraw is allowed
            throw_unless(er::invalid_swap_withdrawer(), equal_slices(to_address, ton_addr));
        } else {
            if (now() <= public_withdrawal_deadline) {
                ;; public withdraw period (anyone can withdraw)
            } else {
                ;; otherwise withdraw is not allowed by anyone
                throw(er::invalid_swap_time());
            }
        }
        
        ;; Create jetton transfer message body
        cell transfer_body = begin_cell()
            .store_uint(op::jetton_transfer(), 32)  ;; Jetton transfer operation code
            .store_uint(query_id, 64)               ;; query_id
            .store_coins(amount)                   ;; Amount
            .store_slice(to_address)               ;; To address
            .store_slice(sender_address)           ;; Response address
            .store_uint(0, 1)                      ;; custom_payload is empty
            .store_coins(0)                        ;; forward_ton_amount: 0 nanoTON
            .store_uint(0, 1)                      ;; forward_payload is empty
            .end_cell();
        
        ;; Jetton wallet message
        cell msg = begin_cell()
            .store_uint(0x18, 6)                  ;; Flag
            .store_slice(storage::jetton_wallet)   ;; Send to Vault's Jetton wallet
            .store_coins(gas_jetton_transfer_consumption())                       ;; Send TON amount (Jetton wallet pays for gas)
            .store_uint(1, 107)                   ;; Default value
            .store_ref(transfer_body)             ;; Transfer message body
            .end_cell();
        
        ;; Send message
        send_raw_message(msg, 1);  ;; Mode 1
        
        ;; Calculate new stored amount and status
        int new_stored_amount = stored_amount - amount;
        int new_status = status;
        if (new_stored_amount == 0) {
            new_status = 1;
        }
        ;; Update storage
        update_swaps_info(query_id, swap_id, eth_addr, ton_addr, new_stored_amount, creation_timestamp, withdrawal_deadline, public_withdrawal_deadline, cancellation_deadline, public_cancellation_deadline, new_status);
        save_storage();
        
        return ();
    }

```

#### Cancel Function(op::refund_jetton())
```func
 if (op == op::refund_jetton()) {
        ;; Check if the contract is stopped
        throw_unless(er::vault_is_stopped(), storage::stopped != -1);

        ;; Calculate required gas
        int required_gas = gas_storage_load_consumption() +
                        gas_dict_update_consumption() +
                        gas_storage_save_consumption() +
                        gas_jetton_transfer_consumption();
        throw_unless(er::insufficient_gas(), msg_value >= required_gas);

        ;; Load parameters
        slice to_address = in_msg_body~load_msg_addr();  ;; To address
        int amount = in_msg_body~load_coins();           ;; Load parameters
        cell secret_cell = in_msg_body~load_ref();       ;; Received secret as cell
        slice secret_slice = secret_cell.begin_parse();  ;; Parse cell to slice
        int swap_id = slice_hash(secret_slice);          ;; Compute sha256(secret) as int

        ;; Load SwapsInfoID
        (int stored_swap_id, int eth_addr, slice ton_addr, int stored_amount, int creation_timestamp, int withdrawal_deadline, int public_withdrawal_deadline, int cancellation_deadline, int public_cancellation_deadline, int status) = load_swaps_info(query_id);
        
        ;; Basic checks
        throw_unless(er::invalid_query_id(), eth_addr != 0);
        throw_unless(er::invalid_swap_time(), now() >= public_withdrawal_deadline);
        throw_unless(er::invalid_swap_id(), stored_swap_id == swap_id);
        throw_unless(er::invalid_swap_amount(), amount <= stored_amount);
        throw_unless(er::invalid_swap_status(), status == 0);

        ;; Time and permission checks
        if (now() <= cancellation_deadline) {
            ;; Only original depositor can refund
            throw_unless(er::invalid_swap_withdrawer(), equal_slices(sender_address, ton_addr));
        } else {
            if (now() <= public_cancellation_deadline) {
                ;; Anyone can refund
            } else {
                throw(er::invalid_swap_time());
            }
        }
        
        ;; Create jetton transfer message body
        cell transfer_body = begin_cell()
            .store_uint(op::jetton_transfer(), 32)
            .store_uint(query_id, 64)
            .store_coins(amount)
            .store_slice(to_address)
            .store_slice(sender_address)
            .store_uint(0, 1)
            .store_coins(0)
            .store_uint(0, 1)
            .end_cell();
        cell msg = begin_cell()
            .store_uint(0x18, 6)
            .store_slice(storage::jetton_wallet)
            .store_coins(gas_jetton_transfer_consumption())
            .store_uint(1, 107)
            .store_ref(transfer_body)
            .end_cell();
        send_raw_message(msg, 1);
        int new_stored_amount = stored_amount - amount;
        int new_status = status;
        if (new_stored_amount == 0) {
            new_status = 2;  ;; refunded
        }
        update_swaps_info(query_id, swap_id, eth_addr, ton_addr, new_stored_amount, creation_timestamp, withdrawal_deadline, public_withdrawal_deadline, cancellation_deadline, public_cancellation_deadline, new_status);
        save_storage();
        return ();
    }
```

### Time Locks Design 
**Time Locks Variable Summary Table:**

| Function                      | Variable Name.                   | Description                                                        | Who Can Operate           | Secret Required? | Status Transition         |
|-------------------------------|----------------------------------|--------------------------------------------------------------------|---------------------------|------------------|--------------------------|
| Standard withdrawal deadline   | `withdrawal_deadline`            | Last moment when standard withdraw is allowed                      | Intended participant      | Yes              | completed (withdrawn)     |
| Public withdrawal deadline     | `public_withdrawal_deadline`     | Last moment when public withdraw is allowed                        | Anyone                   | Yes (must know)  | completed (withdrawn)     |
| Cancellation deadline         | `cancellation_deadline`          | Last moment when standard cancellation (refund) is allowed         | Depositor                | Yes              | refunded (canceled)       |
| Public cancellation deadline  | `public_cancellation_deadline`   | Last moment when public cancellation (refund) is allowed           | Anyone                   | Yes (must know)  | refunded (canceled)       |

Each variable is a UNIX timestamp (uint32), and their meanings are consistent across all swap directions.


### Integration with Existing Resolver

Modify the existing `Resolver.sol` to support TON interactions:

```solidity
// Add TON-specific functions
function deployTonEscrow(
    address tonEscrowAddress,
    bytes32 hashLock,
    uint256 amount,
    address maker,
    TimeLocks memory timeLocks
) external onlyOwner {
    // Interact with TON blockchain via bridge/oracle
    // Deploy escrow contract on TON with matching parameters
}

function withdrawFromTon(
    address tonEscrowAddress,
    bytes32 secret
) external {
    // Trigger withdrawal on TON escrow using revealed secret
}
```

### Cross-Chain Communication

Implement communication layer between TON and Ethereum:
- Implement TON light client on Ethereum
- Verify TON transactions cryptographically

### Complete Flow Implementation

#### TON → ETH Swap Flow

1. **User Creates Order** (TON)
   ```typescript
   // User deploys TON escrow with funds
   const tonEscrow = await deployTonEscrow({
       maker: userAddress,
       amount: parseCoins('100'), // 100 TON
       hashLock: SHA256(secret),
       timeLocks: tonTimeLocks
   });
   ```

2. **Resolver Fills Order** (ETH)
   ```typescript
   // Resolver deploys ETH escrow
   const ethEscrow = await resolver.deployDst({
       taker: resolverAddress,
       amount: parseEther('99'), // 99 ETH equivalent
       hashLock: SHA256(secret),
       timeLocks: ethTimeLocks
   });
   ```

3. **User Withdraws** (ETH)
   ```typescript
   // User reveals secret to claim ETH
   await ethEscrow.withdraw(secret);
   ```

4. **Resolver Withdraws** (TON)  
   ```typescript
   // Resolver uses revealed secret to claim TON
   await tonEscrow.withdraw(secret);
   ```

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm
- TON Development Environment
    - Blueprint
    - TonClient
- Foundry (for EVM contracts)

### Cross-chain Resolver Setup

```bash
cd cross-chain-resolver-example
pnpm install
forge install

# Run tests
SRC_CHAIN_RPC=<ETH_FORK_URL> DST_CHAIN_RPC=<BSC_FORK_URL> pnpm test
```

### TON Contracts Setup

Package Installation
```bash
npm install
```

Build
```bash
npx blueprint build
```

Deploy & Initialize
```bash
npx blueprint run
```
1. deployVault
2. initVault
   - Vault contract address: Address of the vault deployed in step 1

## Testing

### EVM Tests
- Jest with SWC for TypeScript transpilation
- Prool for local blockchain forking
- Predefined test accounts for consistent testing

### TON Tests
- TON Sandbox for local testing
- Jest with ts-jest preset
- Standard TON test utilities

### Integration Tests
- End-to-end cross-chain swap scenarios
- Timeout and cancellation edge cases
- Security vulnerability testing

## License

MIT License - see LICENSE file for details
