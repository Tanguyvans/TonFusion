import { tonEthAtomicSwap } from './ton-eth-atomic-swap'

describe('TON-ETH Atomic Swap Demo', () => {
    it('should coordinate TON source and ETH destination with shared secret', async () => {
        await tonEthAtomicSwap()
    }, 120000) // 2 minute timeout
})