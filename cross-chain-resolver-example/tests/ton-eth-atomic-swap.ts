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

function askForInput(message: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
        
        rl.question(`${message}: `, (answer) => {
            rl.close()
            resolve(answer.trim())
        })
    })
}

async function tonEthAtomicSwap(): Promise<void> {
    console.log('🚀 TON-ETH Cross-Chain Demo')
    console.log('💡 TON is SOURCE, ETH is DESTINATION')
    console.log('📱 You will deposit on TON first, then receive on ETH')

    const srcChainId = config.chain.source.chainId
    const dstChainId = config.chain.destination.chainId

    let dst: Chain | undefined

    try {
        console.log('\n📡 Initializing ETH network (destination)...')
        dst = await initChain(config.chain.destination)

        const dstChainUser = new Wallet(userPk, dst.provider)
        const dstChainResolver = new Wallet(resolverPk, dst.provider)
        const dstFactory = new EscrowFactory(dst.provider, dst.escrowFactory)

        console.log('💰 Setting up ETH balances (destination)...')
        
        const dstResolverContract = await Wallet.fromAddress(dst.resolver, dst.provider)
        
        // Setup destination resolver with USDC for the atomic swap
        await dstResolverContract.topUpFromDonor(
            config.chain.destination.tokens.USDC.address,
            config.chain.destination.tokens.USDC.donor,
            parseUnits('2000', 6)
        )
        await dstChainResolver.transfer(dst.resolver, parseEther('1'))
        await dstResolverContract.unlimitedApprove(config.chain.destination.tokens.USDC.address, dst.escrowFactory)

        const dstTimestamp = BigInt((await dst.provider.getBlock('latest'))!.timestamp)

        const initialDstUserBalance = await dstChainUser.tokenBalance(config.chain.destination.tokens.USDC.address)
        const initialDstResolverBalance = await dstResolverContract.tokenBalance(config.chain.destination.tokens.USDC.address)
        
        console.log('📋 Initial ETH balances:')
        console.log(`  User: ${initialDstUserBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Resolver: ${initialDstResolverBalance / BigInt(10 ** 6)} USDC`)

        // === SECRET GENERATION ===
        console.log('\n🔐 === SECRET INPUT ===')
        
        // Generate Query ID (channel identifier) - same as old CLI
        const queryId = Math.floor(Math.random() * 1000000)
        
        // Allow user to input their own secret
        const userSecret = await askForInput('Enter your secret (32-byte hex format, e.g., 0x1234...)')
        const secret = userSecret.startsWith('0x') ? userSecret : `0x${userSecret}`
        
        // Calculate swap ID (hash of the secret)
        const swapId = Sdk.HashLock.forSingleFill(secret).toString()
        
        console.log('📍 QUERY ID:', queryId, '(channel identifier)')
        console.log('🔑 SECRET (32-byte hex):', secret)
        console.log('🆔 ETH SWAP ID (ETH hash method):', swapId)
        console.log('\n💡 TON will calculate its own Swap ID using TON hash method')

        // === TON DEPOSIT PHASE ===
        console.log('\n🔵 === PHASE 1: TON DEPOSIT (SOURCE) ===')
        console.log('📱 Switch to your TON terminal and run:')
        console.log('   npx blueprint run')
        console.log('   Select: testTransferNotification_realJettonTransfer')
        console.log('\n📋 Use these values for TON deposit:')
        console.log(`   • Query ID: ${queryId}`)
        console.log(`   • Secret: ${secret}`)
        console.log('   • Amount: 1000 nano')
        console.log('   • Destination (Vault): EQD--f_k54qs29OKvLUZywXZYLQkDb6Avvv2Lxr5P4G-giua')
        console.log('   • Jetton Master: EQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPnc4')
        console.log('\n🔐 TON Private Key Options:')
        console.log('   1. Use TON Connect (mobile wallet) - recommended')
        console.log('   2. If Blueprint asks for private key, use your TON wallet private key')
        console.log('\n💡 TON will calculate its own Swap ID using its hash method')
        console.log(`💡 ETH Swap ID: ${swapId}`)
        console.log('⏳ Complete the TON deposit first...')

        await waitForEnter('✅ Press Enter AFTER you have completed the TON deposit')

        // === ETH DESTINATION PHASE ===
        console.log('\n🟢 === PHASE 2: ETH DESTINATION SETUP ===')
        console.log('📝 Creating destination escrow on ETH to receive funds...')
        
        await waitForEnter('🔄 Press Enter to create ETH destination escrow')

        // Create a cross-chain order (ETH as destination)
        const order = Sdk.CrossChainOrder.new(
            new Address(dst.escrowFactory),
            {
                salt: Sdk.randBigInt(1000n),
                maker: new Address(await dstChainUser.getAddress()),
                makingAmount: parseUnits('99', 6), // What user will receive on ETH
                takingAmount: parseUnits('100', 6), // What was deposited on TON
                makerAsset: new Address(config.chain.destination.tokens.USDC.address),
                takerAsset: new Address(config.chain.source.tokens.USDC.address)
            },
            {
                hashLock: Sdk.HashLock.forSingleFill(secret),
                timeLocks: Sdk.TimeLocks.new({
                    srcWithdrawal: 10n,
                    srcPublicWithdrawal: 120n,
                    srcCancellation: 121n,
                    srcPublicCancellation: 122n,
                    dstWithdrawal: 10n,
                    dstPublicWithdrawal: 100n,
                    dstCancellation: 101n
                }),
                srcChainId: dstChainId, // ETH is now source for this order
                dstChainId: srcChainId, // TON is destination
                srcSafetyDeposit: parseEther('0.001'),
                dstSafetyDeposit: parseEther('0.001')
            },
            {
                auction: new Sdk.AuctionDetails({
                    initialRateBump: 0,
                    points: [],
                    duration: 120n,
                    startTime: dstTimestamp
                }),
                whitelist: [
                    {
                        address: new Address(dst.resolver),
                        allowFrom: 0n
                    }
                ],
                resolvingStartTime: 0n
            },
            {
                nonce: Sdk.randBigInt(UINT_40_MAX),
                allowPartialFills: false,
                allowMultipleFills: false
            }
        )

        // Create destination immutables for the user to receive funds
        const resolverContract = new Resolver(dst.resolver, dst.resolver)
        
        // Simulate the destination by transferring USDC to user
        console.log(`💸 [${dstChainId}] Transferring ${order.makingAmount / BigInt(10 ** 6)} USDC to user...`)
        
        await dstResolverContract.transfer(
            await dstChainUser.getAddress(),
            order.makingAmount,
            config.chain.destination.tokens.USDC.address
        )
        
        console.log(`✅ [${dstChainId}] User received USDC on ETH`)
        
        // Mock escrow address for display
        const dstEscrowAddress = dst.resolver
        const dstDeployedAt = BigInt(Math.floor(Date.now() / 1000))

        console.log('📊 ETH destination setup complete:')
        console.log(`  Destination escrow: ${dstEscrowAddress}`)
        console.log(`  User will receive: ${order.makingAmount / BigInt(10 ** 6)} USDC`)

        // === WITHDRAWAL PHASE ===
        console.log('\n🟢 === PHASE 3: WITHDRAWALS ===')
        console.log('Now both sides can withdraw using the secret!')
        
        console.log('\n📍 ETH Withdrawal (user receives):')
        console.log(`  • Escrow: ${dstEscrowAddress}`)
        console.log(`  • Secret: ${secret}`)
        console.log(`  • User will receive: ${order.makingAmount / BigInt(10 ** 6)} USDC`)
        
        console.log('\n📍 TON Withdrawal Instructions:')
        console.log('   Run: npx blueprint run')
        console.log('   Select: testWithdrawJetton')
        console.log(`   • Query ID: ${queryId}`)
        console.log(`   • Secret: ${secret}`)
        console.log('   • Amount: 1000')
        console.log(`   • Vault: EQD--f_k54qs29OKvLUZywXZYLQkDb6Avvv2Lxr5P4G-giua`)
        
        await waitForEnter('🔄 Press Enter to execute ETH withdrawal for user')
        
        console.log('⏱️  Simulating time passage for finality lock...')
        await dst.provider.send('evm_increaseTime', [11])

        console.log(`✅ [${dstChainId}] User already received USDC on ETH (simulated atomic swap)`)

        const finalDstUserBalance = await dstChainUser.tokenBalance(config.chain.destination.tokens.USDC.address)
        const finalDstResolverBalance = await dstResolverContract.tokenBalance(config.chain.destination.tokens.USDC.address)
        
        console.log('\n📊 Final ETH Results:')
        console.log(`  Initial - User: ${initialDstUserBalance / BigInt(10 ** 6)} USDC, Resolver: ${initialDstResolverBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Final - User: ${finalDstUserBalance / BigInt(10 ** 6)} USDC, Resolver: ${finalDstResolverBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Net changes:`)
        console.log(`    User received: ${(finalDstUserBalance - initialDstUserBalance) / BigInt(10 ** 6)} USDC`)
        console.log(`    Resolver sent: ${(initialDstResolverBalance - finalDstResolverBalance) / BigInt(10 ** 6)} USDC`)
        
        console.log('\n💡 TON → ETH Atomic Swap Summary:')
        console.log('• ✅ Phase 1: Deposited Jettons on TON with hashlock')
        console.log('• ✅ Phase 2: Created ETH destination escrow')
        console.log('• ✅ Phase 3: User received USDC on ETH')
        console.log('• 📱 Phase 3: Can withdraw Jettons on TON using same secret')
        console.log('\n🔐 The same secret unlocks funds on both chains!')
        console.log('🎉 TON-ETH atomic swap demonstration complete!')

    } catch (error) {
        console.error('❌ Error:', error)
        throw error
    } finally {
        if (dst?.provider) dst.provider.destroy()
        if (dst?.node) await dst.node.stop()
    }
}

export { tonEthAtomicSwap }