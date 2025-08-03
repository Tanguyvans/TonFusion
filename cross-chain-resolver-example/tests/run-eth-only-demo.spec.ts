import { ethOnlyDemo } from './eth-only-demo'

describe('ETH-Only Demo', () => {
    it('should execute deposit and withdraw on ETH only', async () => {
        await ethOnlyDemo()
    }, 120000) // 2 minute timeout
})