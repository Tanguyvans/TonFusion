# Cross-Chain Escrow Contract Flow Explanation

## Overview

The cross-chain swap protocol uses Hash Time-Locked Contracts (HTLCs) to enable atomic swaps between different blockchains. This document explains how the escrow contracts work and the complete flow of a cross-chain swap from BNB to ETH (and how it will work for TON to ETH).

## Key Concepts

### 1. Hash Time-Locked Contract (HTLC)
- **Hash Lock**: A cryptographic hash that locks funds. Only someone with the secret (preimage) can unlock it.
- **Time Lock**: Multiple time-based conditions that determine when different actions can be taken.

### 2. Atomic Swap Guarantee
The protocol ensures that either:
- Both parties receive their funds (successful swap)
- Both parties get their original funds back (cancelled swap)
- No scenario where only one party benefits

## Complete Flow of BNB → ETH Swap

### Phase 1: Order Creation and Filling

1. **User Creates Order** (on source chain - BNB)
   ```
   - Maker: User's address
   - Making Amount: 100 USDC on BNB
   - Taking Amount: 99 USDC on ETH (1% fee)
   - Secret: User generates random 32-byte secret
   - Hash Lock: SHA256(secret)
   - Time Locks: Multiple timeout periods
   ```

2. **Resolver Fills Order** (on source chain - BNB)
   ```
   - Resolver calls deploySrc() on their Resolver contract
   - This triggers fillOrderArgs() on 1inch Limit Order Protocol
   - User's 100 USDC is pulled from their wallet
   - Source escrow contract is deployed with the funds
   - Escrow is locked with the hash lock
   ```

### Phase 2: Destination Chain Deployment

3. **Resolver Deploys Destination Escrow** (on destination chain - ETH)
   ```
   - Resolver calls deployDst() with matching parameters
   - Resolver deposits 99 USDC into the destination escrow
   - Escrow is locked with the same hash lock
   - Both escrows are now active and waiting for the secret
   ```

### Phase 3: Secret Reveal and Settlement

4. **User Withdraws on Destination** (ETH)
   ```
   - User reveals the secret to withdraw from destination escrow
   - User receives 99 USDC on ETH
   - Secret is now public on the blockchain
   ```

5. **Resolver Withdraws on Source** (BNB)
   ```
   - Resolver uses the revealed secret
   - Resolver withdraws 100 USDC from source escrow
   - Swap is complete!
   ```

## Time Lock Mechanisms

The contract uses multiple time locks for different scenarios:

```
Time -->
0s -------- 10s -------- 100s -------- 120s -------- 121s -------- 122s
|           |            |             |              |              |
Deploy      |            |             |              |              |
            |            |             |              |              |
            Finality     |             |              |              |
            Lock         |             |              |              |
                        |             |              |              |
                        DST: Private   |              |              |
                        Withdrawal     |              |              |
                        Starts         |              |              |
                                      |              |              |
                                      DST: Public     |              |
                                      Withdrawal      |              |
                                      (Anyone)        |              |
                                                     |              |
                                                     SRC: Private    |
                                                     Withdrawal      |
                                                     Ends            |
                                                                    |
                                                                    SRC: Cancel
                                                                    Allowed
```

### Time Lock Parameters:

1. **Finality Lock (10s)**: Prevents any action until blockchain finality
2. **Private Withdrawal Period**: 
   - DST: 10s-100s (only taker can withdraw)
   - SRC: 10s-120s (only taker can withdraw)
3. **Public Withdrawal Period**:
   - DST: After 100s (anyone can trigger withdrawal to maker)
   - SRC: After 120s (anyone can trigger withdrawal to maker)
4. **Cancellation Period**:
   - SRC: After 121s (maker can cancel)
   - SRC: After 122s (anyone can cancel)

## Security Mechanisms

### 1. Atomic Guarantee
- If user reveals secret on destination, resolver WILL be able to claim on source
- If user doesn't reveal secret, both parties can cancel and recover funds

### 2. Time-Based Protection
- Private periods ensure only intended recipients can act first
- Public periods prevent funds from being locked forever
- Cancellation ensures funds can always be recovered

### 3. Order Validation
- Amounts must match between chains
- Hash locks must be identical
- Time parameters must align properly

## TON → ETH Adaptation

For TON to ETH swaps, we need to adapt this pattern:

### TON Escrow Contract Requirements:

1. **Deposit Function** (replaces order filling)
   - Accept TON or Jettons
   - Store hash lock and time locks
   - Lock funds until conditions are met

2. **Withdraw Function**
   - Verify secret against hash lock
   - Check time conditions
   - Transfer funds to maker

3. **Cancel Function**
   - Check cancellation time has passed
   - Return funds to taker

### Key Differences for TON:

1. **Message-Based**: TON uses internal messages instead of direct calls
2. **Actor Model**: Each escrow is a separate smart contract
3. **Gas Model**: TON uses a different gas model (message fees)
4. **State Storage**: TON contracts pay for storage over time

### Proposed TON Escrow State:
```
status: uint8 (active/withdrawn/cancelled)
maker: Address (recipient of funds)
taker: Address (depositor/resolver)
token: Address (Jetton master or 0 for TON)
amount: Coins
hash_lock: uint256
deployed_at: uint32
time_locks: {
    withdrawal: uint32
    public_withdrawal: uint32
    cancellation: uint32
    public_cancellation: uint32
}
```

## Test Scenario Walkthrough

The test in `main.spec.ts` demonstrates a complete swap:

1. **Setup**:
   - User gets 1000 USDC on source chain
   - Resolver gets 2000 USDC on destination chain
   - Contracts are deployed on both chains

2. **Swap Execution**:
   - User creates order for 100 USDC → 99 USDC
   - Resolver fills order, locking user's funds
   - Resolver deposits on destination chain
   - Time is advanced by 11 seconds (past finality)
   - User withdraws on destination (revealing secret)
   - Resolver withdraws on source using secret

3. **Verification**:
   - User: -100 USDC on source, +99 USDC on destination
   - Resolver: +100 USDC on source, -99 USDC on destination
   - Net: 1 USDC fee to resolver

## Error Scenarios

The protocol handles various failure cases:

1. **Resolver Doesn't Deploy Destination**:
   - User can cancel on source after timeout
   - User gets full refund

2. **User Doesn't Reveal Secret**:
   - Resolver can cancel on destination after timeout
   - Both parties get refunds

3. **Network Issues**:
   - Public functions allow anyone to trigger refunds
   - Ensures funds are never permanently locked

This architecture ensures trustless, atomic cross-chain swaps with proper incentives and safety mechanisms for all parties.