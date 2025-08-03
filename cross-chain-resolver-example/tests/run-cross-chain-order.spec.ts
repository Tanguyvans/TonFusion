import {executeCrossChainOrder} from './cross-chain-order'

describe('Run Cross Chain Order', () => {
    it('should execute cross chain order', async () => {
        await executeCrossChainOrder()
    }, 60000)

    afterAll(async () => {
        // Give time for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000))
    })
})