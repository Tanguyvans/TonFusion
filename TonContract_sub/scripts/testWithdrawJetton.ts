import { NetworkProvider } from '@ton/blueprint';
import { Address, beginCell, toNano } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { Op } from '../utils/Constants';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    console.log('\nVault Withdraw Jetton Tool');
    console.log('---------------------------');
    
    // Vault address input
    const vaultAddr = await ui.inputAddress('Vault contract address: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    // Get sender address (same as recipient)
    const senderAddr = provider.sender().address;
    if (!senderAddr) {
        throw new Error('Failed to get sender address');
    }
    const recipientAddr = senderAddr;
    
    // Query ID input
    const queryId = BigInt(await ui.input('Enter query ID (e.g., 123): '));
    
    // Swap ID (fixed 256-bit value: all 2)
    const swapId = BigInt('0x' + '2'.repeat(64));  // 256-bit: 0x222...222
    // Pad the hex string to ensure it's always 64 characters (256 bits)
    const hexString = swapId.toString(16).padStart(64, '0');
    console.log(`Swap ID (hex): 0x${hexString}`);
    // Amount input
    const amount = BigInt(await ui.input('Amount of Jettons to withdraw (in basic units): '));

    console.log('\nTransaction Details:');
    console.log('------------------');
    console.log(`Vault: ${vaultAddr.toString()}`);
    console.log(`Recipient (same as sender): ${recipientAddr.toString()}`);
    console.log(`Amount: ${amount} basic units`);
    
    // Confirmation
    const confirm = await ui.choose('Confirm and send the transaction?', ['Yes', 'No'], (f) => f);
    if (confirm !== 'Yes') {
        console.log('Operation cancelled.');
        return;
    }
    
    try {
        console.log('\nSending withdraw_jetton transaction...');
        
        // Build the message
        const messageBody = beginCell()
            .storeUint(Op.withdraw_jetton, 32)  // op code
            .storeUint(queryId, 64)              // query_id
            .storeAddress(recipientAddr)         // to_address
            .storeCoins(amount)                  // amount
            .storeUint(swapId, 256)              // swap_id (256-bit)
            .endCell();
        
        // Send the transaction 
        await provider.sender().send({
            to: vaultAddr,
            value: toNano('0.1'), // must be bigger than required_gas in op::withdraw_jetton(0.065 TON)
            body: messageBody,
            sendMode: 1,  // Pay fee separately
        });
        
        console.log('\n✅ withdraw_jetton transaction sent successfully!');
        console.log('Check the transaction in the explorer.');
        
    } catch (error) {
        console.error('\n❌ Error sending transaction:');
        console.error(error);
    }
}
