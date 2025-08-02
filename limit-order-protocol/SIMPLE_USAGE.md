# 1inch Limit Order Protocol - Simple Usage

## Purpose
Creates off-chain signed limit orders that execute on-chain atomically. Makers create orders for free, takers pay gas to fill them.

## Deployed Contract
- **Sepolia**: `0xb47e3709C8989AC76B9240A29dEd6Dc5C106A0e5`
- **WETH**: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`

## Basic Flow
1. **Maker**: Creates + signs order off-chain (FREE)
2. **Taker**: Discovers order and calls `fillOrder()` (PAYS GAS)
3. **Contract**: Executes atomic token swap

## Core Functions
- `fillOrder(order, r, vs, amount, takerTraits)` - Fill an order
- `hashOrder(order)` - Get order hash for tracking
- `remainingInvalidatorForOrder(maker, orderHash)` - Check remaining amount

## Order Structure
```solidity
struct Order {
    uint256 salt;           // Unique ID
    address maker;          // Order creator
    address receiver;       // Token receiver (0x0 = maker)
    address makerAsset;     // Token being sold
    address takerAsset;     // Token being bought
    uint256 makingAmount;   // Amount selling
    uint256 takingAmount;   // Amount wanting
    uint256 makerTraits;    // Order options
}
```

## Cross-Chain Integration
- **Order Book**: Store signed orders across chains
- **Bridge Integration**: Use 1inch Cross-Chain SDK for execution
- **Atomic Settlement**: Ensure both sides complete or fail
- **Gas Optimization**: Takers pay fees, makers create for free

## Example: ETH → BSC Swap
```javascript
// 1. Maker creates order (Sepolia WETH → BSC BUSD)
const order = {
    makerAsset: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH
    takerAsset: "0x...", // BSC BUSD address
    makingAmount: ethers.parseEther("1"), // 1 WETH
    takingAmount: ethers.parseEther("2400") // 2400 BUSD
};

// 2. Sign order (EIP-712)
const signature = await signer.signTypedData(domain, types, order);

// 3. Share order (API/social/direct)
// 4. Taker fills via cross-chain bridge
```

## Quick Test
```bash
npx hardhat run scripts/simple-deploy.js --network sepolia --config hardhat.simple.config.js
```