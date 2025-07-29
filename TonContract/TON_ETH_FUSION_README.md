# TON-ETH Fusion+ Implementation Plan

## Overview

This document outlines the implementation plan for TON-ETH cross-chain fusion+ swaps, based on the existing ETH-BSC cross-chain resolver example found in `/cross-chain-resolver-example/`. The goal is to enable atomic cross-chain swaps between TON blockchain and Ethereum using a simplified deposit/withdraw mechanism initially.

## Reference Architecture: ETH-BSC Cross-Chain Resolver

### How Cross-Chain Interaction Works

The existing resolver achieves atomic cross-chain swaps **without direct chain communication**. Instead, it uses:

1. **Off-chain Resolver** - Acts as a trusted bridge monitoring both chains
2. **Event-driven Architecture** - Resolver watches blockchain events and reacts
3. **Cryptographic Secrets** - Same secret unlocks funds on both chains
4. **Time-based Safety** - Timeouts prevent funds from being locked forever

#### **Complete Cross-Chain Flow (ETH ↔ BSC)**

```
ETH Chain                Off-Chain Resolver              BSC Chain
    |                           |                           |
    | 1. User creates order     |                           |
    |    with secret hash       |                           |
    |                           |                           |
    | 2. deploySrc()            |                           |
    |    - Lock 100 USDC        |                           |
    |    - Emit SrcEscrowCreated|                           |
    |--------EVENT------------->|                           |
    |                           |                           |
    |                           | 3. Monitor event &        |
    |                           |    parse swap details     |
    |                           |                           |
    |                           | 4. deployDst()            |
    |                           |--------CALL-------------->|
    |                           |                           | 5. Lock 99 USDC
    |                           |                           |    (same hashlock)
    |                           |                           |
    | 6. User reveals secret    |                           |
    |    withdraw(secret) <-----|--------MONITOR------------|
    |                           |                           |
    | 7. Secret is now public!  |                           |
    |    Resolver withdraws     |                           |
    |<--------CALL-------------|                            |
```

#### **Key Interaction Mechanisms**

1. **Event Monitoring**: Resolver watches for `SrcEscrowCreated` events
2. **Deterministic Addresses**: Escrows use CREATE2 for predictable addresses
3. **Identical Hash Locks**: Same `keccak256(secret)` on both chains
4. **Economic Incentives**: Resolver earns fees, loses deposits if malicious

### Core Components from ETH-BSC Example

The existing resolver implements a **Hash Time-Locked Contract (HTLC)** pattern with the following key components:

#### 1. **Resolver Contract** (`contracts/src/Resolver.sol`)
- **Owner-controlled resolver** that orchestrates cross-chain swaps
- **Key Functions**:
  - `deploySrc()`: Deploys source chain escrow and executes order fill
  - `deployDst()`: Deploys destination chain escrow  
  - `withdraw()`: Withdraws funds using secret revelation
  - `cancel()`: Cancels escrow after timeout

#### 2. **Escrow System** 
- **Factory Pattern**: Deterministic escrow deployment using CREATE2
- **Time-locked Operations**: Progressive access windows (finality → private → public)
- **Safety Deposits**: Economic spam prevention
- **Secret-based Settlement**: Atomic swap using hash preimage revelation

#### 3. **Core Data Structure**
```solidity
struct Immutables {
    bytes32 orderHash;       // Order identifier
    bytes32 hashlock;        // Hash of secret for atomic settlement
    Address maker;           // Original order creator
    Address taker;           // Resolver address
    Address token;           // Token being swapped
    uint256 amount;          // Swap amount
    uint256 safetyDeposit;   // Anti-spam deposit
    Timelocks timelocks;     // Time-based operation windows
}
```

## TON-ETH Fusion+ Architecture Design

### Adapting Cross-Chain Interaction for TON

The TON-ETH implementation will follow the same event-driven pattern:

#### **TON-ETH Cross-Chain Flow**

```
TON Chain               Off-Chain Resolver              ETH Chain
    |                          |                          |
    | 1. User deposits         |                          |
    |    TON/Jettons           |                          |
    |    - Emit DepositEvent   |                          |
    |-------EVENT------------->|                          |
    |                          |                          |
    |                          | 2. Parse TON event       |
    |                          |    - Extract swap details|
    |                          |    - Validate parameters |
    |                          |                          |
    |                          | 3. deployEthEscrow()     |
    |                          |-------CALL-------------->|
    |                          |                          | 4. Lock ETH/ERC20
    |                          |                          |    - Emit EscrowCreated
    |                          |                          |
    | 5. Monitor ETH events    |                          |
    |    Complete TON swap <---|--------MONITOR-----------|
    |                          |                          |
    | 6. Release funds to user |                          |
    |                          |                          |
```

#### **Key Adaptations for TON**

1. **TON Event Structure**: Use TL-B serialization for event data
2. **Message-based Calls**: TON's internal message system vs direct calls
3. **Jetton Integration**: Support for TON's jetton standard
4. **Cell-based Storage**: Leverage TON's cell data structures

### Phase 1: Simple Deposit/Withdraw (No Security/Hashing)

For the initial implementation, we'll create a simplified version focusing on basic cross-chain functionality:

#### **TON Side Components**

1. **TonResolver Contract** (FunC)
   - Manages cross-chain swap orchestration
   - Handles TON → ETH deposits
   - Processes ETH → TON withdrawals

2. **TonEscrow Contract** (FunC)
   - Holds user funds during cross-chain operations
   - Simple time-based release mechanism
   - Basic deposit/withdraw functionality

#### **ETH Side Components**

1. **EthResolver Contract** (Solidity)
   - Mirror of TON resolver functionality
   - Handles ETH → TON deposits
   - Processes TON → ETH withdrawals

2. **EthEscrow Contract** (Solidity)
   - Simplified version of existing escrow
   - Basic fund holding and release

### Key Functions to Implement

#### **TON Side (FunC Contracts)**

##### TonResolver Functions:
```funC
;; Deposit TON/Jettons for ETH swap
() deposit_for_eth_swap(slice user_address, int amount, slice eth_recipient, int swap_id) impure;

;; Complete ETH→TON swap (called by oracle/relayer)
() complete_eth_to_ton_swap(slice ton_recipient, int amount, int swap_id) impure;

;; Cancel swap and return funds
() cancel_swap(int swap_id) impure;

;; Get swap status
(int, int, slice, slice) get_swap_info(int swap_id) method_id;
```

##### TonEscrow Functions:
```funC
;; Initialize escrow with swap parameters
() init_escrow(slice resolver_address, slice user_address, int amount, int timeout) impure;

;; Release funds to recipient
() release_funds(slice recipient) impure;

;; Return funds to original sender (after timeout)
() return_funds() impure;
```

#### **ETH Side (Solidity Contracts)**

##### EthResolver Functions:
```solidity
// Deposit ETH/ERC20 for TON swap
function depositForTonSwap(address tonRecipient, uint256 amount, uint256 swapId) external payable;

// Complete TON→ETH swap (called by oracle/relayer)  
function completeTonToEthSwap(address ethRecipient, uint256 amount, uint256 swapId) external;

// Cancel swap and return funds
function cancelSwap(uint256 swapId) external;

// Get swap status
function getSwapInfo(uint256 swapId) external view returns (SwapInfo memory);
```

##### EthEscrow Functions:
```solidity
// Initialize escrow with swap parameters
function initEscrow(address resolver, address user, uint256 amount, uint256 timeout) external;

// Release funds to recipient
function releaseFunds(address recipient) external;

// Return funds to original sender (after timeout)
function returnFunds() external;
```

### Data Structures

#### **TON Side (FunC)**
```funC
;; Swap information storage
;; swap_id -> (status, amount, ton_user, eth_user, timestamp)
```

#### **ETH Side (Solidity)**
```solidity
struct SwapInfo {
    uint8 status;           // 0=pending, 1=completed, 2=cancelled
    uint256 amount;         // Swap amount
    address ethUser;        // ETH side user
    address tonUser;        // TON side user (as bytes)
    uint256 timestamp;      // Creation timestamp
    uint256 timeout;        // Expiration timestamp
}
```

## Implementation Roadmap

### **Phase 1: Basic Deposit/Withdraw**

#### **Step 1: TON Contract Development**
- [ ] Create `TonResolver` contract in FunC
- [ ] Create `TonEscrow` contract in FunC  
- [ ] Implement basic deposit functionality
- [ ] Implement withdrawal functionality
- [ ] Add timeout-based cancellation
- [ ] Write comprehensive tests

#### **Step 2: ETH Contract Development** 
- [ ] Create simplified `EthResolver` contract
- [ ] Create simplified `EthEscrow` contract
- [ ] Implement deposit functionality
- [ ] Implement withdrawal functionality
- [ ] Add timeout-based cancellation
- [ ] Write comprehensive tests

#### **Step 3: Cross-Chain Communication System**
- [ ] Build TON event monitoring service
  - [ ] Parse TON transaction logs for deposit events
  - [ ] Extract swap parameters from TON cell data
  - [ ] Validate TON transaction finality
- [ ] Build ETH event monitoring service  
  - [ ] Watch for EthEscrowCreated events
  - [ ] Parse Ethereum event logs
  - [ ] Handle chain reorganizations
- [ ] Implement resolver orchestration logic
  - [ ] Event-driven state machine
  - [ ] Cross-chain parameter validation
  - [ ] Failure handling and retries
- [ ] Create cross-chain API layer
  - [ ] RESTful API for swap status
  - [ ] WebSocket for real-time updates  
  - [ ] Health monitoring endpoints

#### **Step 4: Integration Testing**
- [ ] Deploy contracts on testnets (TON testnet + Ethereum Sepolia)
- [ ] Test TON → ETH swaps
  - [ ] User deposits TON/Jettons on TON chain
  - [ ] Resolver detects deposit event
  - [ ] Resolver deploys ETH escrow with matching funds
  - [ ] User receives ETH/ERC20 tokens
- [ ] Test ETH → TON swaps
  - [ ] User deposits ETH/ERC20 on Ethereum
  - [ ] Resolver detects deposit event  
  - [ ] Resolver completes swap on TON chain
  - [ ] User receives TON/Jettons
- [ ] Test failure scenarios
  - [ ] Timeout/cancellation with fund recovery
  - [ ] Resolver offline scenarios
  - [ ] Invalid transaction handling
  - [ ] Chain reorganization resilience
- [ ] Performance optimization
  - [ ] Gas cost analysis and optimization
  - [ ] Event monitoring latency testing
  - [ ] Throughput benchmarking

### **Phase 2: Security & Production Features**

#### **Step 5: Add Security Mechanisms (HTLC Pattern)**
- [ ] Implement Hash Time-Locked Contracts
  - [ ] Add secret generation and hash verification
  - [ ] Implement identical hash locks on both chains
  - [ ] Add atomic settlement via secret revelation
- [ ] Add time-based security windows
  - [ ] Finality period (block confirmation)
  - [ ] Private withdrawal periods (resolver-only)
  - [ ] Public withdrawal periods (anyone can complete)
  - [ ] Cancellation timeouts with fund recovery
- [ ] Implement safety deposits
  - [ ] Anti-spam deposit requirements
  - [ ] Economic incentives for honest behavior
  - [ ] Slashing conditions for malicious actions
- [ ] Add cryptographic verification
  - [ ] Signature verification for orders
  - [ ] Merkle proof validation for cross-chain data
  - [ ] Hash preimage verification for secrets

#### **Step 6: Production Hardening**
- [ ] Add comprehensive error handling
- [ ] Implement emergency pause mechanisms
- [ ] Add governance controls
- [ ] Security audit and testing
- [ ] Gas optimization
- [ ] Documentation and deployment guides

## Key Differences from ETH-BSC Resolver

### **Simplified for Phase 1:**
1. **No Hash-Time-Locks**: Direct deposit/withdraw without secret revelation
2. **No Safety Deposits**: Simplified anti-spam mechanism
3. **Basic Timeouts**: Simple timestamp-based expiration
4. **No 1inch LOP Integration**: Direct token transfers
5. **Oracle-based Communication**: Instead of native cross-chain messaging

### **TON-Specific Adaptations:**
1. **Address Format**: TON workchain:address instead of 20-byte ETH addresses
2. **Message-based Architecture**: TON's actor model vs EVM's call-based model
3. **Jetton Support**: TON's jetton standard instead of ERC20
4. **Gas Model**: TON's gas computation model vs Ethereum's gas system
5. **State Management**: TON's persistent storage vs EVM state

## Development Commands

### TON Contracts
```bash
# Build TON contracts
cd TonContract
npm run build

# Run tests
npm test

# Deploy to testnet
npm start
```

### ETH Contracts  
```bash
# Build and test ETH contracts (use existing structure)
cd cross-chain-resolver-example
pnpm install
forge build
pnpm test
```

## File Structure

```
TonContract/
├── contracts/
│   ├── ton-resolver.fc          # Main TON resolver
│   ├── ton-escrow.fc           # TON escrow contract
│   └── imports/                # Shared utilities
├── wrappers/
│   ├── TonResolver.ts          # TypeScript wrapper
│   └── TonEscrow.ts           # TypeScript wrapper
├── scripts/
│   ├── deployTonResolver.ts    # Deployment script
│   └── testCrossChain.ts      # Cross-chain test
├── tests/
│   ├── TonResolver.spec.ts     # Unit tests
│   └── integration.spec.ts     # Integration tests
└── utils/
    ├── CrossChainTypes.ts      # Shared type definitions
    └── EventMonitor.ts         # Cross-chain event monitoring

CrossChainResolver/
├── src/
│   ├── TonEventMonitor.ts      # TON blockchain event monitoring
│   ├── EthEventMonitor.ts      # Ethereum event monitoring  
│   ├── ResolverOrchestrator.ts # Main cross-chain logic
│   ├── SwapStateMachine.ts     # Swap lifecycle management
│   └── types/
│       ├── TonTypes.ts         # TON-specific type definitions
│       ├── EthTypes.ts         # Ethereum type definitions
│       └── CrossChainTypes.ts  # Shared cross-chain types
├── config/
│   ├── ton-config.ts           # TON network configuration
│   ├── eth-config.ts           # Ethereum network configuration
│   └── resolver-config.ts      # Resolver service configuration
└── tests/
    ├── integration/
    │   ├── ton-eth-swap.spec.ts
    │   └── eth-ton-swap.spec.ts
    └── unit/
        ├── event-monitor.spec.ts
        └── state-machine.spec.ts

EthContracts/
├── src/
│   ├── EthResolver.sol         # Simplified ETH resolver
│   └── EthEscrow.sol          # Simplified ETH escrow
├── test/
│   └── CrossChain.t.sol       # Foundry tests
└── scripts/
    └── Deploy.s.sol           # Deployment script
```

## Critical Implementation Tasks

Based on the cross-chain interaction analysis, here are the immediate priorities:

### **Phase 1A: Event-Driven Infrastructure**
1. **TON Event Monitoring**
   - [ ] Implement TON blockchain event parser
   - [ ] Create deposit event schema and serialization
   - [ ] Add transaction finality validation
   
2. **Cross-Chain State Management**
   - [ ] Build swap state machine (pending → processing → completed/cancelled)
   - [ ] Implement deterministic swap ID generation
   - [ ] Add cross-chain parameter validation logic

### **Phase 1B: Contract Development**
3. **TON Contracts** 
   - [ ] `TonResolver`: Event emission, fund locking, swap completion
   - [ ] `TonEscrow`: Time-based fund release mechanisms
   
4. **ETH Contracts**
   - [ ] `EthResolver`: Mirror TON functionality for Ethereum side
   - [ ] `EthEscrow`: Simplified escrow with timeout handling

### **Phase 1C: Integration Layer** 
5. **Resolver Orchestration Service**
   - [ ] Event-driven resolver that monitors both chains
   - [ ] Cross-chain transaction coordination
   - [ ] Failure recovery and retry mechanisms

## Next Steps Priority Order

1. **Start with TON Event Architecture**: Design event structures and monitoring
2. **Build Cross-Chain State Machine**: Core swap lifecycle management  
3. **Implement Simple Contracts**: Basic deposit/withdraw without HTLC
4. **Create Resolver Service**: Off-chain coordination between chains
5. **End-to-End Testing**: Complete swap flows on testnets
6. **Add HTLC Security**: Upgrade to production-ready atomic swaps

This approach prioritizes the unique **event-driven cross-chain coordination** that makes atomic swaps possible, building from the proven ETH-BSC resolver pattern.