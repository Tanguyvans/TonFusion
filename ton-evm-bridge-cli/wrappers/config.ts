import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  resolverAddress?: string;
  escrowFactoryAddress?: string;
}

export const networks: Record<string, NetworkConfig> = {
  ethereum: {
    name: 'Ethereum Mainnet',
    rpcUrl: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
    chainId: 1,
    resolverAddress: process.env.ETH_RESOLVER_ADDRESS,
    escrowFactoryAddress: process.env.ETH_ESCROW_FACTORY_ADDRESS,
  },
  sepolia: {
    name: 'Ethereum Sepolia Testnet',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
    chainId: 11155111,
    resolverAddress: process.env.SEPOLIA_RESOLVER_ADDRESS,
    escrowFactoryAddress: process.env.SEPOLIA_ESCROW_FACTORY_ADDRESS,
  },
  bsc: {
    name: 'BSC Mainnet',
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
    chainId: 56,
    resolverAddress: process.env.BSC_RESOLVER_ADDRESS,
    escrowFactoryAddress: process.env.BSC_ESCROW_FACTORY_ADDRESS,
  },
  bscTestnet: {
    name: 'BSC Testnet',
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    chainId: 97,
    resolverAddress: process.env.BSC_TESTNET_RESOLVER_ADDRESS,
    escrowFactoryAddress: process.env.BSC_TESTNET_ESCROW_FACTORY_ADDRESS,
  },
  polygon: {
    name: 'Polygon Mainnet',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com/',
    chainId: 137,
  },
  mumbai: {
    name: 'Polygon Mumbai Testnet',
    rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com/',
    chainId: 80001,
    resolverAddress: process.env.MUMBAI_RESOLVER_ADDRESS,
    escrowFactoryAddress: process.env.MUMBAI_ESCROW_FACTORY_ADDRESS,
  },
};

export const getProvider = (network: string): ethers.Provider => {
  const config = networks[network];
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }
  return new ethers.JsonRpcProvider(config.rpcUrl);
};

export const getWallet = (network: string): ethers.Wallet => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not found in environment');
  }
  const provider = getProvider(network);
  return new ethers.Wallet(privateKey, provider);
};

export const tonConfig = {
  endpoint: process.env.TON_ENDPOINT || 'https://testnet.toncenter.com/api/v2/jsonRPC',
  apiKey: process.env.TON_API_KEY,
  mnemonic: process.env.TON_MNEMONIC,
  bridgeAddress: process.env.TON_BRIDGE_ADDRESS,
};