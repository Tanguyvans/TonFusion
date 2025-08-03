import { singleChainDemo } from './single-chain-demo'

describe('Single Chain Hashlock Demo', () => {
    it('should demonstrate deposit and withdraw with secret on one chain', async () => {
        await singleChainDemo()
    }, 120000) // 2 minute timeout
})