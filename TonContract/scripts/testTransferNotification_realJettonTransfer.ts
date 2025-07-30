import { NetworkProvider } from '@ton/blueprint';
import { Address, beginCell, toNano, SendMode, Cell } from '@ton/core';
import { getJettonWalletAddr } from '../utils/Common';
import { Op } from '../utils/Constants';
import { getTonClient } from '../utils/TonClient';


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    console.log('\nJetton Transfer Test Tool');
    console.log('-------------------------');
    
    // Get tonClient
    const tonClient = getTonClient(provider.network() === 'custom' ? 'mainnet' : 'testnet');
    
    // Get Jetton master address
    const jettonMasterAddr = await ui.inputAddress('Jetton Master address: ');
    
    // Destination address (Vault contract)
    const destinationAddr = await ui.inputAddress('Destination address (Vault contract): ');
    
    // Calculate Jetton wallet address
    const jettonWalletAddr = await getJettonWalletAddr(tonClient, jettonMasterAddr, provider.sender().address!);
    
    // Get sender address
    const senderAddr = provider.sender().address;
    if (!senderAddr) {
        throw new Error('Failed to get sender address');
    }
    
    console.log(`\nSender address: ${senderAddr.toString()}`);
    
    // Get swaps ID and amount from user input
    const swapsIdStr = await ui.input('Enter swaps ID (e.g., 123): ');
    const amountStr = await ui.input('Enter amount in nano (e.g., 1000000): ');
    
    // Convert string inputs to BigInt
    const swapsId = BigInt(swapsIdStr);
    const amount = BigInt(amountStr);
    
    const forwardTonAmount = toNano('0.025'); // 0.025 TON for forward message (must be bigger than required_gas in op::transfer_notification(0.02 TON))
    const gasAmount = toNano('0.05'); // 0.05 TON for gas
    
    console.log('\nTransaction Details');
    console.log('------------------');
    console.log(`Transaction Type: Jetton Transfer`);
    console.log(`Swaps ID: ${swapsId}`);
    console.log(`Amount: ${amount} nano`);
    console.log('\nAddresses:');
    console.log(`  Sender:        ${senderAddr.toString()}`);
    console.log(`  Destination:   ${destinationAddr.toString()}`);
    console.log(`  Response To:   ${senderAddr.toString()}`);
    console.log(`  Jetton Master: ${jettonMasterAddr.toString()}`);
    console.log(`  Jetton Wallet: ${jettonWalletAddr.toString()}`);
    console.log('\nTransaction Parameters:');
    console.log(`  Forward TON:   ${forwardTonAmount} nano (${Number(forwardTonAmount) / 1e9} TON)`);
    console.log(`  Gas Allocated: ${gasAmount} nano (${Number(gasAmount) / 1e9} TON)`);
    console.log('\nAdditional Info:');
    console.log(`  Network: ${provider.network()}`);
    console.log('------------------');
    
    // Build the transfer message
    const transferMessage = beginCell()
        .storeUint(Op.transfer, 32) // transfer opcode from Constants
        .storeUint(swapsId, 64)    // swaps_id
        .storeCoins(amount)        // amount
        .storeAddress(destinationAddr) // destination
        .storeAddress(senderAddr)      // response_destination (sender)
        .storeBit(0)                // custom_payload: null
        .storeCoins(forwardTonAmount) // forward_ton_amount
        .storeBit(0)                // forward_payload: null
        .endCell();
    
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
        console.log(`- Jetton Master: ${jettonMasterAddr.toString()}`);
        console.log(`- Jetton Wallet: ${jettonWalletAddr.toString()}`);
        console.log(`- Amount: ${amount} nano`);
        console.log(`- Destination: ${destinationAddr.toString()}`);
        console.log(`- Gas sent: ${gasAmount} nanoTON`);
        console.log('\nYou can check the transaction on a TON explorer.');
        
    } catch (error) {
        console.error('\nError sending Jetton transfer:');
        console.error(error instanceof Error ? error.message : String(error));
    }
}
