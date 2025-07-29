import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano, Address } from '@ton/core';
import { SimpleVault } from '../wrappers/SimpleVault';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('SimpleVault', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('SimpleVault');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let simpleVault: SandboxContract<SimpleVault>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        simpleVault = blockchain.openContract(
            SimpleVault.createFromConfig(
                {
                    ownerAddress: Address.parse('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c'),
                    totalBalance: 0n,
                },
                code
            )
        );

        deployer = await blockchain.treasury('deployer');
        user = await blockchain.treasury('user');

        const deployResult = await simpleVault.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: simpleVault.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done in beforeEach
        // blockchain and simpleVault are ready to use
    });

    it('should accept deposits', async () => {
        const depositAmount = toNano('1.0');
        
        const depositResult = await simpleVault.sendDeposit(user.getSender(), {
            value: depositAmount + toNano('0.05'), // deposit amount + gas
        });

        expect(depositResult.transactions).toHaveTransaction({
            from: user.address,
            to: simpleVault.address,
            success: true,
        });

        // Check balance increased
        const balance = await simpleVault.getBalance();
        expect(balance).toBeGreaterThan(0n);
    });

    it('should get vault data', async () => {
        const vaultData = await simpleVault.getVaultData();
        
        expect(vaultData.ownerAddress.toString()).toBe('EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c');
        expect(vaultData.totalBalance).toBe(0n);
    });

    it('should allow owner to withdraw', async () => {
        // First, set deployer as owner for withdrawal test
        const ownerVault = blockchain.openContract(
            SimpleVault.createFromConfig(
                {
                    ownerAddress: deployer.address,
                    totalBalance: 0n,
                },
                code
            )
        );

        await ownerVault.sendDeploy(deployer.getSender(), toNano('0.05'));

        // Deposit some TON
        const depositAmount = toNano('2.0');
        await ownerVault.sendDeposit(user.getSender(), {
            value: depositAmount + toNano('0.05'),
        });

        // Check balance before withdrawal
        const balanceBefore = await ownerVault.getBalance();
        expect(balanceBefore).toBeGreaterThan(0n);

        // Withdraw as owner
        const withdrawAmount = toNano('1.0');
        const withdrawResult = await ownerVault.sendWithdraw(deployer.getSender(), {
            value: toNano('0.1'), // gas for withdrawal
            withdrawAmount,
        });

        expect(withdrawResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: ownerVault.address,
            success: true,
        });

        // Check balance decreased
        const balanceAfter = await ownerVault.getBalance();
        expect(balanceAfter).toBeLessThan(balanceBefore);
    });

    it('should reject withdrawal from non-owner', async () => {
        // Deposit some TON first
        const depositAmount = toNano('1.0');
        await simpleVault.sendDeposit(user.getSender(), {
            value: depositAmount + toNano('0.05'),
        });

        // Try to withdraw as non-owner (user is not the owner)
        const withdrawResult = await simpleVault.sendWithdraw(user.getSender(), {
            value: toNano('0.1'),
            withdrawAmount: toNano('0.5'),
        });

        expect(withdrawResult.transactions).toHaveTransaction({
            from: user.address,
            to: simpleVault.address,
            success: false,
        });
    });

    it('should reject withdrawal of more than balance', async () => {
        // Set deployer as owner
        const ownerVault = blockchain.openContract(
            SimpleVault.createFromConfig(
                {
                    ownerAddress: deployer.address,
                    totalBalance: 0n,
                },
                code
            )
        );

        await ownerVault.sendDeploy(deployer.getSender(), toNano('0.05'));

        // Deposit small amount
        const depositAmount = toNano('0.5');
        await ownerVault.sendDeposit(user.getSender(), {
            value: depositAmount + toNano('0.05'),
        });

        // Try to withdraw more than deposited
        const withdrawResult = await ownerVault.sendWithdraw(deployer.getSender(), {
            value: toNano('0.1'),
            withdrawAmount: toNano('1.0'), // More than deposited
        });

        expect(withdrawResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: ownerVault.address,
            success: false,
        });
    });
});