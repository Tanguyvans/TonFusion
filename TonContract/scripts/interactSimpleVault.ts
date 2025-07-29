import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { SimpleVault } from '../wrappers/SimpleVault';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Your deployed contract address
    const contractAddress = Address.parse('EQBqjFXwHxWyhYZuNZSxSRPXvd8TQ8lAu_7B6GILhRsTIOkT');
    const simpleVault = provider.open(SimpleVault.createFromAddress(contractAddress));
    
    const action = await ui.choose('What do you want to do?', [
        'Check Balance',
        'Check Vault Data',
        'Deposit TON',
        'Withdraw TON'
    ], (v) => v);
    
    if (action === 'Check Balance') {
        console.log('Checking vault balance...');
        try {
            const balance = await simpleVault.getBalance();
            console.log(`Current vault balance: ${balance} nanoTON (${Number(balance) / 1e9} TON)`);
        } catch (error) {
            console.error('Error getting balance:', error);
        }
    }
    
    if (action === 'Check Vault Data') {
        console.log('Getting vault data...');
        try {
            const vaultData = await simpleVault.getVaultData();
            console.log(`Owner: ${vaultData.ownerAddress.toString()}`);
            console.log(`Total balance: ${vaultData.totalBalance} nanoTON (${Number(vaultData.totalBalance) / 1e9} TON)`);
        } catch (error) {
            console.error('Error getting vault data:', error);
        }
    }
    
    if (action === 'Deposit TON') {
        const amountStr = await ui.input('Enter amount to deposit (in TON): ');
        const amount = parseFloat(amountStr);
        
        if (isNaN(amount) || amount <= 0) {
            console.log('Invalid amount');
            return;
        }
        
        const depositAmount = toNano(amount.toString());
        const gasAmount = toNano('0.05'); // Gas for transaction
        const totalAmount = depositAmount + gasAmount;
        
        console.log(`Depositing ${amount} TON (${depositAmount} nanoTON)...`);
        console.log(`Total transaction amount: ${Number(totalAmount) / 1e9} TON (including gas)`);
        
        try {
            await simpleVault.sendDeposit(provider.sender(), {
                value: totalAmount,
                queryId: Date.now()
            });
            
            console.log('Deposit transaction sent! Check your wallet and wait for confirmation.');
            console.log('You can check the balance after the transaction is confirmed.');
        } catch (error) {
            console.error('Error sending deposit:', error);
        }
    }
    
    if (action === 'Withdraw TON') {
        // First check if user is the owner
        try {
            const vaultData = await simpleVault.getVaultData();
            const userAddress = provider.sender()?.address;
            
            if (!userAddress || !vaultData.ownerAddress.equals(userAddress)) {
                console.log('❌ You are not the owner of this vault. Only the owner can withdraw.');
                console.log(`Vault owner: ${vaultData.ownerAddress.toString()}`);
                console.log(`Your address: ${userAddress?.toString() || 'Unknown'}`);
                return;
            }
            
            const currentBalance = Number(vaultData.totalBalance) / 1e9;
            console.log(`Current vault balance: ${currentBalance} TON`);
            
            if (currentBalance === 0) {
                console.log('❌ Vault balance is 0. Nothing to withdraw.');
                return;
            }
            
            const amountStr = await ui.input(`Enter amount to withdraw (max ${currentBalance} TON): `);
            const amount = parseFloat(amountStr);
            
            if (isNaN(amount) || amount <= 0) {
                console.log('Invalid amount');
                return;
            }
            
            if (amount > currentBalance) {
                console.log(`❌ Cannot withdraw ${amount} TON. Vault only has ${currentBalance} TON.`);
                return;
            }
            
            const withdrawAmount = toNano(amount.toString());
            const gasAmount = toNano('0.1'); // Gas for withdrawal transaction
            
            console.log(`Withdrawing ${amount} TON (${withdrawAmount} nanoTON)...`);
            
            await simpleVault.sendWithdraw(provider.sender(), {
                value: gasAmount,
                withdrawAmount: withdrawAmount,
                queryId: Date.now()
            });
            
            console.log('Withdrawal transaction sent! Check your wallet and wait for confirmation.');
        } catch (error) {
            console.error('Error processing withdrawal:', error);
        }
    }
}