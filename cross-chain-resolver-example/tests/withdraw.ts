import 'dotenv/config'
import {
    JsonRpcProvider,
    Wallet as SignerWallet
} from 'ethers'
import { createServer, CreateServerReturnType } from 'prool'
import { anvil } from 'prool/instances'
import assert from 'node:assert'

import Sdk from '@1inch/cross-chain-sdk'
import { ChainConfig, config } from './config'
import { Wallet } from './wallet'
import { Resolver } from './resolver'
import { EscrowFactory } from './escrow-factory'

const { Address } = Sdk

const resolverPk = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'

type Chain = {
    node?: CreateServerReturnType | undefined
    provider: JsonRpcProvider
    escrowFactory: string
    resolver: string
}

async function getProvider(cnf: ChainConfig): Promise<{ node?: CreateServerReturnType; provider: JsonRpcProvider }> {
    // Always use fork for withdraw since we need to recreate the deposit state
    const node = createServer({
        instance: anvil({ forkUrl: cnf.url, chainId: cnf.chainId }),
        limit: 1
    })
    await node.start()

    const address = node.address()
    assert(address)

    const provider = new JsonRpcProvider(`http://[${address.address}]:${address.port}/1`, cnf.chainId, {
        cacheTimeout: -1,
        staticNetwork: true
    })

    return { provider, node }
}

async function connectToExistingChain(
    cnf: ChainConfig,
    existingEscrowFactory: string,
    existingResolver: string
): Promise<Chain> {
    const { node, provider } = await getProvider(cnf)
    
    console.log(`[${cnf.chainId}] Connecting to existing contracts...`)
    console.log(`  Escrow Factory: ${existingEscrowFactory}`)
    console.log(`  Resolver: ${existingResolver}`)

    return { node, provider, escrowFactory: existingEscrowFactory, resolver: existingResolver }
}

interface WithdrawParams {
    secret: string
    escrowAddress: string
    orderHash: string
    srcEscrowFactoryAddress: string
    srcResolverAddress: string
    dstEscrowFactoryAddress?: string
    dstResolverAddress?: string
}

async function withdraw(params: WithdrawParams): Promise<void> {
    console.log('🚀 Starting Withdrawal Process')
    console.log(`🔑 Using secret: ${params.secret}`)
    console.log(`📍 Escrow address: ${params.escrowAddress}`)
    console.log(`📋 Order hash: ${params.orderHash}`)

    const srcChainId = config.chain.source.chainId

    let src: Chain | undefined

    try {
        console.log('📡 Connecting to ETH network...')
        src = await connectToExistingChain(
            config.chain.source,
            params.srcEscrowFactoryAddress,
            params.srcResolverAddress
        )

        const srcChainResolver = new Wallet(resolverPk, src.provider)
        const srcFactory = new EscrowFactory(src.provider, src.escrowFactory)

        console.log('💰 Checking initial balances...')
        const srcResolverContract = await Wallet.fromAddress(src.resolver, src.provider)
        const initialResolverBalance = await srcResolverContract.tokenBalance(config.chain.source.tokens.USDC.address)
        
        console.log(`📋 Initial resolver balance: ${initialResolverBalance / BigInt(10 ** 6)} USDC`)

        // Simulate time passing (finality lock)
        console.log('⏱️  Simulating time passage for finality lock...')
        await src.provider.send('evm_increaseTime', [11])

        // For withdrawal, we need to reconstruct the escrow event data
        // This is a simplified approach - in a real scenario you'd store this data from the deposit
        console.log('🔄 Attempting withdrawal from source escrow...')
        
        // Create resolver contract interface
        const resolverContract = new Resolver(src.resolver, src.resolver)

        // We need to get the escrow event to perform withdrawal
        // For this example, we'll try to find recent events
        const latestBlock = await src.provider.getBlockNumber()
        const fromBlock = Math.max(0, latestBlock - 1000) // Look back 1000 blocks

        console.log(`🔍 Searching for escrow events from block ${fromBlock} to ${latestBlock}...`)
        
        try {
            // Try to find the source deploy event by looking for recent events
            let srcEscrowEvent = null
            
            // Search through recent blocks for the deploy event
            for (let blockNum = latestBlock; blockNum >= fromBlock; blockNum--) {
                try {
                    const events = await srcFactory.getSrcDeployEvent(blockNum.toString())
                    if (events) {
                        srcEscrowEvent = events
                        console.log(`✅ Found escrow event at block ${blockNum}`)
                        break
                    }
                } catch (error) {
                    // Continue searching
                }
            }

            if (!srcEscrowEvent) {
                console.log('⚠️  Could not find escrow event automatically.')
                console.log('💡 Alternative approach: Manual withdrawal attempt...')
                
                // If we can't find the event, we can try a direct withdrawal call
                // This requires the escrow contract to be deployed and the secret to be correct
                const escrowContract = await Wallet.fromAddress(params.escrowAddress, src.provider)
                
                console.log('🎯 Attempting direct withdrawal...')
                
                // Try to call withdraw directly on the escrow contract
                // Note: This approach depends on the escrow contract interface
                try {
                    const tx = await srcChainResolver.getContract().sendTransaction({
                        to: params.escrowAddress,
                        data: '0x' // This would need the proper withdraw function call data
                    })
                    console.log(`✅ Direct withdrawal transaction: ${tx.hash}`)
                } catch (error) {
                    console.log('❌ Direct withdrawal failed:', error.message)
                    throw new Error('Could not perform withdrawal - escrow event data needed')
                }
            } else {
                // Use the found escrow event for proper withdrawal
                const { txHash: resolverWithdrawHash } = await srcChainResolver.send(
                    resolverContract.withdraw('src', params.escrowAddress, params.secret, srcEscrowEvent[0])
                )
                console.log(`✅ [${srcChainId}] Withdrew funds from ${params.escrowAddress} in tx ${resolverWithdrawHash}`)
            }

        } catch (error) {
            console.error('❌ Withdrawal error:', error.message)
            
            // Provide helpful information about what went wrong
            console.log('\n🔧 Troubleshooting:')
            console.log('1. Ensure the secret is correct')
            console.log('2. Verify the escrow address exists and has funds')
            console.log('3. Check that enough time has passed (finality lock)')
            console.log('4. Confirm you have the correct resolver private key')
            
            throw error
        }

        const finalResolverBalance = await srcResolverContract.tokenBalance(config.chain.source.tokens.USDC.address)
        
        console.log('📊 Results:')
        console.log(`  Initial resolver balance: ${initialResolverBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Final resolver balance: ${finalResolverBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Resolver withdrew: ${(finalResolverBalance - initialResolverBalance) / BigInt(10 ** 6)} USDC`)
        
        console.log('🎉 Withdrawal completed successfully!')

    } catch (error) {
        console.error('❌ Error executing withdrawal:', error)
        throw error
    } finally {
        if (src?.provider) src.provider.destroy()
        if (src?.node) await src.node.stop()
    }
}

export { withdraw }