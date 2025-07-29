import { Cell, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Vault } from '../wrappers/Vault';
import { onchainContentToCell } from '../utils/JettonHelpers';

// Jetton content related function
async function getJettonContent(ui: any): Promise<Cell> {
    // Select setup type
    const setupType = await ui.choose('Select setup type.', ['Detailed', 'Simple'], (v: string) => v);
    
    let name: string, symbol: string, description: string, image: string, decimals: string;
    
    if (setupType === 'Detailed') {
        // Detailed setup
        name = await ui.input('Input Jetton name: ');
        symbol = await ui.input('Input Jetton symbol: ');
        description = await ui.input('Input Jetton description: ');
        image = await ui.input('Input Jetton image URL: ');
        decimals = await ui.input('Input Jetton decimals (default: 9): ');
        if (decimals === '') {
            decimals = '9';
        }
    } else {
        // Simple setup
        name = await ui.input('Input Jetton name: ');
        symbol = name;
        description = name;
        image = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrViWg0D72Yqmv2P4r2vO7arNp_IoIofGKyw&s';
        decimals = '9';
    }
    
    return onchainContentToCell({
        name,
        symbol,
        description,
        image,
        decimals,
    });
}

// Main process
export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    // Jetton content setup
    const content = await getJettonContent(ui);

    // Get network information
    const network = provider.network();
    const isMainnet = network !== 'testnet';
    
    // Display complete Vault configuration
    const vaultConfig = {
        adminAddress: provider.sender()?.address!,
        content,
        walletCode: await compile('JettonWallet'),
        dictSwapsInfo: undefined,
    };
    
    console.log('\nComplete Vault configuration:');
    console.log('--------------------');
    console.log(`Admin address: ${vaultConfig.adminAddress.toString()}`);
    
    // Deploy Vault
    const vault = provider.open(
        Vault.createFromConfig(
            vaultConfig,
            await compile('Vault'),
        ),
    );

    await vault.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(vault.address);
}


