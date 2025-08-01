import { Address, toNano } from '@ton/core';
import { Vault, VaultConfig } from '../../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { compile } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    console.log('\nVault Update Tool');
    console.log('----------------');

    // 1. Source Vault Address
    const vaultAddr = Address.parse(
        await ui.input('Enter Vault address to update: ')
    );
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    const jettonData = await vault.getJettonData();

    // Keep current content
    const newContent = jettonData.content;

    // Keep current total_supply
    const newTotalSupply = jettonData.totalSupply;

    // Keep default gas amount
    const gasAmount = toNano('0.05');
    
    // 実行確認
    const confirmUpdate = await ui.choose(
        '\nProceed with Vault update?',
        ['Yes, update the Vault', 'No, cancel the operation'],
        (v) => v
    );
    if (confirmUpdate === 'No, cancel the operation') {
        console.log('Operation cancelled by user.');
        return;
    }

    // 新しい設定を構築
    const newConfig: VaultConfig = {
        adminAddress: jettonData.adminAddress,
        content: newContent,
        walletCode: jettonData.walletCode,
        totalSupply: newTotalSupply,
    };
    
    console.log('\nNew Configuration:');
    console.log(JSON.stringify({
        adminAddress: newConfig.adminAddress.toString(),
        totalSupply: (newConfig.totalSupply || 0n).toString(),
    }, null, 2));

    // コードとデータを更新
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
