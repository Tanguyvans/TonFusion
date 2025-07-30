import { NetworkProvider } from '@ton/blueprint';
import { Address, beginCell, toNano, SendMode } from '@ton/core';
import { Op } from '../utils/Constants';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    console.log('\nJetton Transfer Test Tool');
    console.log('-------------------------');
    
    // Jetton wallet address input
    const jettonWalletAddr = await ui.inputAddress('Jetton Wallet address: ');
    
    // Destination address (Vault contract)
    const destinationAddr = await ui.inputAddress('Destination address (Vault contract): ');
    
    // Get sender address
    const senderAddr = provider.sender().address;
    if (!senderAddr) {
        throw new Error('Failed to get sender address');
    }
    
    console.log(`\nSender address: ${senderAddr.toString()}`);
    
    // Fixed values as per requirements
    const queryId = 1753850630n; // Fixed query_id
    const amount = 1000000n; // Fixed amount in nano
    const forwardTonAmount = toNano('0.02'); // 0.02 TON for forward message
    
    console.log('\nTransaction details:');
    console.log('------------------');
    console.log(`Query ID: ${queryId}`);
    console.log(`Amount: ${amount} nano`);
    console.log(`Destination: ${destinationAddr.toString()}`);
    console.log(`Response destination: ${senderAddr.toString()}`);
    console.log(`Forward TON amount: ${forwardTonAmount} nano`);
    
    // Build the transfer message
    const transferMessage = beginCell()
        .storeUint(Op.transfer, 32) // transfer opcode from Constants
        .storeUint(queryId, 64)    // query_id
        .storeCoins(amount)        // amount
        .storeAddress(destinationAddr) // destination
        .storeAddress(senderAddr)      // response_destination (sender)
        .storeBit(0)                // custom_payload: null
        .storeCoins(forwardTonAmount) // forward_ton_amount
        .storeBit(0)                // forward_payload: null
        .endCell();
    
    // Calculate gas amount (0.05 TON)
    const gasAmount = toNano('0.05');
    
    // Confirmation
    const confirm = await ui.choose(
        '\nSend Jetton transfer?',
        ['Yes', 'No'],
        (v) => v
    );
    
    if (confirm === 'No') {
        console.log('Operation cancelled');
        return;
    }
    
    // Send the transfer message
    try {
        console.log('\nSending Jetton transfer...');
        
        await provider.sender().send({
            to: jettonWalletAddr,
            value: gasAmount,
            body: transferMessage,
            sendMode: SendMode.PAY_GAS_SEPARATELY // pay fees separately (DeployerSender only supports this mode)
        });
        
        console.log('\nJetton transfer sent successfully!');
        console.log('--------------------------------');
        console.log('Transaction details:');
        console.log(`- From (sender): ${senderAddr.toString()}`);
        console.log(`- To (jetton wallet): ${jettonWalletAddr.toString()}`);
        console.log(`- Amount: ${amount} nano`);
        console.log(`- Destination: ${destinationAddr.toString()}`);
        console.log(`- Gas used: ${gasAmount} nanoTON`);
        console.log('\nYou can check the transaction on a TON explorer.');
        
    } catch (error) {
        console.error('\nError sending Jetton transfer:');
        console.error(error instanceof Error ? error.message : String(error));
    }
}
