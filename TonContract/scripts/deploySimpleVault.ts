import { toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { SimpleVault } from '../wrappers/SimpleVault';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();
    
    // Get owner address (use connected wallet as owner)
    const ownerAddress = provider.sender()?.address!;
    
    console.log(`Deploying SimpleVault with owner: ${ownerAddress.toString()}`);
    
    // Create SimpleVault configuration
    const simpleVaultConfig = {
        ownerAddress,
        totalBalance: 0n, // Start with 0 balance
    };
    
    // Compile and deploy the contract
    const simpleVault = provider.open(
        SimpleVault.createFromConfig(
            simpleVaultConfig,
            await compile('SimpleVault')
        )
    );
    
    console.log(`SimpleVault will be deployed at: ${simpleVault.address.toString()}`);
    
    // Deploy with 0.05 TON for deployment
    await simpleVault.sendDeploy(provider.sender(), toNano('0.05'));
    
    await provider.waitForDeploy(simpleVault.address);
    
    console.log('SimpleVault deployed successfully!');
    console.log(`Contract address: ${simpleVault.address.toString()}`);
    
    // Get initial state
    const vaultData = await simpleVault.getVaultData();
    console.log(`Owner: ${vaultData.ownerAddress.toString()}`);
    console.log(`Initial balance: ${vaultData.totalBalance} nanoTON`);
}