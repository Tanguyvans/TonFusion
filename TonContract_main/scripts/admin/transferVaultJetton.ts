import { Address, beginCell } from '@ton/core';
import { Vault } from '../../wrappers/Vault';
import { NetworkProvider } from '@ton/blueprint';
import { Op } from '../../utils/Constants';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    console.log('\nTransfer Jettons from Vault');
    console.log('----------------------------');

    // Source Vault Address
    // The contract address that currently holds the tokens
    const vaultAddr = Address.parse(
        await ui.input('Enter source Vault address: ')
    );

    // Jetton Wallet Address
    // The address of the specific Jetton type to transfer
    const jettonWalletAddr = Address.parse(
        await ui.input('Enter Jetton wallet address: ')
    );

    // Get sender address (same as recipient)
    const senderAddr = provider.sender().address;
    if (!senderAddr) {
        throw new Error('Failed to get sender address');
    }
    const toAddr = senderAddr;

    // Response Address (same as sender address)
    const responseAddr = senderAddr;

    // Transfer Amount
    console.log('Amount of Jettons to transfer in nano (1USDT = 1000000): ');
    const amount = BigInt(
        await ui.input('Enter amount in nano: ')
    );
    if (amount <= 0) {
        throw new Error('Invalid transfer amount');
    }

    // Transfer gas amount (default: 0.05 TON)
    const transferGas = 50000000;

    // Initialize Vault contract
    const vault = provider.open(Vault.createFromAddress(vaultAddr));

    // Create transfer message
    const body = beginCell()
        .storeUint(Op.transfer, 32)
        .storeUint(0, 64)
        .storeCoins(amount)
        .storeAddress(toAddr)
        .storeAddress(responseAddr)
        .storeUint(0, 1)
        .storeCoins(0)
        .storeUint(0, 1)
        .endCell();
    
    try {
        await vault.sendAdminMessage(
            provider.sender(),
            beginCell()
                .storeUint(0x18, 6)
                .storeAddress(jettonWalletAddr)
                .storeCoins(transferGas)
                .storeUint(1, 107)
                .storeRef(body)
                .endCell(),
            1,
        );
        console.log('\nTransfer message sent successfully!');
        console.log('Note: Excess gas will be accumulated in the contract and can be returned later.');
    } catch (error) {
        console.error('\nError during transfer:', error instanceof Error ? error.message : String(error));
        console.log('Please check the transaction in a TON explorer for more details.');
    }
}
