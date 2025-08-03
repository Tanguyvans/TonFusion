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

async function ethOnlyDemo(): Promise<void> {
    console.log('🚀 ETH-Only Deposit & Withdraw Demo')
    console.log('💡 Deposit on ETH, withdraw on ETH (BSC address for order structure only)')

    const srcChainId = config.chain.source.chainId
    const dstChainId = config.chain.destination.chainId

    let src: Chain | undefined

    try {
        console.log('📡 Initializing ETH network...')
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
        console.log('\n🔵 === DEPOSIT PHASE (ETH) ===')
        console.log('📝 Ready to create order and deposit 100 USDC on ETH...')
        console.log('💡 Note: BSC address included for order structure, but no BSC deposit')
        
        await waitForEnter('🔄 Press Enter to execute the DEPOSIT on ETH')
        
        const secret = uint8ArrayToHex(randomBytes(32))
        console.log('🔑 SECRET (HASHLOCK PRIVATE KEY):', secret)

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
        
        // Use dummy BSC address for resolver (not actually used)
        const resolverContract = new Resolver(src.resolver, '0x0000000000000000000000000000000000000001')

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
        
        console.log('📊 After Deposit:')
        console.log(`  User: ${afterDepositUserBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Resolver: ${afterDepositResolverBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Escrow address: ${srcEscrowAddress}`)
        console.log(`  User deposited: ${(initialUserBalance - afterDepositUserBalance) / BigInt(10 ** 6)} USDC`)

        // === WITHDRAW PHASE ===
        console.log('\n🟢 === WITHDRAW PHASE (ETH) ===')
        console.log('💰 Ready to withdraw the deposited funds using the secret...')
        console.log(`🔑 Secret to be used: ${secret}`)
        console.log(`📍 Escrow address: ${srcEscrowAddress}`)
        console.log('💡 Note: Only withdrawing on ETH, no BSC interaction needed')
        
        await waitForEnter('🔄 Press Enter to execute the WITHDRAW on ETH')
        
        console.log('⏱️  Simulating time passage for finality lock...')
        await src.provider.send('evm_increaseTime', [11])

        console.log(`💰 [${srcChainId}] Withdrawing funds for resolver from ${srcEscrowAddress}`)
        const { txHash: resolverWithdrawHash } = await srcChainResolver.send(
            resolverContract.withdraw('src', srcEscrowAddress, secret, srcEscrowEvent[0])
        )
        console.log(`✅ [${srcChainId}] Withdrew funds from ${srcEscrowAddress} in tx ${resolverWithdrawHash}`)

        const finalUserBalance = await srcChainUser.tokenBalance(config.chain.source.tokens.USDC.address)
        const finalResolverBalance = await srcResolverContract.tokenBalance(config.chain.source.tokens.USDC.address)
        
        console.log('\n📊 Final Results:')
        console.log(`  Initial - User: ${initialUserBalance / BigInt(10 ** 6)} USDC, Resolver: ${initialResolverBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Final - User: ${finalUserBalance / BigInt(10 ** 6)} USDC, Resolver: ${finalResolverBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Net changes:`)
        console.log(`    User: ${(finalUserBalance - initialUserBalance) / BigInt(10 ** 6)} USDC`)
        console.log(`    Resolver: ${(finalResolverBalance - initialResolverBalance) / BigInt(10 ** 6)} USDC`)
        
        console.log('\n💡 Summary:')
        console.log('• ✅ Deposited 100 USDC on ETH using hashlock')
        console.log('• ✅ Withdrew 100 USDC on ETH using secret')
        console.log('• 📝 BSC address was only used for order structure')
        console.log('• 🔑 Secret acted as private key to unlock funds')
        console.log('🎉 ETH-only deposit & withdraw completed successfully!')

    } catch (error) {
        console.error('❌ Error:', error)
        throw error
    } finally {
        if (src?.provider) src.provider.destroy()
        if (src?.node) await src.node.stop()
    }
}

export { ethOnlyDemo }