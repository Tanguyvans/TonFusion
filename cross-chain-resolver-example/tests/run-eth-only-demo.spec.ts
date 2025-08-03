import { ethTonAtomicSwap } from './eth-ton-atomic-swap'

describe('ETH-TON Atomic Swap Demo', () => {
    it('should coordinate ETH and TON deposits/withdrawals with shared secret', async () => {
        await ethTonAtomicSwap()
    }, 120000) // 2 minute timeout
})