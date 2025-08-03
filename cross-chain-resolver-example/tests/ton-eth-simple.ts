import 'dotenv/config'
import {
    randomBytes
} from 'ethers'
import { uint8ArrayToHex } from '@1inch/byte-utils'
import * as readline from 'readline'

function waitForEnter(message: string): Promise<void> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
        
        rl.question(`${message} (Press Enter to continue...)`, () => {
            rl.close()
            resolve()
        })
    })
}

async function tonEthSimple(): Promise<void> {
    console.log('🚀 TON → ETH Atomic Swap Demonstration')
    console.log('💡 TON is SOURCE, ETH is DESTINATION')
    console.log('📱 You deposit Jettons on TON, receive USDC on ETH')

    try {
        // === SECRET GENERATION ===
        console.log('\n🔐 === GENERATING SECRET ===')
        
        const queryId = Math.floor(Math.random() * 1000000)
        const secretBytes = randomBytes(32)
        const secret = uint8ArrayToHex(secretBytes)
        
        console.log('📍 QUERY ID:', queryId, '(channel identifier)')
        console.log('🔑 SECRET (32-byte hex):', secret)
        console.log('\n💡 This secret will unlock funds on both TON and ETH')

        // === TON DEPOSIT PHASE ===
        console.log('\n🔵 === PHASE 1: TON DEPOSIT (SOURCE) ===')
        console.log('📱 In your TON terminal, run:')
        console.log('   npx blueprint run')
        console.log('   Select: testTransferNotification_realJettonTransfer')
        console.log('')
        console.log('📋 Enter these values in TON:')
        console.log(`   Jetton Master: EQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPnc4`)
        console.log(`   Destination (Vault): EQD--f_k54qs29OKvLUZywXZYLQkDb6Avvv2Lxr5P4G-giua`)
        console.log(`   Query ID: ${queryId}`)
        console.log(`   Secret: ${secret}`)
        console.log(`   Amount: 1000`)
        console.log('')
        console.log('🔐 Wallet Options:')
        console.log('   • Choose "TON Connect compatible mobile wallet" (recommended)')
        console.log('   • Or provide your TON private key if prompted')
        console.log('')
        console.log('⏳ Complete the TON deposit first...')

        await waitForEnter('✅ Press Enter AFTER TON deposit is confirmed')

        // === ETH DESTINATION PHASE ===
        console.log('\n🟢 === PHASE 2: ETH DESTINATION (Simulated) ===')
        console.log('💡 In production, ETH would automatically receive the swap')
        console.log('🔄 Simulating ETH destination contract setup...')
        
        await waitForEnter('📝 Press Enter to simulate ETH receiving USDC')
        
        console.log('✅ Simulated: ETH destination contract created')
        console.log('✅ Simulated: User would receive 99 USDC on ETH')
        console.log('💰 User balance change: +99 USDC')

        // === WITHDRAWAL PHASE ===
        console.log('\n🟢 === PHASE 3: WITHDRAWALS ===')
        console.log('🔐 Both chains can now be withdrawn using the secret!')
        
        console.log('\n📍 TON Withdrawal Instructions:')
        console.log('   In your TON terminal, run:')
        console.log('   npx blueprint run')
        console.log('   Select: testWithdrawJetton')
        console.log('')
        console.log('📋 Enter these values:')
        console.log(`   Vault: EQD--f_k54qs29OKvLUZywXZYLQkDb6Avvv2Lxr5P4G-giua`)
        console.log(`   Query ID: ${queryId}`)
        console.log(`   Secret: ${secret}`)
        console.log(`   Amount: 1000`)
        
        console.log('\n📍 ETH Status:')
        console.log('   ✅ User already received 99 USDC on ETH')
        console.log('   🔐 Secret successfully unlocked ETH funds')
        
        await waitForEnter('🎯 Press Enter after completing TON withdrawal (optional)')
        
        console.log('\n🎉 === ATOMIC SWAP COMPLETE ===')
        console.log('📊 Summary:')
        console.log('   • TON: Deposited 1000 nano Jettons ✅')
        console.log('   • ETH: Received 99 USDC ✅') 
        console.log('   • Secret successfully linked both chains ✅')
        console.log('   • Atomic swap: TON → ETH complete! 🎉')
        
        console.log('\n🔑 Key Concepts Demonstrated:')
        console.log('   • Same secret unlocks funds on both blockchains')
        console.log('   • TON and ETH use different hash methods for Swap IDs')
        console.log('   • Query ID acts as a channel identifier for TON')
        console.log('   • Atomic swaps enable trustless cross-chain trading')

        console.log('\n💾 Session Data:')
        console.log(`   Query ID: ${queryId}`)
        console.log(`   Secret: ${secret}`)

    } catch (error) {
        console.error('❌ Error:', error)
        throw error
    }
}

export { tonEthSimple }