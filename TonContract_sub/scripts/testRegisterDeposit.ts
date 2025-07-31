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
    const input = await ui.input('Query ID to input (decimal): ');
    const queryId = BigInt(input);
    console.log(`Query ID: ${queryId}`);
    console.log(`Query ID (hex): 0x${queryId.toString(16)}`);
    
    // User address input
    let userAddr: Address;
    const senderAddr = provider.sender().address;
    if (senderAddr) {
        userAddr = senderAddr;
        console.log(`TON user address: ${userAddr.toString()}`);
    } else {
        throw new Error('Failed to get sender address');
    }

    // Ethereum address input (160-bit)
    const ethAddrInput = await ui.input('Ethereum address (with 0x): ');
    // Remove '0x' prefix if present and convert to BigInt
    const cleanEthAddr = ethAddrInput.startsWith('0x') ? ethAddrInput.slice(2) : ethAddrInput;
    const ethereumUser = BigInt('0x' + cleanEthAddr);
    console.log(`Ethereum user: 0x${ethereumUser.toString(16)}`);

    // Amount input
    const amountInput = await ui.input('Amount to deposit (in TON): ');
    const amount = toNano(amountInput);
    console.log(`Amount: ${amount} nanoTON (${Number(amount) / 1e9} TON)`);

    // Deadline input (default: 24 hours from now)
    const defaultDeadline = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now
    const deadlineInput = await ui.input(`Deadline (UNIX timestamp, default: ${defaultDeadline}): `);
    const deadline = deadlineInput ? BigInt(deadlineInput) : BigInt(defaultDeadline);
    console.log(`Deadline: ${deadline} (${new Date(Number(deadline) * 1000).toISOString()})`);

    // Gas amount
    const gasAmount = toNano('0.05'); // 0.05 TON = 50,000,000 nanoTON
    console.log(`Gas amount: ${gasAmount} nanoTON (${Number(gasAmount) / 1e9} TON)`);
    
    // Message construction
    const message = beginCell()
        .storeUint(Op.register_deposit, 32) // op::register_deposit()
        .storeUint(queryId, 64)             // query_id (64-bit)
        .storeUint(ethereumUser, 160)       // ethereum_user (160-bit)
        .storeAddress(userAddr)             // ton_user (MsgAddress)
        .storeCoins(amount)                 // amount (coins)
        .storeUint(deadline, 64)            // deadline (UNIX timestamp, 64-bit)
        .endCell();
    
    console.log('\nMessage details to send:');
    console.log(`Op code: 0x${Op.register_deposit.toString(16)} (register_deposit)`);
    console.log(`Query ID: ${queryId}`);
    console.log(`Ethereum user: 0x${ethereumUser.toString(16)}`);
    console.log(`TON user address: ${userAddr.toString()}`);
    console.log(`Amount: ${amount} nanoTON (${Number(amount) / 1e9} TON)`);
    console.log(`Deadline: ${deadline} (${new Date(Number(deadline) * 1000).toISOString()})`);
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
        console.log(`1. Tonviewer: get_swaps_info_debug(${queryId})`);
        console.log('2. The result should be as follows:');
        console.log('   - The first value is -0x1 (found)');
        console.log(`   - The second value is 0x${ethereumUser.toString(16)} (Ethereum address)`);
        console.log(`   - The third value is ${userAddr.toString()} (TON address)`);
        console.log(`   - The fourth value is ${amount} (amount in nanoTON)`);
        console.log(`   - The fifth value is ${deadline} (deadline as UNIX timestamp)`);
        console.log('   - The sixth value is 0 (status: 0=init, 1=completed, 2=refunded)');
    } catch (error) {
        console.error('Error sending message:', error instanceof Error ? error.message : String(error));
    }
}
