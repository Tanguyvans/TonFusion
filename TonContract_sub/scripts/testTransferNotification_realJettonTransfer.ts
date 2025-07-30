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
    const swapsId = BigInt(swapsIdStr);
    console.log(`SwapsID: ${swapsId}`);
    
    // Get amount from user input
    const amountStr = await ui.input('Enter amount in nano (e.g., 1000000): ');
    const amount = BigInt(amountStr);
    console.log(`Amount: ${amount} nano`);
    
    // Fixed Ethereum address
    const sampleEthAddr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const ethereumUser = BigInt(sampleEthAddr);
    console.log(`Ethereum user: ${sampleEthAddr}`);
    
    // Convert to Buffer for the message
    const ethereumUserBuffer = Buffer.from('d8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 'hex');
    
    // Fixed Deadline (24 hours from now)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + (24 * 60 * 60));
    console.log(`Deadline: ${deadline} (${new Date(Number(deadline) * 1000).toISOString()})`);
    
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
    console.log('\nCustom Payload:');
    console.log(`  Ethereum User: 0x${ethereumUser.toString(16)}`);
    console.log(`  TON User: ${senderAddr.toString()}`);
    console.log(`  Deadline: ${deadline} (${new Date(Number(deadline) * 1000).toISOString()})`);
    console.log('\nAdditional Info:');
    console.log(`  Network: ${provider.network()}`);
    console.log('------------------');
    
    // Build forward payload
    const forwardPayload = beginCell()
        .storeUint(Op.register_deposit, 32) // op::register_deposit
        .storeBuffer(ethereumUserBuffer)    // ethereum_user (160 bits)
        .storeAddress(senderAddr)           // ton_user (using sender address)
        .storeUint(deadline, 64)            // deadline (64 bits)
        .endCell();
    
    // Build the transfer message
    const transferMessage = beginCell()
        .storeUint(Op.transfer, 32) // transfer opcode from Constants
        .storeUint(swapsId, 64)    // swaps_id
        .storeCoins(amount)        // amount
        .storeAddress(destinationAddr) // destination
        .storeAddress(senderAddr)      // response_destination (sender)
        .storeBit(0)                // custom_payload: null
        .storeCoins(forwardTonAmount) // forward_ton_amount
        .storeBit(1)                // forward_payload exists
        .storeRef(forwardPayload)     // forward_payload with ethereum_user, ton_user, deadline
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
        
        console.log('Jetton transfer sent successfully!');
        console.log('--------------------------------');
        console.log('Transaction details:');
        console.log('- From (sender):', senderAddr.toString());
        console.log('- Jetton Master:', jettonMasterAddr.toString());
        console.log('- Jetton Wallet:', jettonWalletAddr.toString());
        console.log('- Amount:', amount, 'nano');
        console.log('- Destination:', destinationAddr.toString());
        console.log('- Gas sent:', gasAmount, 'nanoTON');
        
        console.log('You can check the transaction on a TON explorer.');
        console.log('\nConfirmation method after sending:');
        console.log(`1. Tonviewer: get_swaps_info_debug(${swapsId})`);
        console.log('2. The result should be as follows:');
        console.log('   - The first value is -0x1 (found)');
        console.log(`   - The second value is 0x${ethereumUser.toString(16)} (Ethereum address)`);
        console.log(`   - The third value is ${senderAddr.toString()} (TON address)`);
        console.log(`   - The fourth value is ${amount} (amount in nanoTON)`);
        console.log('   - The fifth value is <creation_timestamp> (creation timestamp)');
        console.log(`   - The sixth value is ${deadline} (deadline as UNIX timestamp)`);
        console.log('   - The seventh value is 0 (status: 0=init, 1=completed, 2=refunded)');
        
    } catch (error) {
        console.error('\nError sending Jetton transfer:');
        console.error(error instanceof Error ? error.message : String(error));
    }
}
