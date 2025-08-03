import { tonEthSimple } from './ton-eth-simple'

describe('TON-ETH Simple Demo', () => {
    it('should demonstrate TON to ETH atomic swap flow with instructions', async () => {
        await tonEthSimple()
    }, 120000) // 2 minute timeout
})