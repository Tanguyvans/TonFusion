import { NetworkProvider } from '@ton/blueprint';
import { Address, beginCell, toNano, SendMode, Cell } from '@ton/core';
import { getJettonWalletAddr } from '../utils/Common';
import { Op } from '../utils/Constants';
import { getTonClient } from '../utils/TonClient';
import { monitorTransaction } from '../../TonTxMonitor/scripts/testTxMonitor';


export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    console.log('\nJetton Transfer Test Tool');
    console.log('-------------------------');
    
    // Get tonClient
    const tonClient = getTonClient(provider.network() === 'custom' ? 'mainnet' : 'testnet');
    
    // Get sender address
    const senderAddr = provider.sender().address;
    if (!senderAddr) {
        throw new Error('Failed to get sender address');
    }
    // Jetton master address (fixed)
    const jettonMasterAddr = 'kQD0GKBM8ZbryVk2aESmzfU6b9b_8era_IkvBSELujFZPsyy'; // USDT Jetton master address on TON testnet
    
    // Calculate Jetton wallet address
    const jettonWalletAddr = await getJettonWalletAddr(tonClient, Address.parse(jettonMasterAddr), provider.sender().address!);
    
    // Destination address (Vault contract)
    const destinationAddr = await ui.inputAddress('Destination address (Vault contract): ');

    // Query ID input
    const input = await ui.input('Query ID to input (decimal): ');
    const queryId = BigInt(input);

    // Swap ID: cell.hash() 
    const secret = await ui.input('Secret for Swap ID: ');
    const secretCell = beginCell().storeBuffer(Buffer.from(secret)).endCell();
    const cellHash = secretCell.hash().toString('hex');
    const swapId = BigInt('0x' + cellHash);
    const hexString = cellHash.padStart(64, '0');
    console.log(`Swap ID (hex): 0x${hexString}`);
    
    // Get amount from user input
    const amountStr = await ui.input('Amount of Jettons to deposit in nano (1USDT = 1000000): ');
    const amount = BigInt(amountStr);
    
    // Ethereum address selection
    const choice = await ui.input("Ethereum address:\n1. Use custom address\n2. Use Vitalik Buterin (0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045)\n\nEnter 1 or 2: ");
    
    let ethAddr, ethAddrBuffer;
    if (choice === '1') {
        // Custom address input
        const ethAddrInput = await ui.input("Ethereum address (with 0x): ");
        const cleanEthAddr = ethAddrInput.startsWith('0x') ? ethAddrInput.slice(2) : ethAddrInput;
        ethAddr = BigInt('0x' + cleanEthAddr);
        ethAddrBuffer = Buffer.from(cleanEthAddr, 'hex');
    } else {
        // Use Vitalik's address as sample
        const sampleEthAddr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
        ethAddr = BigInt(sampleEthAddr);
        ethAddrBuffer = Buffer.from(sampleEthAddr.slice(2), 'hex');
    }
    
    // Fixed deadlines
    const withdrawalDeadline = BigInt(Math.floor(Date.now() / 1000) + (3 * 60)); // 3 mins from now
    const publicWithdrawalDeadline = BigInt(Math.floor(Date.now() / 1000) + (6 * 60)); // 6 mins from now
    const cancellationDeadline = BigInt(Math.floor(Date.now() / 1000) + (9 * 60)); // 9 mins from now
    const publicCancellationDeadline = BigInt(Math.floor(Date.now() / 1000) + (12 * 60)); // 12 mins  from now
    
    // Fixed Ton Amount
    const forwardTonAmount = toNano('0.025'); // 0.025 TON for forward message (must be bigger than required_gas in op::transfer_notification(0.02 TON))
    const gasAmount = toNano('0.05'); // 0.05 TON for gas
    
    console.log('\nTransaction Details');
    console.log('------------------');
    console.log(`Transaction Type: Jetton Transfer`);
    console.log(`Query ID (decimal): ${queryId}`);
    console.log(`Query ID (hex): 0x${queryId.toString(16)}`);
    console.log(`Swap ID (hex): 0x${hexString}`);
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
    console.log(`  Ethereum address: 0x${ethAddr.toString(16)}`);
    console.log(`  TON address: ${senderAddr.toString()}`);
    console.log(`  Withdrawal deadline: ${withdrawalDeadline} (${new Date(Number(withdrawalDeadline) * 1000).toISOString()})`);
    console.log(`  Public withdrawal deadline: ${publicWithdrawalDeadline} (${new Date(Number(publicWithdrawalDeadline) * 1000).toISOString()})`);
    console.log(`  Cancellation deadline: ${cancellationDeadline} (${new Date(Number(cancellationDeadline) * 1000).toISOString()})`);
    console.log(`  Public cancellation deadline: ${publicCancellationDeadline} (${new Date(Number(publicCancellationDeadline) * 1000).toISOString()})`);
    console.log('\nAdditional Info:');
    console.log(`  Network: ${provider.network()}`);
    console.log('------------------');
    
    // Build forward payload
    const forwardPayload = beginCell()
        .storeUint(Op.register_deposit, 32) // op::register_deposit
        .storeUint(swapId, 256)             // swap_id (256-bit)
        .storeBuffer(ethAddrBuffer)    // ethAddr (160 bits)
        .storeAddress(senderAddr)           // tonAddr (using sender address)
        .storeUint(withdrawalDeadline, 32)  // withdrawal deadline (32-bit)
        .storeUint(publicWithdrawalDeadline, 32)  // public withdrawal deadline (32-bit)
        .storeUint(cancellationDeadline, 32)  // cancellation deadline (32-bit)
        .storeUint(publicCancellationDeadline, 32)  // public cancellation deadline (32-bit)
        .endCell();
    
    // Build the transfer message
    const transferMessage = beginCell()
        .storeUint(Op.transfer, 32) // transfer opcode from Constants
        .storeUint(queryId, 64)    // query_id
        .storeCoins(amount)        // amount
        .storeAddress(destinationAddr) // destination
        .storeAddress(senderAddr)      // response_destination (sender)
        .storeBit(0)                // custom_payload: null
        .storeCoins(forwardTonAmount) // forward_ton_amount
        .storeBit(1)                // forward_payload exists
        .storeRef(forwardPayload)     // forward_payload with swap_id, ethereum_user, ton_user, deadline
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
        console.log(`1. Tonviewer: get_swaps_info_debug(${queryId})`);
        console.log('2. The result should be as follows:');
        console.log('   - The first value is -0x1 (found)');
        console.log(`   - The second value is 0x${hexString} (Swap ID, 256bit hex)`);
        console.log(`   - The third value is 0x${ethAddr.toString(16)} (Ethereum address)`);
        console.log(`   - The fourth value is ${senderAddr.toString()} (TON address)`);
        console.log(`   - The fifth value is ${amount} (amount in nanoTON)`);
        console.log('   - The sixth value is <creation_timestamp> (creation timestamp)');
        console.log(`   - The seventh value is ${withdrawalDeadline} (withdrawal deadline as UNIX timestamp)`);
        console.log(`   - The eighth value is ${publicWithdrawalDeadline} (public withdrawal deadline as UNIX timestamp)`);
        console.log(`   - The ninth value is ${cancellationDeadline} (cancellation deadline as UNIX timestamp)`);
        console.log(`   - The tenth value is ${publicCancellationDeadline} (public cancellation deadline as UNIX timestamp)`);
        console.log('   - The eleventh value is 0 (status: 0=init, 1=completed, 2=refunded)');

        // --- TonTxMonitor呼び出し ---
        try {
            const monitorOptions = {
                env: (provider.network() === 'custom' ? 'prod' : 'local') as 'prod' | 'local',
                address: senderAddr.toString(),
                queryId: queryId.toString(),
                amount: amount.toString(),
                sinceTimestamp: Math.floor(Date.now() / 1000).toString(),
                txHash: "txHashPlaceholder"
            };
            await monitorTransaction(monitorOptions);
        } catch (monitorError) {
            console.error('Error in monitorTransaction:', monitorError);
        }
        // --- TonTxMonitor呼び出しここまで ---

    } catch (error) {
        console.error('\nError sending Jetton transfer:');
        console.error(error instanceof Error ? error.message : String(error));
    }
}