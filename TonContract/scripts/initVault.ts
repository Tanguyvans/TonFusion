import { NetworkProvider } from '@ton/blueprint';
import { Address, Dictionary, toNano } from '@ton/core';
import { Vault, SwapsInfo } from '../wrappers/Vault';

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

    // 変更予定の内容を表示
    console.log('\nChanges to be made:');
    console.log('-----------------');
    console.log('Stopped: true -> false');
    console.log(`Jetton Master: ${vaultData.jettonMaster?.toString()}`);
    console.log(`Jetton Wallet: ${vaultData.jettonWallet?.toString()}`);
    console.log('-----------------');

    // ユーザーに確認
    const confirm = await ui.input('Do you want to apply these changes? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
        console.log('Operation cancelled');
        return;
    }

    // Send the transaction using the Vault wrapper's method
    try {
        // Create an empty dictionary for dict_swaps_info if it's null
        const emptyDict = Dictionary.empty<bigint, SwapsInfo>();
        const params = {
            stopped: false,
            jettonMaster: vaultData.jettonMaster,
            jettonWallet: vaultData.jettonWallet,
            dictSwapsInfo: emptyDict,
            value: toNano('0.05')
        };
        await vault.sendChangeVaultData(provider.sender(), params);
        
        console.log('\nTransaction completed successfully!');
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
}
