import { NetworkProvider } from '@ton/blueprint';
import { Address, beginCell, toNano } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { Op } from '../utils/Constants';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    console.log('\nVault Refund Jetton Tool');
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
    const queryId = BigInt(await ui.input('Query ID (decimal): '));
    
    // Secret input for Swap ID
    const secret = await ui.input('Secret for Swap ID: ');
    // Build secret cell for contract (as ref)
    const secretCell = beginCell().storeBuffer(Buffer.from(secret)).endCell();
    // Amount input
    const amount = BigInt(await ui.input('Amount of Jettons to refund in nano (1USDT = 1000000): '));

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
        console.log('\nSending refund_jetton transaction...');
        
        // Build the message (send secret as cell)
        const messageBody = beginCell()
            .storeUint(Op.refund_jetton, 32)  // op code (refund_jetton)
            .storeUint(queryId, 64)             // query_id (64-bit)
            .storeAddress(recipientAddr)        // recipient address (MsgAddress)
            .storeCoins(amount)                 // amount (coins)
            .storeRef(secretCell)               // secret cell (ref) for swap verification
            .endCell();
        
        // Send the transaction 
        await provider.sender().send({
            to: vaultAddr,
            value: toNano('0.1'), // must be bigger than required_gas in op::withdraw_jetton(0.065 TON)
            body: messageBody,
            sendMode: 1,  // Pay fee separately
        });
        
        console.log('\n✅ refund_jetton transaction sent successfully!');
        console.log('Check the transaction in the explorer.');
        
    } catch (error) {
        console.error('\n❌ Error sending transaction:');
        console.error(error);
    }
}
