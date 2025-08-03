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
    if (!cnf.createFork) {
        return {
            provider: new JsonRpcProvider(cnf.url, cnf.chainId, {
                cacheTimeout: -1,
                staticNetwork: true
            })
        }
    }

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

async function deposit(): Promise<void> {
    console.log('🚀 Starting ETH Deposit')

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
        console.log(`📋 Initial user balance: ${initialUserBalance / BigInt(10 ** 6)} USDC`)

        console.log('📝 Creating cross-chain order...')
        const secret = uint8ArrayToHex(randomBytes(32))
        
        console.log('🔑 SECRET (HASHLOCK PRIVATE KEY):', secret)

        const order = Sdk.CrossChainOrder.new(
            new Address(src.escrowFactory),
            {
                salt: Sdk.randBigInt(1000n),
                maker: new Address(await srcChainUser.getAddress()),
                makingAmount: parseUnits('100', 6),
                takingAmount: parseUnits('99', 6),
                makerAsset: new Address(config.chain.source.tokens.USDC.address),
                takerAsset: new Address(config.chain.destination.tokens.USDC.address)
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
        
        // Create resolver with dummy destination address since we're only doing ETH deposit
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

        const finalUserBalance = await srcChainUser.tokenBalance(config.chain.source.tokens.USDC.address)
        
        console.log('📊 Results:')
        console.log(`  Initial user balance: ${initialUserBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  Final user balance: ${finalUserBalance / BigInt(10 ** 6)} USDC`)
        console.log(`  User deposited: ${(initialUserBalance - finalUserBalance) / BigInt(10 ** 6)} USDC`)
        console.log(`  Escrow address: ${srcEscrowAddress}`)
        console.log(`  Order hash: ${orderHash}`)
        console.log(`  Transaction hash: ${orderFillHash}`)
        
        console.log('🎉 ETH deposit completed successfully!')

    } catch (error) {
        console.error('❌ Error executing deposit:', error)
        throw error
    } finally {
        if (src?.provider) src.provider.destroy()
        if (src?.node) await src.node.stop()
    }
}

export { deposit }