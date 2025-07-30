import { Address, beginCell, Cell, SendMode } from '@ton/core';
import { Vault } from '../../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { Op } from '../../utils/Constants';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    console.log('\nVault Admin Address Change');
    console.log('-------------------------');

    // 1. Vault Contract Address
    const vaultAddr = Address.parse(
        await ui.input('Enter Vault contract address: ')
    );

    // 2. New Admin Address
    const newAdminAddr = Address.parse(
        await ui.input('Enter new admin address: ')
    );

    // Initialize Vault contract
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    // Confirm current admin address
    try {
        const currentAdmin = await vault.getAdminAddress();
        console.log('\nCurrent Vault Admin:', currentAdmin.toString());
        
        if (currentAdmin.equals(newAdminAddr)) {
            throw new Error('New admin address is the same as the current admin address');
        }
        
        // Show confirmation
        console.log('\nPlease confirm the following change:');
        console.log('-----------------------------------');
        console.log('Vault Contract:', vaultAddr.toString());
        console.log('Current Admin: ', currentAdmin.toString());
        console.log('New Admin:     ', newAdminAddr.toString());
        console.log('Network:       ', provider.network());
        console.log('-----------------------------------');
        
        const confirm = await ui.choose(
            'Are you sure you want to proceed?',
            ['No, cancel', 'Yes, change admin'],
            (v) => v
        );
        
        if (confirm !== 'Yes, change admin') {
            console.log('Operation cancelled');
            return;
        }
        
    } catch (error) {
        console.error('Error fetching vault data:', error instanceof Error ? error.message : String(error));
        throw new Error('Failed to fetch vault data. Please verify the contract address and try again.');
    }

    // Create the admin change message
    // The contract expects: op::change_admin + query_id + new_admin_address
    const messageBody = beginCell()
        .storeUint(Op.change_admin, 32)  // Use constant from Op
        .storeUint(0, 64)  // query_id (0 for admin operations)
        .storeAddress(newAdminAddr)  // New admin address
        .endCell();

    // Send the transaction
    try {
        console.log('\nSending admin change transaction...');
        
        // Get the sender and send the message directly
        const sender = provider.sender();
        
        // Send the message directly to the contract
        // Using only PAY_GAS_SEPARATELY as required by the provider
        await sender.send({
            to: vault.address,
            value: toNano('0.1'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,  // Only use PAY_GAS_SEPARATELY as required
            body: messageBody,
            bounce: false
        });
        
        console.log('\n✅ Admin change transaction sent successfully!');
        console.log('The new admin address will take effect after the transaction is confirmed on-chain.');
        
    } catch (error) {
        console.error('❌ Failed to send admin change transaction:');
        console.error(error instanceof Error ? error.message : String(error));
        throw error;
    }
}

// Helper function to convert TON to nanoTON
function toNano(amount: string): bigint {
    return BigInt(Math.floor(parseFloat(amount) * 1000000000));
}
