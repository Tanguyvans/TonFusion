# TonFusion: TON-ETH Cross-Chain Bridge

A hybrid blockchain project that enables atomic cross-chain swaps between TON blockchain and EVM chains (Ethereum/BSC) using 1inch's cross-chain swap infrastructure and Hash Time-Locked Contracts (HTLCs).

## Table of Contents

- [Overview](#overview)
- [Hash Lock System](#hash-lock-system)
- [Architecture](#architecture)
- [TON-ETH Implementation Guide](#ton-eth-implementation-guide)
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Deployment](#deployment)

## Overview

TonFusion implements a trustless cross-chain swap protocol that ensures atomic transactions between TON and Ethereum networks. The system guarantees that either both parties receive their funds (successful swap) or both parties get their original funds back (cancelled swap), with no scenario where only one party benefits.

### Key Features

- **Atomic Swaps**: Guaranteed all-or-nothing transactions
- **Hash Time-Locked Contracts**: Cryptographic security with time-based failsafes
- **Multi-chain Support**: TON ↔ Ethereum/BSC
- **Trustless Operation**: No intermediary custody of funds

## Hash Lock System

### Core Mechanism

The hash lock system uses cryptographic hashes to ensure atomic cross-chain swaps:

1. **Secret Generation**: User generates a random 32-byte secret
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
1. Generate secret
2. Create hash lock (SHA256(secret))
3. Deploy escrows on both chains with same hash lock
4. User reveals secret on ETH to claim funds
5. Resolver uses revealed secret to claim on TON
```

## Architecture

### Components

1. **Cross-chain Resolver** (`cross-chain-resolver-example/`): EVM implementation using 1inch's protocol
2. **TON Integration** (`ton-start/`): TON blockchain smart contracts (Blueprint framework)

### Current EVM Implementation

The existing resolver demonstrates the pattern for Ethereum ↔ BSC swaps:

- `Resolver.sol`: Main resolver contract validating and executing swaps
- `TestEscrowFactory.sol`: Factory for creating escrow contracts
- Hash-based atomic settlement with multiple time locks

## TON-ETH Implementation Guide

### Step 1: TON Escrow Contract Design

Create a FunC smart contract that implements the HTLC pattern:

```func
;; TON Escrow Contract State
global int status;           ;; 0=active, 1=withdrawn, 2=cancelled
global slice maker;          ;; recipient address
global slice taker;          ;; depositor/resolver address
global slice jetton_master;  ;; token contract (or null for TON)
global int amount;           ;; locked amount
global int hash_lock;        ;; SHA256 hash of secret
global int deployed_at;      ;; deployment timestamp
global int withdrawal_time;  ;; when withdrawal becomes available
global int public_withdrawal_time;   ;; when anyone can trigger withdrawal
global int cancellation_time;        ;; when cancellation becomes available
global int public_cancellation_time; ;; when anyone can cancel
```

### Step 2: Contract Functions

#### Deposit Function
```func
() deposit(slice maker_address, int hash_lock, int withdrawal_time, 
          int public_withdrawal_time, int cancellation_time, 
          int public_cancellation_time) impure {
    throw_unless(100, status == 0);  ;; must be uninitialized
    
    maker = maker_address;
    hash_lock = hash_lock;
    deployed_at = now();
    withdrawal_time = deployed_at + withdrawal_time;
    public_withdrawal_time = deployed_at + public_withdrawal_time;
    cancellation_time = deployed_at + cancellation_time;
    public_cancellation_time = deployed_at + public_cancellation_time;
    status = 1;  ;; active
}
```

#### Withdraw Function
```func
() withdraw(slice secret) impure {
    throw_unless(101, status == 1);  ;; must be active
    throw_unless(102, now() >= withdrawal_time);  ;; respect time lock
    
    int secret_hash = sha256(secret);
    throw_unless(103, secret_hash == hash_lock);  ;; verify secret
    
    ;; Transfer funds to maker
    if (jetton_master.null?()) {
        send_raw_message(begin_cell()
            .store_uint(0x18, 6)
            .store_slice(maker)
            .store_coins(amount)
            .store_uint(0, 107)
        .end_cell(), 3);
    } else {
        ;; Handle Jetton transfer
        transfer_jetton(maker, amount);
    }
    
    status = 2;  ;; withdrawn
}
```

#### Cancel Function
```func
() cancel() impure {
    throw_unless(104, status == 1);  ;; must be active
    throw_unless(105, now() >= cancellation_time);  ;; respect time lock
    
    ;; Return funds to taker
    if (jetton_master.null?()) {
        send_raw_message(begin_cell()
            .store_uint(0x18, 6)
            .store_slice(taker)
            .store_coins(amount)
            .store_uint(0, 107)
        .end_cell(), 3);
    } else {
        ;; Handle Jetton transfer
        transfer_jetton(taker, amount);
    }
    
    status = 3;  ;; cancelled
}
```

### Step 3: Time Lock Configuration

Configure time locks to match the EVM implementation:

```typescript
const timeLocks = {
    tonWithdrawal: 10,      // 10s finality lock
    tonPublicWithdrawal: 120, // 2m private withdrawal  
    tonCancellation: 121,    // 1s public withdrawal
    tonPublicCancellation: 122, // 1s private cancellation
    
    ethWithdrawal: 10,       // 10s finality lock
    ethPublicWithdrawal: 100, // 100s private withdrawal
    ethCancellation: 101     // 1s public withdrawal
}
```

### Step 4: Integration with Existing Resolver

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

### Step 5: Cross-Chain Communication

Implement communication layer between TON and Ethereum:

#### Option A: Oracle-based Bridge
- Deploy oracle contracts on both chains
- Oracle validates transactions and relays state
- Higher trust assumptions but simpler implementation

#### Option B: Light Client Verification
- Implement TON light client on Ethereum
- Verify TON transactions cryptographically
- More complex but fully trustless

### Step 6: Complete Flow Implementation

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

### Step 7: Testing Strategy

Create comprehensive tests covering:

```typescript
describe('TON-ETH Cross-Chain Swaps', () => {
    it('should complete successful TON → ETH swap', async () => {
        // Test happy path
    });
    
    it('should handle timeout cancellation', async () => {
        // Test cancellation scenarios
    });
    
    it('should prevent double spending', async () => {
        // Test security edge cases
    });
    
    it('should handle partial fills', async () => {
        // Test partial execution scenarios
    });
});
```

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm
- TON Development Environment
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

```bash
cd ton-start
npm install

# Build contracts
npm run build

# Run tests
npm test

# Deploy contracts
npm start
```

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

## Deployment

### Testnet Deployment

1. **Deploy EVM Contracts**
   ```bash
   # Deploy to Ethereum Sepolia
   forge script --chain sepolia --broadcast --verify
   
   # Deploy to BSC Testnet  
   forge script --chain bsc-testnet --broadcast --verify
   ```

2. **Deploy TON Contracts**
   ```bash
   # Deploy to TON Testnet
   npx blueprint run --testnet
   ```

3. **Configure Cross-Chain Parameters**
   - Set matching time locks across chains
   - Configure oracle/bridge addresses
   - Test with small amounts first

### Mainnet Considerations

- **Security Audits**: Complete professional security audit
- **Gradual Rollout**: Start with limited amounts and supported tokens
- **Monitoring**: Implement comprehensive logging and alerting
- **Emergency Procedures**: Define pause mechanisms and recovery processes

## Security Considerations

- **Time Lock Validation**: Ensure proper time lock sequencing
- **Secret Generation**: Use cryptographically secure randomness
- **Oracle Security**: If using oracles, implement multiple validators
- **Upgrade Mechanisms**: Plan for contract upgrades while maintaining security
- **Emergency Stops**: Implement circuit breakers for unusual conditions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with comprehensive tests
4. Submit a pull request with detailed description

## License

MIT License - see LICENSE file for details