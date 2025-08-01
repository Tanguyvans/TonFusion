import { Address, beginCell } from '@ton/core';
import { Vault } from '../../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { toNano } from '@ton/core';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    console.log('\nVault Destruction Tool ⚠️');
    console.log('------------------------------');
    console.log('\nWarning: This action destroys the Vault and transfers remaining TON.');
    console.log('This operation cannot be undone. Please proceed with caution!\n');
    
    // Vault address input
    const vaultAddr = await ui.inputAddress('Vault address: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    // Get and verify current Vault data
    console.log('\nFetching Vault info before destruction...');
    try {
        const jettonData = await vault.getJettonData();
        const vaultData = await vault.getVaultData();
        
        console.log('\nVault Info:');
        console.log('--------------------');
        console.log(`Admin Address: ${jettonData.adminAddress}`);
        console.log(`Status: ${vaultData.stopped ? 'Stopped' : 'Active'}`);

    } catch (error) {
        console.warn('Could not fully retrieve Vault data:', error instanceof Error ? error.message : String(error));
        console.log('⚠️ Cannot verify Vault state. Destruction is dangerous!\n');
    }
    
    // Get sender address (same as recipient)
    const senderAddr = provider.sender().address;
    if (!senderAddr) {
        throw new Error('Failed to get sender address');
    }
    const toAddr = senderAddr;
    

    // Set gas amount (fixed: 0.05 TON)
    const gasAmount = toNano('0.05');

        // Final confirmation
        const confirmOperation = await ui.choose(
            '\n⚠️ Final confirmation: Continue with Vault destruction?',
            ['No, cancel operation', 'Yes, continue destruction'],
            (v) => v
        );
        
        if (confirmOperation === 'No, cancel operation') {
            console.log('Operation cancelled by user.');
            return;
        }
    
    try {
        // Destruction message sending
        const body = beginCell().endCell();
        await vault.sendAdminMessage(
            provider.sender(),
            beginCell()
                .storeUint(0x18, 6)
                .storeAddress(toAddr)
                .storeCoins(gasAmount)
                .storeUint(0, 107)
                .storeRef(body)
                .endCell(),
            160,
        );
        
        console.log('\n✅ Destruction message sent successfully!');
        console.log('⚠️ Vault has been destroyed. This process cannot be undone.');
    } catch (error) {
        console.error('\n❌ Error during destruction:', error instanceof Error ? error.message : String(error));
        console.log('Please check your wallet and try again if needed.');
    }
}
