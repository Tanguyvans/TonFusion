# ETH-TON Atomic Swap: Demo vs Full Protocol

## Demo Implementation (Current)

```mermaid
sequenceDiagram
    participant User as (Maker+Resolver)
    participant ETH
    participant TON

    Note over User, TON: Phase 1: Setup (Demo Only)
    User->>User: Generate secret & Query ID

    Note over User, TON: Phase 2: Deposit Phase (Manual)
    User->>ETH: Deposit 100 USDC with hashlock
    ETH->>ETH: Lock funds in escrow
    User->>TON: Manually transfer jettons with same secret
    TON->>TON: Store swap info in vault

    Note over User, TON: Phase 3: Withdrawal Phase (Manual)
    User->>ETH: Withdraw with secret (as resolver)
    ETH->>User: Release USDC
    User->>TON: Manually withdraw with same secret
    TON->>User: Release jettons

    Note over User, TON: ✅ Demo complete - User played both roles
```

## Full 1inch Fusion Protocol (Target)

```mermaid
sequenceDiagram
    participant Maker
    participant Resolver
    participant Relayer as 1inch Relayer
    participant ETH
    participant TON

    Note over Maker, TON: Phase 1: Announcement Phase
    Maker->>Maker: Generate secret & secret hash
    Maker->>Relayer: Issue cross-chain order with secret hash
    Relayer->>Resolver: Share order (Dutch auction begins)

    Note over Maker, TON: Phase 2: Deposit Phase
    Resolver->>ETH: Deposit maker's tokens (100 USDC) with hashlock
    ETH->>ETH: Lock funds in escrow with timelock
    Resolver->>TON: Deposit taker amount (jettons) with same secret hash
    TON->>TON: Store swap info in vault

    Note over Maker, TON: Phase 3: Withdrawal Phase
    Relayer->>Relayer: Verify both escrows & finality lock
    Relayer->>Resolver: Disclose secret to all resolvers
    Resolver->>ETH: Unlock assets using secret
    ETH->>Resolver: Release locked USDC
    Resolver->>TON: Unlock assets for maker using same secret
    TON->>Maker: Release jettons to maker

    Note over Maker, TON: ✅ Cross-chain swap complete (automated)
```
