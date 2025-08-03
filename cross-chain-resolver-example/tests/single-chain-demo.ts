import 'dotenv/config'
import {
    computeAddress,
    ContractFactory,
    JsonRpcProvider,
    MaxUint256,
    parseEther,
    parseUnits,
    randomBytes,
    Wallet as SignerWallet
} from 'ethers'
import { createServer, CreateServerReturnType } from 'prool'
import { anvil } from 'prool/instances'
import { uint8ArrayToHex, UINT_40_MAX } from '@1inch/byte-utils'
import assert from 'node:assert'
import * as readline from 'readline'

import Sdk from '@1inch/cross-chain-sdk'
import { ChainConfig, config } from './config'
import { Wallet } from './wallet'
import { Resolver } from './resolver'
import { EscrowFactory } from './escrow-factory'
import factoryContract from '../dist/contracts/TestEscrowFactory.sol/TestEscrowFactory.json'
import resolverContract from '../dist/contracts/Resolver.sol/Resolver.json'

const { Address } = Sdk

const userPk = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const resolverPk = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'

type Chain = {
    node?: CreateServerReturnType | undefined
    provider: JsonRpcProvider
    escrowFactory: string
    resolver: string
}

async function initChain(
    cnf: ChainConfig
): Promise<{ node?: CreateServerReturnType; provider: JsonRpcProvider; escrowFactory: string; resolver: string }> {
    const { node, provider } = await getProvider(cnf)
    const deployer = new SignerWallet(cnf.ownerPrivateKey, provider)

    console.log(`[${cnf.chainId}] Deploying contracts...`)

    const escrowFactory = await deploy(
        factoryContract,
        [
            cnf.limitOrderProtocol,
            cnf.wrappedNative,
            Address.fromBigInt(0n).toString(),
            deployer.address,
            60 * 30,
            60 * 30
        ],
        provider,
        deployer
    )
    console.log(`[${cnf.chainId}] Escrow factory contract deployed to`, escrowFactory)

    const resolver = await deploy(
        resolverContract,
        [
            escrowFactory,
            cnf.limitOrderProtocol,
            computeAddress(resolverPk)
        ],
        provider,
        deployer
    )
    console.log(`[${cnf.chainId}] Resolver contract deployed to`, resolver)

    return { node, provider, resolver, escrowFactory }
}

async function getProvider(cnf: ChainConfig): Promise<{ node?: CreateServerReturnType; provider: JsonRpcProvider }> {
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

async function deploy(
    json: { abi: any; bytecode: any },
    params: unknown[],
    provider: JsonRpcProvider,
    deployer: SignerWallet
): Promise<string> {
    const deployed = await new ContractFactory(json.abi, json.bytecode, deployer).deploy(...params)
    await deployed.waitForDeployment()
    return await deployed.getAddress()
}

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

// Simple hashlock contract simulation (this is what the escrow does internally)
async function singleChainDemo(): Promise<void> {
    console.log('🚀 Single Chain Hashlock Demo (ETH only)')
    console.log('💡 This shows how deposit/withdraw works with just a secret on one chain')

    let src: Chain | undefined

    try {
        console.log('📡 Initializing ETH network...')
        src = await initChain(config.chain.source)

        const user = new Wallet(userPk, src.provider)
        const resolver = new Wallet(resolverPk, src.provider)

        console.log('💰 Setting up balances...')
        await user.topUpFromDonor(
            config.chain.source.tokens.USDC.address,
            config.chain.source.tokens.USDC.donor,
            parseUnits('1000', 6)
        )

        const initialUserBalance = await user.tokenBalance(config.chain.source.tokens.USDC.address)
        const initialResolverBalance = await resolver.tokenBalance(config.chain.source.tokens.USDC.address)
        
        console.log('📋 Initial balances:')
        console.log(`  User: ${initialUserBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Resolver: ${initialResolverBalance / BigInt(10 ** 6)} USDC`)

        // Generate secret (this is our "private key")
        const secret = uint8ArrayToHex(randomBytes(32))
        console.log('🔑 Generated SECRET (hashlock private key):', secret)

        // Create a simple hash of the secret (this would be the "public" part)
        const hashedSecret = Sdk.HashLock.forSingleFill(secret)
        console.log('🔒 Hashed secret (public):', hashedSecret.toString())

        console.log('\n🔵 === PHASE 1: DEPOSIT (Lock funds with secret) ===')
        await waitForEnter('📤 Press Enter to DEPOSIT 100 USDC into hashlock')

        // In a real hashlock contract, this would lock funds until the secret is revealed
        // For demo, we'll just transfer to resolver and track it
        const depositAmount = parseUnits('100', 6)
        
        // Transfer from user to resolver (simulating escrow lock)
        await user.transfer(resolver.address, depositAmount, config.chain.source.tokens.USDC.address)
        
        const afterDepositUserBalance = await user.tokenBalance(config.chain.source.tokens.USDC.address)
        const afterDepositResolverBalance = await resolver.tokenBalance(config.chain.source.tokens.USDC.address)
        
        console.log('✅ Deposit completed!')
        console.log('📊 After deposit:')
        console.log(`  User: ${afterDepositUserBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Resolver (holding funds): ${afterDepositResolverBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Amount locked: ${depositAmount / BigInt(10 ** 6)} USDC`)

        console.log('\n🟢 === PHASE 2: WITHDRAW (Unlock with secret) ===')
        console.log('💭 Imagine some time has passed...')
        console.log('🔑 Now we use the secret to unlock the funds')
        console.log(`🗝️  Secret to use: ${secret}`)
        
        await waitForEnter('📥 Press Enter to WITHDRAW using the secret')

        // In a real hashlock, you'd submit the secret to unlock funds
        // The contract would verify: hash(secret) == stored_hash
        console.log('🔓 Verifying secret matches hash...')
        
        // Simulate verification (in reality this happens on-chain)
        const providedHash = Sdk.HashLock.forSingleFill(secret)
        const isValidSecret = providedHash.toString() === hashedSecret.toString()
        
        if (isValidSecret) {
            console.log('✅ Secret is valid! Unlocking funds...')
            
            // Transfer back to user (simulating hashlock release)
            await resolver.transfer(user.address, depositAmount, config.chain.source.tokens.USDC.address)
            
            const finalUserBalance = await user.tokenBalance(config.chain.source.tokens.USDC.address)
            const finalResolverBalance = await resolver.tokenBalance(config.chain.source.tokens.USDC.address)
            
            console.log('✅ Withdrawal completed!')
            console.log('📊 Final balances:')
            console.log(`  User: ${finalUserBalance / BigInt(10 ** 6)} USDC`)
            console.log(`  Resolver: ${finalResolverBalance / BigInt(10 ** 6)} USDC`)
            
            console.log('\n📈 Summary:')
            console.log(`  User change: ${(finalUserBalance - initialUserBalance) / BigInt(10 ** 6)} USDC`)
            console.log(`  Resolver change: ${(finalResolverBalance - initialResolverBalance) / BigInt(10 ** 6)} USDC`)
            
            if (finalUserBalance === initialUserBalance) {
                console.log('🎉 Perfect! User got all their funds back using the secret!')
            }
            
        } else {
            console.log('❌ Invalid secret! Funds remain locked.')
        }

        console.log('\n💡 Key Concepts:')
        console.log('• Secret = Private key that unlocks funds')
        console.log('• Hash(secret) = Public commitment, stored on-chain')
        console.log('• Anyone with the secret can unlock the funds')
        console.log('• This is the basis of atomic swaps!')

    } catch (error) {
        console.error('❌ Error:', error)
        throw error
    } finally {
        if (src?.provider) src.provider.destroy()
        if (src?.node) await src.node.stop()
    }
}

export { singleChainDemo }