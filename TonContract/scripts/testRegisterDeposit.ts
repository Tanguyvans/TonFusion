import { NetworkProvider } from '@ton/blueprint';
import { Address, beginCell, toNano } from '@ton/core';
import { Vault } from '../wrappers/Vault';
import { Op } from '../utils/Constants';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    console.log('\nVault Register Deposit Test Tool');
    console.log('-------------------------------');
    
    // Vault address input
    const vaultAddr = await ui.inputAddress('Vault address: ');
    const vault = provider.open(Vault.createFromAddress(vaultAddr));
    
    // SwapsID input
    const input = await ui.input('SwapsID to input (decimal): ');
    const swapsId = BigInt(input);
    console.log(`SwapsID: ${swapsId}`);
    console.log(`SwapsID (hex): 0x${swapsId.toString(16)}`);
    
    // User address input
    let userAddr: Address;
    const senderAddr = provider.sender().address;
    if (senderAddr) {
        userAddr = senderAddr;
        console.log(`User address: ${userAddr.toString()}`);
    } else {
        throw new Error('Failed to get sender address');
    }

    // Index token amount input
    const indexAmount = toNano('1'); // 1.0 INDEX = 1,000,000,000 nanoINDEX
    console.log(`Index token amount: ${indexAmount} nanoINDEX (${Number(indexAmount) / 1e9} INDEX)`);

    // Gas amount input
    const gasAmount = toNano('0.10'); // 0.1 TON = 100,000,000 nanoTON
    console.log(`Gas amount: ${gasAmount} nanoTON (${Number(gasAmount) / 1e9} TON)`);
    
    // Message construction
    const message = beginCell()
        .storeUint(Op.register_deposit, 32) 
        .storeUint(swapsId, 64) 
        .storeAddress(userAddr) 
        .storeCoins(indexAmount) 
        .endCell();
    
    console.log('\nMessage details to send:');
    console.log(`Op code: 0x${Op.register_deposit.toString(16)} (register_deposit)`);
    console.log(`SwapsID: ${swapsId}`);
    console.log(`User address: ${userAddr.toString()}`);
    console.log(`Index token amount: ${indexAmount} nanoINDEX (${Number(indexAmount) / 1e9} INDEX)`);
    console.log(`Gas amount: ${gasAmount} nanoTON (${Number(gasAmount) / 1e9} TON)`);
    
    // Confirmation
    const confirm = await ui.choose(
        '\nSend message?',
        ['Yes', 'No'],
        (v) => v
    );
    
    if (confirm === 'No') {
        console.log('Operation cancelled');
        return;
    }
    
    // Message sending
    try {
        console.log('\nSending message...');
        
        // Internal message sending
        await provider.sender().send({
            to: vaultAddr,
            value: gasAmount,
            body: message
        });
        
        console.log('Message sent successfully!');
        console.log('You can confirm the transaction on Tonviewer');
        console.log('\nConfirmation method after sending:');
        console.log(`1. Tonviewer: get_swaps_info_debug(${swapsId})`);
        console.log('2. The result should be as follows:');
        console.log('   - The first value is -1 (data exists)');
        console.log(`   - The second value is ${indexAmount} (index token amount)`);
        console.log('   - The third value is 0 (number of received deposits)');
        console.log('   - The fourth value is the gas excess (gas sent minus used gas)');
        console.log('   - The fifth value is the current timestamp');
    } catch (error) {
        console.error('Error sending message:', error instanceof Error ? error.message : String(error));
    }
}
