import { deposit } from './deposit'

describe('Deposit Test', () => {
    it('should execute ETH deposit and print secret', async () => {
        await deposit()
    }, 120000) // 2 minute timeout
})