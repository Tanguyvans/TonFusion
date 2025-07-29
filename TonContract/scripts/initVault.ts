import { NetworkProvider } from '@ton/blueprint';
import { Address, toNano, beginCell } from '@ton/core';
import { Vault } from '../wrappers/Vault';

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
    console.log(`Jetton Master: ${vaultData.jettonMaster?.toString() || 'Not set'}`);
    console.log(`Jetton Wallet: ${vaultData.jettonWallet?.toString() || 'Not set'}`);
    console.log('-----------------');

    // Confirm with user
    const confirm = await ui.input('Do you want to set stopped to false? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
        console.log('Operation cancelled');
        return;
    }

    // Send the transaction
    try {
        await provider.sender().send({
            to: address,
            value: toNano('0.05'),
            sendMode: 1,
            body: beginCell()
                .storeUint(0xf1b32984, 32) // op::change_vault_data()
                .storeBit(false) // stopped = false
                .storeAddress(vaultData.jettonMaster) // jetton_master (keep current)
                .storeAddress(vaultData.jettonWallet) // jetton_wallet (keep current)
                .storeDict(null) // dict_swaps_info (keep current)
                .endCell()
        });

        console.log('\nTransaction sent successfully!');
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
}
