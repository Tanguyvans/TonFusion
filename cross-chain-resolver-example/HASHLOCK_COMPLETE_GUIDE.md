# Complete Hashlock Implementation Guide

This comprehensive guide explains the hashlock mechanism in the 1inch cross-chain resolver, covering secret generation, privacy, security, and implementation details.

## Table of Contents

1. [Overview](#overview)
2. [How Hashlocks Work](#how-hashlocks-work)
3. [The Critical Question: How Bob Withdraws Safely](#the-critical-question-how-bob-withdraws-safely)
4. [Secret Privacy Explained](#secret-privacy-explained)
5. [Withdrawal Security](#withdrawal-security)
6. [Implementation Guide](#implementation-guide)
7. [Contract Functions](#contract-functions)
8. [Complete Example](#complete-example)
9. [Security Considerations](#security-considerations)
10. [Common Errors](#common-errors)

## Overview

The hashlock mechanism enables secure atomic cross-chain swaps by locking funds with a cryptographic hash. Only the party with the correct secret can unlock the funds, ensuring either both swaps complete or neither does.

## How Hashlocks Work

### Core Concept

```text
Secret (private) → Hash Function → Hashlock (public)
   ↓                                      ↑
   Hidden                              Visible on-chain
```

The hashlock is a one-way cryptographic function that allows:

- **Privacy**: The secret remains private until withdrawal
- **Verification**: Anyone can verify a secret matches the hashlock
- **Atomicity**: Same secret unlocks funds on both chains

### Basic Cross-Chain Flow

1. **Alice** wants to swap ETH on Chain A for USDC on Chain B
2. **Bob** wants to swap USDC on Chain B for ETH on Chain A
3. Alice generates a secret and creates escrows on both chains with its hash
4. Alice withdraws USDC on Chain B by revealing the secret
5. Bob sees the revealed secret and withdraws ETH on Chain A

## The Critical Question: How Bob Withdraws Safely

### The Setup

Let's be very specific about who owns what:

- **Chain A (Ethereum)**: 
  - Alice has 1 ETH she wants to swap
  - Bob wants to receive this 1 ETH
  
- **Chain B (BSC)**:
  - Bob has 1800 USDC he wants to swap
  - Alice wants to receive this 1800 USDC

### Step-by-Step Process

#### 1. Escrow Creation
```typescript
// Alice creates TWO escrows with the SAME hashlock
const secret = randomBytes(32);  // Only Alice knows this
const hashlock = keccak256(secret);  // This goes on-chain

// Escrow on Chain A (Ethereum)
EscrowSrc_ChainA = {
    maker: Alice,         // Alice provides the ETH
    taker: Bob,          // Bob will receive the ETH
    token: ETH,
    amount: 1 ETH,
    hashlock: hashlock,
    safetyDeposit: 0.01 ETH  // Alice pays this
}

// Escrow on Chain B (BSC)  
EscrowDst_ChainB = {
    maker: Bob,          // Bob provides the USDC
    taker: Alice,        // Alice will receive the USDC
    token: USDC,
    amount: 1800 USDC,
    hashlock: hashlock,  // SAME hashlock!
    safetyDeposit: 0.01 BNB  // Bob pays this
}
```

#### 2. Alice Withdraws on Chain B (Secret Revealed)
```typescript
// Alice calls withdraw on Chain B
await EscrowDst_ChainB.withdraw(secret, escrowParams);
// This transaction includes the secret in its data!
```

#### 3. Bob Sees the Secret
```typescript
// Bob monitors Chain B for Alice's withdrawal
escrowContract.on("Withdrawal", async (event) => {
    // Get the transaction that triggered this event
    const tx = await event.getTransaction();
    
    // The secret is in the transaction input data!
    const decodedInput = escrowInterface.decodeFunctionData("withdraw", tx.data);
    const revealedSecret = decodedInput.secret;
    
    console.log("Alice used this secret:", revealedSecret);
});
```

#### 4. Bob Uses the Secret on Chain A
```typescript
// Bob now has the secret and uses it on Chain A
await EscrowSrc_ChainA.connect(bob).withdrawTo(
    revealedSecret,  // The same secret Alice used!
    bobAddress,      // Where Bob wants his ETH
    escrowParams
);
```

### Why Bob is Protected

**Key Protection Mechanisms:**

1. **Bob is the designated taker on Chain A**
   - The escrow was created with `taker: Bob`
   - Only Bob can call `withdrawTo()` during the private period
   - Even if someone else sees the secret, they can't withdraw Bob's funds

2. **Time Windows Protect Bob**
   ```text
   Chain B (where Alice withdraws first):
   - Private withdrawal: 0-30 minutes (only Alice can withdraw)
   - Public withdrawal: 30-60 minutes (anyone can help Alice)
   
   Chain A (where Bob withdraws second):
   - Private withdrawal: 0-60 minutes (only Bob can withdraw)
   - Public withdrawal: 60-120 minutes (anyone can help Bob)
   ```
   
   Bob has MORE time to withdraw than Alice, ensuring he can always claim his funds after seeing the secret.

3. **Even in Public Period, Bob Gets His Funds**
   ```solidity
   // If someone else calls publicWithdraw with the secret
   function publicWithdraw(bytes32 secret, Immutables memory params) {
       // Funds ALWAYS go to the taker (Bob)!
       _withdraw(secret, params, params.taker.get(), msg.sender);
       //                        ^^^^^^^^^^^^^^^^^^
       //                        This is Bob's address!
   }
   ```

### Complete Security Timeline

```text
Time →
├─ 0:00 - Alice creates both escrows with hashlock
├─ 0:01 - Bob verifies escrows have matching hashlocks
├─ 0:15 - Alice withdraws on Chain B (secret revealed in tx)
├─ 0:16 - Bob sees the transaction and extracts the secret
├─ 0:17 - Bob withdraws on Chain A using the same secret
└─ ✓ Both parties have their desired tokens!

Alternative timeline (if Bob is slow):
├─ 0:15 - Alice withdraws on Chain B (secret revealed)
├─ 0:16 - Bob is offline/busy
├─ 1:30 - Charlie (helpful third party) sees the secret
├─ 1:31 - Charlie calls publicWithdraw on Chain A
├─ Result: Bob still gets his ETH, Charlie gets safety deposit
└─ ✓ Bob's funds are safe even if he's not watching!
```

## Secret Privacy Explained

### Why the Secret Stays Private

The secret remains private through cryptographic hashing:

```typescript
// Generated locally, never sent to blockchain
const secret = randomBytes(32);  

// Only this hash is sent to blockchain
const hashlock = keccak256(secret);
```

**Key Points:**
- **Before withdrawal**: Only the secret holder knows it
- **One-way function**: Cannot derive secret from hashlock (2^256 possibilities)
- **Controlled revelation**: Secret becomes public only when used to withdraw

### Timeline of Privacy

```text
Time →
├─ T0: Alice generates secret (private)
├─ T1: Alice creates escrows with hashlock on both chains
├─ T2: Bob sees hashlock but cannot determine secret
├─ T3: Alice withdraws on Chain B by revealing secret
├─ T4: Secret is now public in Chain B's transaction
└─ T5: Bob uses the revealed secret to withdraw on Chain A
```

## Withdrawal Security

### The Security Concern

Once the secret is revealed, can someone else steal the funds?

**Answer: NO - Smart contract access controls prevent this.**

### Access Control Mechanisms

#### 1. Private Withdrawal Period (Taker Only)

```solidity
function withdrawTo(
    bytes32 secret,
    address target,
    Immutables calldata immutables
) external 
    onlyTaker(immutables)  // ONLY the designated taker
    onlyValidSecret(secret, immutables)
    onlyBefore(privateWithdrawalTimestamp(immutables))
{
    _withdraw(secret, immutables, target, msg.sender);
}
```

#### 2. Public Withdrawal Period (Anyone Can Help)

```solidity
function publicWithdraw(
    bytes32 secret,
    Immutables calldata immutables
) external {
    _withdraw(secret, immutables, immutables.taker.get(), msg.sender);
    //                              ^^^^^^^^^^^^^^^^^^^^^^
    //                              Funds ALWAYS go to the taker!
}
```

### Why Funds Are Safe

Even if a malicious actor (Charlie) knows the secret:

1. **Private Period**: Charlie cannot call withdraw() - not the taker
2. **Public Period**: Charlie can call publicWithdraw() BUT:
   - Main funds go to the hardcoded recipient (taker/maker)
   - Charlie only gets the safety deposit as incentive

## Implementation Guide

### Generating Hashlocks

#### Simple Hashlock (Single Fill)

```typescript
import { randomBytes } from 'crypto';
import { keccak256 } from 'ethers';
import { HashLock } from '@1inch/cross-chain-sdk';

// Generate a random 32-byte secret
const secret = randomBytes(32);

// Create hashlock using the SDK
const hashLock = HashLock.forSingleFill(secret);

// Or manually compute
const manualHashlock = keccak256(secret);
```

#### Merkle Hashlock (Multiple Fills)

```typescript
// For partial order fills
const secretCount = 10;
const secrets = Array.from({ length: secretCount }, () => randomBytes(32));

// Create Merkle tree
const leaves = HashLock.getMerkleLeaves(secrets);
const hashLock = HashLock.forMultipleFills(leaves);
```

### Secret Management

```typescript
class SecretManager {
    private secrets: Map<string, Buffer> = new Map();
    
    generateSecret(orderId: string): string {
        const secret = randomBytes(32);
        this.secrets.set(orderId, secret);
        return keccak256(secret);
    }
    
    revealSecret(orderId: string): Buffer {
        const secret = this.secrets.get(orderId);
        if (!secret) throw new Error("Secret not found");
        return secret;
    }
}
```

## Contract Functions

### BaseEscrow Core

```solidity
// Validates secret against hashlock
modifier onlyValidSecret(bytes32 secret, Immutables calldata immutables) {
    if (_keccakBytes32(secret) != immutables.hashlock) revert InvalidSecret();
    _;
}

function _keccakBytes32(bytes32 secret) private pure returns (bytes32 ret) {
    assembly ("memory-safe") {
        mstore(0, secret)
        ret := keccak256(0, 0x20)
    }
}
```

### EscrowSrc Functions

- `withdrawTo()`: Taker withdraws during private period
- `publicWithdraw()`: Anyone can help taker withdraw during public period
- `cancel()`: Return funds to maker

### EscrowDst Functions

- `withdraw()`: Taker withdraws (funds go to maker)
- `publicWithdraw()`: Anyone can help maker withdraw
- `cancel()`: Return funds to taker

## Complete Example

```typescript
async function executeCrossChainSwap() {
    // 1. Generate secret and hashlock
    const secret = randomBytes(32);
    const hashLock = HashLock.forSingleFill(secret);
    
    // 2. Set up time windows (destination < source)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeLocks = {
        srcChain: {
            deployedAt: currentTime,
            publicExecutionDelay: 3600,      // 1 hour
            publicCancellationDelay: 7200,   // 2 hours
            privateCancellationDelay: 86400, // 24 hours
        },
        dstChain: {
            deployedAt: currentTime,
            publicExecutionDelay: 1800,      // 30 min
            publicCancellationDelay: 3600,   // 1 hour
            privateCancellationDelay: 43200, // 12 hours
        }
    };
    
    // 3. Create escrows with same hashlock
    const srcEscrow = await createEscrow({
        maker: bobAddress,
        taker: aliceAddress,
        token: ETH_ADDRESS,
        amount: ethers.parseEther("1"),
        hashlock: hashLock,
        timelocks: timeLocks.srcChain
    });
    
    const dstEscrow = await createEscrow({
        maker: aliceAddress,
        taker: bobAddress,
        token: USDC_ADDRESS,
        amount: ethers.parseUnits("1800", 6),
        hashlock: hashLock,
        timelocks: timeLocks.dstChain
    });
    
    // 4. Alice withdraws on destination (reveals secret)
    await dstEscrow.connect(alice).withdraw(secret, escrowParams);
    
    // 5. Bob monitors for secret and withdraws on source
    const revealedSecret = await monitorForSecret(dstEscrow);
    await srcEscrow.connect(bob).withdraw(revealedSecret, escrowParams);
}
```

## Security Considerations

### Time Window Configuration

1. **Destination delays < Source delays**: Prevents taker from withdrawing source without maker getting destination
2. **Sufficient gaps**: Account for network congestion
3. **Private before public**: Gives intended recipient priority

### Best Practices

#### DO's

- ✅ Generate secrets using `crypto.randomBytes()`
- ✅ Store secrets securely until withdrawal
- ✅ Monitor blockchain for secret revelation
- ✅ Validate hashlock matches on both chains
- ✅ Check time constraints before operations

#### DON'Ts

- ❌ Never share secrets before withdrawal
- ❌ Don't use predictable values as secrets
- ❌ Don't reuse secrets across swaps
- ❌ Don't store secrets in contracts

### Monitoring for Secret Revelation

```typescript
escrowContract.on("Withdrawal", async (token, receiver, amount, event) => {
    const tx = await event.getTransaction();
    const decodedInput = escrowInterface.decodeFunctionData("withdraw", tx.data);
    const revealedSecret = decodedInput.secret;
    
    console.log("Secret revealed:", revealedSecret);
    // Now use this secret to withdraw on the other chain
});
```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `InvalidSecret()` | Secret doesn't match hashlock | Verify correct secret |
| `AccessDenied()` | Wrong caller for time period | Check time windows and caller |
| `Expired()` | Outside allowed time window | Act within time constraints |
| `AlreadyWithdrawn()` | Attempting double withdrawal | Check withdrawal status first |

## Testing

```typescript
// Test secret validation
function testHashlockValidation() {
    const secret = randomBytes(32);
    const correctHashlock = keccak256(secret);
    const wrongHashlock = keccak256(randomBytes(32));
    
    console.log("Secret matches correct hashlock:", 
        keccak256(secret) === correctHashlock); // true
    console.log("Secret matches wrong hashlock:", 
        keccak256(secret) === wrongHashlock); // false
}

// Test security scenario
async function testWithdrawalSecurity() {
    const alice = accounts[0];   // Taker
    const bob = accounts[1];     // Maker
    const charlie = accounts[2]; // Attacker
    
    // Charlie tries to steal during private period
    try {
        await escrow.connect(charlie).withdraw(secret, params);
    } catch (e) {
        console.log("Charlie blocked during private period ✓");
    }
    
    // Charlie helps during public period
    await escrow.connect(charlie).publicWithdraw(secret, params);
    // Funds went to Alice, Charlie got safety deposit ✓
}
```

## Summary

The hashlock mechanism provides:

1. **Privacy**: Secrets remain private until withdrawal
2. **Security**: Access controls prevent fund theft
3. **Atomicity**: Same secret unlocks both sides
4. **Incentives**: Safety deposits encourage completion

This design enables trustless cross-chain atomic swaps where neither party can cheat, even after secret revelation.

## Additional Resources

- [1inch Cross-Chain SDK](https://github.com/1inch/cross-chain-sdk)
- [Solidity Keccak256 Docs](https://docs.soliditylang.org/en/latest/units-and-global-variables.html#mathematical-and-cryptographic-functions)
- [HTLC Pattern](https://en.bitcoin.it/wiki/Hash_Time_Locked_Contracts)
