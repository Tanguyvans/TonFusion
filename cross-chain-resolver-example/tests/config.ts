import {z} from 'zod'
import Sdk from '@1inch/cross-chain-sdk'
import * as process from 'node:process'

const bool = z
    .string()
    .transform((v) => v.toLowerCase() === 'true')
    .pipe(z.boolean())

const ConfigSchema = z.object({
    SRC_CHAIN_RPC: z.string().url(),
    DST_CHAIN_RPC: z.string().url(),
    SRC_CHAIN_CREATE_FORK: bool.default('true'),
    DST_CHAIN_CREATE_FORK: bool.default('true'),
    PRIVATE_KEY_1: z.string().optional(),
    PRIVATE_KEY_2: z.string().optional()
})

const fromEnv = ConfigSchema.parse(process.env)

export const config = {
    chain: {
        source: {
            chainId: 11155111, // Sepolia testnet (now supported in local SDK)
            url: fromEnv.SRC_CHAIN_RPC,
            createFork: fromEnv.SRC_CHAIN_CREATE_FORK,
            limitOrderProtocol: '0xb47e3709C8989AC76B9240A29dEd6Dc5C106A0e5', // Your deployed contract
            wrappedNative: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH
            ownerPrivateKey: fromEnv.PRIVATE_KEY_1 || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            tokens: {
                USDC: {
                    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Your Sepolia USDC
                    donor: '0x504b635B7E22F8DF7d037cf31639811AE583E9f0' // Your address as donor
                },
                WETH: {
                    address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH
                    donor: '0x504b635B7E22F8DF7d037cf31639811AE583E9f0' // Your address as donor
                }
            }
        },
        destination: {
            chainId: 97, // BSC testnet (now supported in local SDK)
            url: fromEnv.DST_CHAIN_RPC,
            createFork: fromEnv.DST_CHAIN_CREATE_FORK,
            limitOrderProtocol: '0x111111125421ca6dc452d289314280a0f8842a65', // 1inch on BSC testnet (if exists)
            wrappedNative: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // BSC testnet WBNB
            ownerPrivateKey: fromEnv.PRIVATE_KEY_2 || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            tokens: {
                USDC: {
                    address: '0x64544969ed7EBf5f083679233325356EbE738930', // BSC testnet USDC
                    donor: '0x1234567890123456789012345678901234567890' // Different address for BSC
                }
            }
        }
    }
} as const

export type ChainConfig = (typeof config.chain)['source' | 'destination']
