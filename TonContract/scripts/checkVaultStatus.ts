import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { SimpleVault } from '../wrappers/SimpleVault';

export async function run(provider: NetworkProvider) {
    // Your deployed contract address
    const contractAddress = Address.parse('EQBqjFXwHxWyhYZuNZSxSRPXvd8TQ8lAu_7B6GILhRsTIOkT');
    const simpleVault = provider.open(SimpleVault.createFromAddress(contractAddress));
    
    console.log('=== SimpleVault Status ===');
    console.log(`Contract Address: ${contractAddress.toString()}`);
    console.log(`Testnet Explorer: https://testnet.tonscan.org/address/${contractAddress.toString()}`);
    
    try {
        // Get vault data
        const vaultData = await simpleVault.getVaultData();
        console.log(`\n📊 Vault Information:`);
        console.log(`Owner: ${vaultData.ownerAddress.toString()}`);
        console.log(`Total Balance: ${vaultData.totalBalance} nanoTON`);
        console.log(`Total Balance: ${Number(vaultData.totalBalance) / 1e9} TON`);
        
        // Get balance using the separate method
        const balance = await simpleVault.getBalance();
        console.log(`\n💰 Balance Check:`);
        console.log(`Balance: ${balance} nanoTON`);
        console.log(`Balance: ${Number(balance) / 1e9} TON`);
        
        // Check if current user is owner
        const userAddress = provider.sender()?.address;
        if (userAddress) {
            const isOwner = vaultData.ownerAddress.equals(userAddress);
            console.log(`\n👤 Your Status:`);
            console.log(`Your Address: ${userAddress.toString()}`);
            console.log(`Are you the owner? ${isOwner ? '✅ Yes' : '❌ No'}`);
        }
        
    } catch (error) {
        console.error('❌ Error getting vault data:', error);
        console.log('The contract might still be deploying or there might be a network issue.');
    }
}