import { Address, toNano, Cell, Dictionary } from '@ton/core';
import { Vault, VaultConfig, SwapsInfoValue } from '../../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { compile } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    console.log('\nVault Update Tool');
    console.log('----------------');

    // 1. Get the target Vault address
    const vaultAddr = Address.parse(
        await ui.input('Enter Vault address to update: ')
    );
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    const jettonData = await vault.getJettonData();
    const vaultData = await vault.getVaultData();

    // Use current content
    const newContent = jettonData.content;

    // Use current total supply
    const newTotalSupply = jettonData.totalSupply;

    // Use default gas amount
    const gasAmount = toNano('0.05');
    
    // Confirm before executing
    const confirmUpdate = await ui.choose(
        '\nProceed with Vault update?',
        ['Yes, update the Vault', 'No, cancel the operation'],
        (v) => v
    );
    if (confirmUpdate === 'No, cancel the operation') {
        console.log('Operation cancelled by user.');
        return;
    }

    // Build new config
    const newConfig: VaultConfig = {
        adminAddress: jettonData.adminAddress,
        content: newContent,
        walletCode: jettonData.walletCode,
        totalSupply: newTotalSupply,
        jettonMaster: vaultData.jettonMaster,
        jettonWallet: vaultData.jettonWallet,
        dictSwapsInfo: vaultData.dictSwapsInfo ? Dictionary.load(Dictionary.Keys.BigUint(64), SwapsInfoValue, vaultData.dictSwapsInfo) : undefined,
    };

    
    console.log('\nNew Configuration:');
    console.log(JSON.stringify({
        adminAddress: newConfig.adminAddress.toString(),
        totalSupply: (newConfig.totalSupply || 0n).toString(),
    }, null, 2));

    // Update Vault code and data
    console.log('\nUpdating Vault code and data...');
    
    try {
        await vault.sendChangeCodeAndData(
            provider.sender(),
            await compile('Vault'),
            newConfig,
            gasAmount
        );
        console.log('Transaction sent successfully!');
    } catch (error) {
        console.error('Error updating Vault:', error);
        console.log('Please check your wallet and try again.');
    }
}
