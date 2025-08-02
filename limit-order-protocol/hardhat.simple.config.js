require('@nomicfoundation/hardhat-ethers');
require('@nomicfoundation/hardhat-verify');
require('dotenv').config();

module.exports = {
    solidity: {
        version: '0.8.23',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1_000_000,
            },
            evmVersion: 'shanghai',
            viaIR: true,
        },
    },
    networks: {
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/v3dAERsw0s41dACgs8fVJ',
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 11155111,
        },
    },
    etherscan: {
        apiKey: {
            sepolia: process.env.ETHERSCAN_API_KEY || 'B8HWU3J9TFZ9HRGZ3V7UWIA3P1VN9XGC9H',
        },
    },
};