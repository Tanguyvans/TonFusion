import chalk from 'chalk';
import { execSync } from 'child_process';

interface DeployOptions {
  testnet?: boolean;
  contract?: string;
}

export async function deployTonContracts(options: DeployOptions) {
    try {
        console.log(chalk.blue('🚀 Starting TON Vault deployment with Blueprint...'));
        
        const network = options.testnet ? 'testnet' : 'mainnet';
        
        console.log(chalk.cyan(`📋 Network: ${network}`));
        console.log(chalk.yellow('🔗 This will open TonKeeper for wallet connection...'));
        
        // Use Blueprint's deployment system
        const command = `npx blueprint run deployVault --${network}`;
        
        console.log(chalk.gray(`Running: ${command}`));
        
        // Execute Blueprint deployment
        execSync(command, { 
            stdio: 'inherit',
            cwd: process.cwd()
        });
        
        console.log(chalk.green('\n✅ Deployment completed!'));
        
    } catch (error) {
        console.error(chalk.red('❌ Deployment failed:'), error);
        throw error;
    }
}