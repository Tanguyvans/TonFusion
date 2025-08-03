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

async function ethTonAtomicSwap(): Promise<void> {
    console.log('🚀 ETH-TON Cross-Chain Demo')
    console.log('💡 This demo coordinates with TON blockchain for atomic swaps')
    console.log('📱 You will need to run TON commands in a separate terminal')

    const srcChainId = config.chain.source.chainId
    const dstChainId = config.chain.destination.chainId

    let src: Chain | undefined

    try {
        console.log('\n📡 Initializing ETH network...')
        src = await initChain(config.chain.source)

        const srcChainUser = new Wallet(userPk, src.provider)
        const srcChainResolver = new Wallet(resolverPk, src.provider)
        const srcFactory = new EscrowFactory(src.provider, src.escrowFactory)

        console.log('💰 Setting up token balances...')
        await srcChainUser.topUpFromDonor(
            config.chain.source.tokens.USDC.address,
            config.chain.source.tokens.USDC.donor,
            parseUnits('1000', 6)
        )
        await srcChainUser.approveToken(
            config.chain.source.tokens.USDC.address,
            config.chain.source.limitOrderProtocol,
            MaxUint256
        )

        const srcResolverContract = await Wallet.fromAddress(src.resolver, src.provider)
        const srcTimestamp = BigInt((await src.provider.getBlock('latest'))!.timestamp)

        const initialUserBalance = await srcChainUser.tokenBalance(config.chain.source.tokens.USDC.address)
        const initialResolverBalance = await srcResolverContract.tokenBalance(config.chain.source.tokens.USDC.address)
        
        console.log('📋 Initial balances:')
        console.log(`  User: ${initialUserBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Resolver: ${initialResolverBalance / BigInt(10 ** 6)} USDC`)

        // === DEPOSIT PHASE ===
        console.log('\n🔵 === PHASE 1: ETH DEPOSIT ===')
        console.log('📝 Creating ETH order and generating secret...')
        
        // Generate Query ID (channel identifier) - same as old CLI
        const queryId = Math.floor(Math.random() * 1000000)
        
        // Generate secret - 32-byte random secret like the old CLI
        const secretBytes = randomBytes(32)
        const secret = uint8ArrayToHex(secretBytes)
        
        // Calculate swap ID (hash of the secret)
        const swapId = Sdk.HashLock.forSingleFill(secret).toString()
        
        console.log('\n🔐 === GENERATED VALUES ===')
        console.log('📍 QUERY ID:', queryId, '(channel identifier)')
        console.log('🔑 SECRET (32-byte hex):', secret)
        console.log('🆔 ETH SWAP ID (ETH hash method):', swapId)
        console.log('\n💡 TON will calculate its own Swap ID using TON hash method')
        
        await waitForEnter('🔄 Press Enter to create ETH deposit order')

        // Create cross-chain order (but we'll only use ETH side)
        const order = Sdk.CrossChainOrder.new(
            new Address(src.escrowFactory),
            {
                salt: Sdk.randBigInt(1000n),
                maker: new Address(await srcChainUser.getAddress()),
                makingAmount: parseUnits('100', 6),
                takingAmount: parseUnits('99', 6),
                makerAsset: new Address(config.chain.source.tokens.USDC.address),
                takerAsset: new Address(config.chain.destination.tokens.USDC.address) // BSC address for structure
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
                srcChainId,
                dstChainId,
                srcSafetyDeposit: parseEther('0.001'),
                dstSafetyDeposit: parseEther('0.001')
            },
            {
                auction: new Sdk.AuctionDetails({
                    initialRateBump: 0,
                    points: [],
                    duration: 120n,
                    startTime: srcTimestamp
                }),
                whitelist: [
                    {
                        address: new Address(src.resolver),
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

        const signature = await srcChainUser.signOrder(srcChainId, order)
        const orderHash = order.getOrderHash(srcChainId)
        
        // Use proper resolver addresses for both src and dst
        const resolverContract = new Resolver(src.resolver, src.resolver)

        console.log(`🔄 [${srcChainId}] Filling order ${orderHash}`)

        const fillAmount = order.makingAmount
        const { txHash: orderFillHash, blockHash: srcDeployBlock } = await srcChainResolver.send(
            resolverContract.deploySrc(
                srcChainId,
                order,
                signature,
                Sdk.TakerTraits.default()
                    .setExtension(order.extension)
                    .setAmountMode(Sdk.AmountMode.maker)
                    .setAmountThreshold(order.takingAmount),
                fillAmount
            )
        )

        console.log(`✅ [${srcChainId}] Order ${orderHash} filled for ${fillAmount / BigInt(10 ** 6)} USDC in tx ${orderFillHash}`)

        const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock)
        const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl()
        
        const srcEscrowAddress = new Sdk.EscrowFactory(new Address(src.escrowFactory)).getSrcEscrowAddress(
            srcEscrowEvent[0],
            ESCROW_SRC_IMPLEMENTATION
        )

        const afterDepositUserBalance = await srcChainUser.tokenBalance(config.chain.source.tokens.USDC.address)
        const afterDepositResolverBalance = await srcResolverContract.tokenBalance(config.chain.source.tokens.USDC.address)
        
        console.log('\n📊 ETH Deposit Complete:')
        console.log(`  User balance: ${afterDepositUserBalance / BigInt(10 ** 6)} USDC (was ${initialUserBalance / BigInt(10 ** 6)}`)
        console.log(`  Deposited: ${(initialUserBalance - afterDepositUserBalance) / BigInt(10 ** 6)} USDC`)
        console.log(`  Escrow address: ${srcEscrowAddress}`)
        console.log(`  Order hash: ${orderHash}`)
        
        // TON Instructions
        console.log('\n🔵 === PHASE 2: TON DEPOSIT ===')
        console.log('📱 Now switch to your TON terminal and run:')
        console.log('   npx blueprint run')
        console.log('   Select: testTransferNotification_realJettonTransfer')
        console.log('\n📋 Use these values for TON deposit:')
        console.log(`   • Query ID: ${queryId}`)
        console.log(`   • Secret: ${secret}`)
        console.log('   • Amount: 1000 nano')
        console.log('   • Destination (Vault): EQD--f_k54qs29OKvLUZywXZYLQkDb6Avvv2Lxr5P4G-giua')
        console.log('   • Jetton Master: EQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPnc4')
        console.log('\n💡 TON will calculate its own Swap ID using its hash method')
        console.log(`💡 ETH Swap ID: ${swapId}`)
        console.log('⏳ Complete the TON deposit, then come back here...')

        await waitForEnter('✅ Press Enter AFTER you have completed the TON deposit')
        
        // === WITHDRAW PHASE ===
        console.log('\n🟢 === PHASE 3: WITHDRAWALS ===')
        console.log('Now we can withdraw on both chains using the secret!')
        
        console.log('\n📍 ETH Withdrawal:')
        console.log(`  • Escrow: ${srcEscrowAddress}`)
        console.log(`  • Secret: ${secret}`)
        console.log(`  • Will withdraw: ${fillAmount / BigInt(10 ** 6)} USDC`)
        
        console.log('\n📍 TON Withdrawal Instructions:')
        console.log('   Run: npx blueprint run')
        console.log('   Select: testWithdrawJetton')
        console.log(`   • Query ID: ${queryId}`)
        console.log(`   • Secret: ${secret}`)
        console.log('   • Amount: 1000')
        console.log(`   • Vault: EQD--f_k54qs29OKvLUZywXZYLQkDb6Avvv2Lxr5P4G-giua`)
        
        await waitForEnter('🔄 Press Enter to execute ETH withdrawal')
        
        console.log('⏱️  Simulating time passage for finality lock...')
        await src.provider.send('evm_increaseTime', [11])

        console.log(`💰 [${srcChainId}] Withdrawing funds for resolver from ${srcEscrowAddress}`)
        const { txHash: resolverWithdrawHash } = await srcChainResolver.send(
            resolverContract.withdraw('src', srcEscrowAddress, secret, srcEscrowEvent[0])
        )
        console.log(`✅ [${srcChainId}] Withdrew funds from ${srcEscrowAddress} in tx ${resolverWithdrawHash}`)

        const finalUserBalance = await srcChainUser.tokenBalance(config.chain.source.tokens.USDC.address)
        const finalResolverBalance = await srcResolverContract.tokenBalance(config.chain.source.tokens.USDC.address)
        
        console.log('\n📊 Final ETH Results:')
        console.log(`  Initial - User: ${initialUserBalance / BigInt(10 ** 6)} USDC, Resolver: ${initialResolverBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Final - User: ${finalUserBalance / BigInt(10 ** 6)} USDC, Resolver: ${finalResolverBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Net changes:`)
        console.log(`    User: ${(finalUserBalance - initialUserBalance) / BigInt(10 ** 6)} USDC`)
        console.log(`    Resolver: ${(finalResolverBalance - initialResolverBalance) / BigInt(10 ** 6)} USDC`)
        
        console.log('\n💡 Cross-Chain Atomic Swap Summary:')
        console.log('• ✅ Phase 1: Deposited USDC on ETH with hashlock')
        console.log('• ✅ Phase 2: Deposited Jettons on TON with same secret')
        console.log('• ✅ Phase 3: Withdrew on ETH using secret')
        console.log('• 📱 Phase 3: Can withdraw on TON using same secret')
        console.log('\n🔐 The same secret unlocks funds on both chains!')
        console.log('🎉 ETH-TON atomic swap demonstration complete!')

    } catch (error) {
        console.error('❌ Error:', error)
        throw error
    } finally {
        if (src?.provider) src.provider.destroy()
        if (src?.node) await src.node.stop()
    }
}

export { ethTonAtomicSwap }