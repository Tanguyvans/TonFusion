import { NetworkProvider } from '@ton/blueprint';
import { Address, Dictionary, toNano } from '@ton/core';
import { JettonMaster } from '@ton/ton';
import { Vault, SwapsInfo } from '../wrappers/Vault';
import { getTonClient } from '../utils/TonClient';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    const address = Address.parse(
        await ui.input('Enter the Vault contract address:')
    );

    // Get the contract
    const vault = provider.open(Vault.createFromAddress(address));

    // Get current vault data
    const vaultData = await vault.getVaultData();
    console.log('\nCurrent Vault Data:');
    console.log('-----------------');
    console.log(`Stopped: ${vaultData.stopped}`);
    console.log(`Jetton Master: ${vaultData.jettonMaster?.toString()}`);
    console.log(`Jetton Wallet: ${vaultData.jettonWallet?.toString()}`);
    console.log('-----------------');

    // Calculate jetton wallet address
    const tonClient = getTonClient(provider.network() === 'custom' ? 'mainnet' : 'testnet');
    const calculatedJettonWallet = await tonClient.open(JettonMaster.create(vaultData.jettonMaster!)).getWalletAddress(address);

    // Show changes to be made
    console.log('\nChanges to be made:');
    console.log('-----------------');
    console.log('Stopped: false');
    console.log(`Jetton Master: ${vaultData.jettonMaster?.toString()}`);
    console.log(`Jetton Wallet: ${calculatedJettonWallet.toString()}`);
    console.log('-----------------');


    // Send the transaction using the Vault wrapper's method
    try {
        // Create an empty dictionary for dict_swaps_info if it's null
        const emptyDict = Dictionary.empty<bigint, SwapsInfo>();
        const params = {
            stopped: false,
            jettonMaster: vaultData.jettonMaster,
            jettonWallet: calculatedJettonWallet, // Use the calculated jetton wallet address
            dictSwapsInfo: emptyDict,
            value: toNano('0.05')
        };
        await vault.sendChangeVaultData(provider.sender(), params);
        
        console.log('\nTransaction completed successfully!');
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
}
